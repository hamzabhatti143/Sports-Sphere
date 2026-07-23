// Orchestrator — the entry point for every WhatsApp message/image.
// Loads conversation history (Redis hot cache + Postgres durable copy),
// classifies intent with GPT-4o, routes to the right agent, and persists state.
require('dotenv').config();
const OpenAI = require('openai');
const Redis = require('ioredis');
const db = require('../tools/database');
const { sendMessage } = require('../tools/whatsapp');
const bookingAgent = require('./bookingAgent');
const venueAgent = require('./venueAgent');
const matchmaker = require('./matchmakerAgent');
const paymentAgent = require('./paymentAgent');
const { toLocal } = require('../utils/phone');
const log = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let redis = null;
if (process.env.DISABLE_REDIS === 'true') {
  log.info('DISABLE_REDIS=true — using DB-only conversation state (no Redis)');
} else {
  try {
    redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      // Give up reconnecting after a few tries instead of spamming forever.
      retryStrategy: (times) => (times > 5 ? null : Math.min(times * 200, 2000)),
      reconnectOnError: () => false,
    });
    let warned = false;
    redis.on('error', (e) => { if (!warned) { warned = true; log.warn('redis unavailable — falling back to DB:', e.message); } });
    redis.connect().catch(() => log.warn('redis connect failed — using DB-only conversation state'));
  } catch (e) {
    log.warn('redis unavailable', e.message);
  }
}

const MENU = `Assalam o Alaikum! 👋 PlayZone mein khush aamdeed!

Mein aapki help kar sakta hoon:
1️⃣ *Slot Booking* — court book karna ho
2️⃣ *Meri Bookings* — apni bookings dekhni hon
3️⃣ *Players Dhundna* — team ke liye players chahiye hon
4️⃣ *Help* — koi masla ho

Kya chahiye? Number likho ya seedha poochho! 😊`;

const HELP_TEXT = `🆘 *PlayZone Help*
• Slot book karna: *book* likhein (ya *1*)
• Apni bookings dekhna: *meri bookings* (ya *2*)
• Players/opponents dhundna: *players* (ya *3*)
• Payment: booking ke baad screenshot *image* bhejein

Kabhi bhi *menu* likh kar options dubara dekh sakte hain. 😊`;

// The menu asks users to reply with a number, so map bare numbers to intents.
const MENU_NUMBERS = { '1': 'BOOKING_START', '2': 'BOOKING_QUERY', '3': 'PLAYER_START', '4': 'HELP' };

async function getHistory(from) {
  const key = `conv:${toLocal(from)}`;
  if (redis && redis.status === 'ready') {
    try {
      const raw = await redis.get(key);
      if (raw) return JSON.parse(raw);
    } catch (e) { log.warn('redis get failed', e.message); }
  }
  const conv = await db.getConversation(from);
  return conv && conv.messages ? conv.messages : [];
}

async function saveHistory(from, history, bookingId = null) {
  const trimmed = history.slice(-10);
  const key = `conv:${toLocal(from)}`;
  if (redis && redis.status === 'ready') {
    try { await redis.set(key, JSON.stringify(trimmed), 'EX', 60 * 60 * 6); } catch (e) { log.warn('redis set failed', e.message); }
  }
  await db.saveConversation(from, trimmed, bookingId).catch((e) => log.warn('db saveConversation failed', e.message));
}

async function classifyIntent(message, userType) {
  const prompt = `Classify this WhatsApp message intent for a sports booking platform:
- BOOKING: user wants to find or book a slot
- PAYMENT: user sent payment screenshot (image)
- BOOKING_QUERY: user asking about their existing booking
- VENUE_QUERY: venue owner asking about their bookings/stats
- PLAYER_SEARCH: looking for players or opponents
- GREETING: hello/hi/salam type messages
- HELP: user needs help or is confused
- OTHER: anything else

Message: ${message}
User type from DB: ${userType}
Reply with only the intent word.`;
  try {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0,
      max_tokens: 5,
      messages: [{ role: 'user', content: prompt }],
    });
    return (resp.choices[0].message.content || 'OTHER').trim().toUpperCase().replace(/[^A-Z_]/g, '');
  } catch (e) {
    log.error('intent classify failed', e.message);
    return 'OTHER';
  }
}

// `lookupId` is the customer's real identity for DB lookups (resolved from an
// @lid to the real phone upstream); `from` is only used to reply to the chat.
async function handleMessage(from, text, lookupId = from) {
  try {
    const user = await db.getUserByWhatsapp(lookupId);
    const userType = user ? user.role : 'guest';
    const trimmed = (text || '').trim();
    // Honor menu-number replies directly; otherwise ask GPT to classify.
    const intent = MENU_NUMBERS[trimmed] || await classifyIntent(text, userType);
    log.step('intent', intent, 'user', userType);

    switch (intent) {
      case 'BOOKING_START':
        await sendMessage(from, 'Zabardast! 🏟️ Kis *city*, *sport* aur *time* ke liye slot chahiye?\nMisaal: "Karachi futsal aaj 7pm 1 ghanta"');
        break;
      case 'PLAYER_START':
        await sendMessage(from, '👥 Kis city/sport ke liye players ya opponent chahiye?\nMisaal: "Lahore cricket team chahiye"');
        break;
      case 'HELP':
        await sendMessage(from, HELP_TEXT);
        break;
      case 'BOOKING': {
        const history = await getHistory(lookupId);
        const { reply, history: updated } = await bookingAgent.handle(lookupId, text, history, user && user.full_name, from);
        await sendMessage(from, reply);
        await saveHistory(lookupId, updated);
        break;
      }
      case 'BOOKING_QUERY': {
        const rows = await db.userBookings(lookupId);
        if (!rows.length) { await sendMessage(from, 'Aapki koi booking nahi mili. "book" likh kar nayi booking karein.'); break; }
        const lines = rows.map((b) => `• ${b.venue_name} | ${b.booking_date} ${String(b.start_time).slice(0, 5)}-${String(b.end_time).slice(0, 5)} | ${b.status} | Ref #${b.reference}`);
        await sendMessage(from, `📋 *Aapki Bookings:*\n${lines.join('\n')}`);
        break;
      }
      case 'VENUE_QUERY':
        await venueAgent.handle(from, text);
        break;
      case 'PLAYER_SEARCH':
        await matchmaker.handle(from, text, user);
        break;
      case 'GREETING':
        await sendMessage(from, MENU);
        break;
      case 'PAYMENT':
        await sendMessage(from, '📸 Payment screenshot *image* ke tor par bhejein (text nahi).');
        break;
      default:
        await sendMessage(from, MENU);
    }
  } catch (e) {
    log.error('handleMessage error', e.message);
    await sendMessage(from, '⚠️ Kuch masla ho gaya. Dobara try karein ya "help" likhein.');
  }
}

async function handleImage(from, base64Image, _caption, lookupId = from) {
  try {
    const conv = await db.getConversation(lookupId);
    let bookingId = conv && conv.current_booking_id;

    // Guard against a stale pointer: only verify against a booking that's still
    // awaiting payment ('pending' or a previously 'payment_failed' one the
    // customer is retrying). If the pointer is confirmed/cancelled/missing, fall
    // back to the customer's most recent awaiting-payment booking.
    if (bookingId) {
      const b = await db.getBookingForVerification(bookingId);
      const st = b && String(b.status);
      if (!b || (st !== 'pending' && st !== 'payment_failed')) bookingId = null;
    }
    if (!bookingId) bookingId = await db.latestPendingBooking(lookupId);
    // Last resort (e.g. WhatsApp @lid hides the real number): match the most
    // recent unpaid booking so the payment can still be verified by amount.
    if (!bookingId) {
      bookingId = await db.latestUnpaidBookingAny();
      if (bookingId) log.warn('no booking tied to this chat — falling back to most recent unpaid booking', bookingId);
    }

    if (!bookingId) {
      await sendMessage(from, '🤔 Aapki koi pending booking nahi mili. Pehle slot book karein, phir payment proof bhejein. "book" likhein.');
      return;
    }

    // Keep the pointer fresh so follow-ups map correctly.
    await db.saveConversation(lookupId, (conv && conv.messages) || [], bookingId);
    log.step('routing payment proof to paymentAgent', 'booking', bookingId);
    await paymentAgent.verifyPayment(from, base64Image, bookingId);
  } catch (e) {
    log.error('handleImage error', e.message);
    await sendMessage(from, '⚠️ Payment proof process nahi ho saka. Dobara bhejein.');
  }
}

module.exports = { handleMessage, handleImage, classifyIntent };
