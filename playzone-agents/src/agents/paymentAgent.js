// Payment Verifier Agent — verifies a payment screenshot against booking +
// venue payment config using GPT-4o Vision, then confirms or rejects the booking.
// Adapted from the spec: Supabase reads → database.js (Neon), and the reject
// template now receives the booking so amounts render correctly.
require('dotenv').config();
const OpenAI = require('openai');
const db = require('../tools/database');
const { sendMessage } = require('../tools/whatsapp');
const cfgTools = require('../config/paymentConfig');
const log = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Build a Date from a booking's 'YYYY-MM-DD' date + 'HH:MM[:SS]' time. When used
// for an end time, a value of 00:00 means midnight/end-of-day (next day).
function slotDateTime(dateStr, timeStr, isEnd = false) {
  if (!dateStr || !timeStr) return null;
  const [y, m, d] = String(dateStr).split('-').map(Number);
  const [hh, mm] = String(timeStr).split(':').map(Number);
  const dt = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  if (isEnd && (hh || 0) === 0 && (mm || 0) === 0) dt.setDate(dt.getDate() + 1);
  return dt;
}

async function verifyPayment(whatsappNumber, base64Image, bookingId) {
  log.step('verifyPayment start', { whatsappNumber, bookingId });

  // 1. Booking (+ venue) details.
  const booking = await db.getBookingForVerification(bookingId);
  if (!booking) {
    log.error('booking not found', bookingId);
    await sendMessage(whatsappNumber, '❌ Booking nahi mili. Please dobara book karein.');
    return { verified: false, error: 'booking_not_found' };
  }
  log.step('loaded booking', booking.booking_ref, 'advance', booking.advance_amount);

  // 1b. Verify the booking's DATE & TIME from the database. Never confirm a
  // payment for a slot whose time has already passed.
  const startTxt = String(booking.start_time || '').slice(0, 5);
  const endTxt = String(booking.end_time || '').slice(0, 5);
  log.step('booking date/time', booking.booking_date, `${startTxt}-${endTxt}`);
  const slotEnd = slotDateTime(booking.booking_date, booking.end_time, true);
  if (slotEnd && slotEnd.getTime() < Date.now()) {
    log.warn('slot already passed — not confirming', booking.booking_ref, booking.booking_date, endTxt);
    await sendMessage(
      whatsappNumber,
      `⏰ Maaf kijiye, is booking ka waqt (${booking.booking_date} ${startTxt}-${endTxt}) guzar chuka hai, is liye payment confirm nahi ki ja sakti.\nNayi booking ke liye "book" likhein.`
    );
    return { verified: false, error: 'slot_passed' };
  }

  // 2. Payment config for this venue.
  const paymentConfig = await cfgTools.getForVenue(booking.venue_id);
  if (!paymentConfig) {
    log.error('no payment config for venue', booking.venue_id);
    await sendMessage(whatsappNumber, '⚠️ Is venue ke liye payment details set nahi hain. Venue owner se rabta karein.');
    return { verified: false, error: 'no_payment_config' };
  }
  log.step('loaded payment config', paymentConfig.method, paymentConfig.account_number);

  // 3. Verification prompt (all correct values injected).
  // The required advance is ALWAYS this booking's own quoted amount (what the bot
  // told the customer) — never a hardcoded constant. Prefer the stored
  // advance_amount; if it's missing, derive it from THIS booking's total × the
  // venue's advance percent (still booking-specific, never static).
  const now = new Date();
  let advanceAmt = Number(booking.advance_amount);
  if (!Number.isFinite(advanceAmt) || advanceAmt <= 0) {
    const pct = Number(paymentConfig.advance_percent) || 50;
    advanceAmt = Math.round((Number(booking.amount) || 0) * pct / 100);
    log.warn('advance_amount missing on booking; derived', advanceAmt, 'from total', booking.amount, `(${pct}%)`);
  }
  // Normalise the booking so every downstream message (confirm / reject / owner
  // alert) shows this booking's own resolved amounts.
  booking.advance_amount = advanceAmt;
  if (!Number.isFinite(Number(booking.remaining_amount))) {
    booking.remaining_amount = Math.max(0, (Number(booking.amount) || 0) - advanceAmt);
  }
  const verificationPrompt = `
You verify a customer's PAYMENT PROOF for a PlayZone sports booking.

The proof can be ANY of these — all are equally acceptable:
- a JazzCash / Easypaisa / mobile-wallet screenshot,
- a bank app transfer screenshot, OR
- a PHOTO of a printed bank transfer slip / deposit receipt.
Do NOT reject a payment just because it is a photograph of a paper slip instead of
a screenshot — photos of genuine receipts are valid.

BOOKING (from our database):
- Date: ${booking.booking_date}
- Time: ${startTxt} - ${endTxt}
- Ref: #${booking.booking_ref}

OUR (correct) RECEIVING DETAILS:
- Receiver account/number: ${paymentConfig.account_number}
- Receiver name: ${paymentConfig.account_name}
- Minimum amount required (advance): PKR ${advanceAmt}
- Today: ${now.toDateString()}

Extract the transferred amount, then judge:
1. AMOUNT [CRITICAL]: The amount the customer transferred must be AT LEAST PKR ${advanceAmt}.
   Paying MORE than that is completely fine — NEVER reject for paying extra/overpayment.
   Only fail AMOUNT if the amount is clearly LESS than PKR ${advanceAmt}.
2. RECEIVER [CRITICAL]: The money went to us — pass if EITHER the receiver account/number
   ${paymentConfig.account_number} OR the receiver name '${paymentConfig.account_name}' is visible/matches
   (bank transfers may show a linked account instead of the wallet number; a name match is enough).
3. AUTHENTICITY: The proof looks like a real payment, not obviously edited/faked. A normal photo
   of a real slip is authentic.
Date/time are NOT required — ignore them unless the proof is obviously very old.

Set verified=true when AMOUNT and RECEIVER pass and it is authentic.

RESPOND ONLY IN THIS EXACT JSON (no markdown):
{
  "verified": true or false,
  "paid_amount": number (PKR the customer actually transferred, digits only) or null,
  "receiver_ok": true or false,
  "authentic": true or false,
  "transaction_id": "extracted transaction/reference ID or null",
  "confidence": "HIGH or MEDIUM or LOW",
  "failed_checks": ["names of failed checks"],
  "reject_reason": "short reason in Urdu/English if rejected, null if verified"
}`;

  // 4. GPT-4o Vision call.
  let result;
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64Image}`, detail: 'high' } },
            { type: 'text', text: verificationPrompt },
          ],
        },
      ],
    });
    result = parseJson(response.choices[0].message.content);
    log.step('vision result', { verified: result.verified, confidence: result.confidence, failed: result.failed_checks });
  } catch (e) {
    log.error('vision call failed', e.message);
    await sendMessage(whatsappNumber, '⚠️ Screenshot verify karte waqt masla hua. Thodi der baad dobara bhejein.');
    return { verified: false, error: 'vision_error', detail: e.message };
  }

  // 5. Decide from the structured fields (more reliable than the model's boolean).
  //    KEY RULE: paying at least the advance passes — overpayment is always OK.
  try {
    const paid = Number(result.paid_amount);
    const tol = cfgTools.AMOUNT_TOLERANCE_PKR;
    const amountOk = Number.isFinite(paid) ? (paid + tol) >= advanceAmt : false;
    const receiverOk = result.receiver_ok !== false;
    const authentic = result.authentic !== false;
    const passed = amountOk && receiverOk && authentic && result.confidence !== 'LOW';

    // Fraud guard: the same transaction id must not confirm two bookings.
    const duplicate = passed && result.transaction_id
      ? await db.isTransactionUsed(result.transaction_id, bookingId)
      : false;

    log.step('verify decision', { bookingDate: booking.booking_date, slotTime: `${startTxt}-${endTxt}`, paid, advanceAmt, amountOk, receiverOk, authentic, passed, duplicate });

    if (passed && !duplicate) {
      await confirmBooking(bookingId, result.transaction_id, whatsappNumber, booking);
    } else if (duplicate) {
      log.warn('duplicate transaction id rejected', result.transaction_id, booking.booking_ref);
      await sendMessage(whatsappNumber, '❌ Yeh transaction pehle se use ho chuki hai. Nayi/valid payment ka proof bhejein.');
      await rejectBooking(bookingId, 'Yeh transaction ID pehle se use ho chuki hai (duplicate).', whatsappNumber, ['duplicate_transaction'], booking);
    } else {
      // Build a precise reason so the customer isn't told a confusing amount.
      let reason = result.reject_reason;
      if (!amountOk && Number.isFinite(paid)) reason = `Amount kam hai — kam se kam PKR ${advanceAmt} bhejein (aap ne PKR ${paid} bheja).`;
      else if (!amountOk) reason = `Amount clear nahi — kam se kam PKR ${advanceAmt} ki payment ka proof bhejein.`;
      else if (!receiverOk) reason = `Payment sahi account (${paymentConfig.account_number} / ${paymentConfig.account_name}) par nahi mili.`;
      else if (!authentic) reason = 'Payment proof genuine nahi lag raha.';
      await rejectBooking(bookingId, reason || 'Payment verify nahi ho saki.', whatsappNumber, result.failed_checks || [], booking);
    }
  } catch (e) {
    log.error('post-verify action failed', e.message);
  }

  return result;
}

function parseJson(text) {
  const cleaned = String(text || '').replace(/```json/gi, '').replace(/```/g, '').trim();
  return JSON.parse(cleaned);
}

async function confirmBooking(bookingId, transactionId, whatsappNumber, booking) {
  await db.confirmBookingPaid(bookingId, transactionId);
  log.ok('booking confirmed', booking.booking_ref);

  const userMessage = `✅ *Payment Verified!*

🎉 Aapki booking confirm ho gayi!

📋 *Booking Details:*
🏟️ Venue: ${booking.venues.name}
📍 Address: ${booking.venues.address}
📅 Date: ${booking.booking_date}
⏰ Time: ${booking.start_time} - ${booking.end_time}
💰 Advance Paid: PKR ${booking.advance_amount}
💵 Remaining: PKR ${booking.remaining_amount} _(venue par dein)_
🔖 Booking Ref: #${booking.booking_ref}

Mazay karo! 🏆⚽🏸`;
  await sendMessage(whatsappNumber, userMessage);

  if (booking.venues.whatsapp) {
    const ownerMessage = `🔔 *Nayi Booking Confirmed!*

👤 Player: ${booking.user_name || 'Player'}
📱 WhatsApp: ${whatsappNumber}
📅 Date: ${booking.booking_date}
⏰ Time: ${booking.start_time} - ${booking.end_time}
💰 Advance Received: PKR ${booking.advance_amount} ✅
💵 Remaining to collect: PKR ${booking.remaining_amount}
🔖 Ref: #${booking.booking_ref}`;
    await sendMessage(booking.venues.whatsapp, ownerMessage);
  }
}

async function rejectBooking(bookingId, reason, whatsappNumber, failedChecks, booking) {
  await db.rejectBookingPayment(bookingId);
  log.warn('booking payment rejected', booking.booking_ref, reason);

  const rejectMessage = `❌ *Payment Verify Nahi Ho Saki*

*Wajah:* ${reason}

*Jo cheezein match nahi hui:*
${(failedChecks || []).map((c) => `• ${c}`).join('\n') || '• —'}

*Kya karein:*
1. Payment ka screenshot YA bank slip/receipt ka photo bhejein
2. Amount kam se kam PKR ${booking.advance_amount} honi chahiye (ziyada bhejna bhi theek hai)
3. Payment JazzCash 03243373891 (Muhammad Hamza Bhatti) par honi chahiye

Dobara try karein ya help ke liye 'HELP' likhein. 🙏`;
  await sendMessage(whatsappNumber, rejectMessage);

  // Manual-review fallback: alert the venue owner so a genuine payment that the
  // AI couldn't auto-verify can still be confirmed by a human.
  if (booking.venues && booking.venues.whatsapp) {
    const ownerAlert = `⚠️ *Payment auto-verify nahi hui* (manual check chahiye)
👤 Player: ${booking.user_name || 'Player'}  📱 ${whatsappNumber}
📅 ${booking.booking_date}  ⏰ ${booking.start_time} - ${booking.end_time}
💰 Advance: PKR ${booking.advance_amount}  🔖 Ref: #${booking.booking_ref}
Wajah: ${reason}`;
    await sendMessage(booking.venues.whatsapp, ownerAlert);
  }
}

module.exports = { verifyPayment };
