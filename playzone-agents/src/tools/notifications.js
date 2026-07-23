// Reusable WhatsApp message templates (Hinglish, matching the spec's tone).
const { sendMessage } = require('./whatsapp');

const HOLD_MINUTES = Number(process.env.HOLD_MINUTES || 90);

function paymentInstructions(cfg, booking) {
  return `💳 *Payment Details:*
Method: ${cfg.method}
Account: ${cfg.account_number}
Name: ${cfg.account_name}
Amount (Advance): PKR ${booking.advance_amount}

Screenshot bhejein aur slot confirm ho jaye gi! ⏱️ ${HOLD_MINUTES} min mein bhejein.
Booking Ref: #${booking.booking_ref || booking.reference}`;
}

function holdExpired() {
  return `⌛ Aapka slot hold expire ho gaya. Dobara book karne ke liye "book" likhein.`;
}

function bookingSummary(booking, venueName) {
  return `📋 *Booking Summary*
🏟️ ${venueName}
📅 ${booking.booking_date}
⏰ ${booking.start_time} - ${booking.end_time} (${booking.hours} hr)
💰 Total: PKR ${booking.amount}
💵 Advance: PKR ${booking.advance_amount} | Remaining: PKR ${booking.remaining_amount}
🔖 Ref: #${booking.booking_ref || booking.reference}`;
}

module.exports = { sendMessage, paymentInstructions, holdExpired, bookingSummary };
