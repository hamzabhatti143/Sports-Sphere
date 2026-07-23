// Venue Agent — answers a venue owner's questions about their bookings & stats.
const db = require('../tools/database');
const { sendMessage } = require('../tools/whatsapp');
const log = require('../utils/logger');

async function handle(from /* whatsapp id */, _text) {
  log.step('venueAgent for', from);
  const bookings = await db.ownerBookings(from);
  if (!bookings.length) {
    await sendMessage(from, '📊 Abhi tak koi booking nahi. Jab bookings aayengi, yahan dikhengi.');
    return;
  }
  const today = new Date().toISOString().slice(0, 10);
  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const pending = bookings.filter((b) => b.status === 'pending');
  const revenue = confirmed.reduce((s, b) => s + Number(b.amount || 0), 0);
  const todays = bookings.filter((b) => b.booking_date === today);

  const lines = todays.slice(0, 8).map((b) =>
    `• ${b.venue_name} | ${String(b.start_time).slice(0, 5)}-${String(b.end_time).slice(0, 5)} | ${b.booked_by_name} | ${b.status}`
  );

  const msg = `📊 *Aapki Bookings*
Total: ${bookings.length} | Confirmed: ${confirmed.length} | Pending: ${pending.length}
💰 Revenue (confirmed): PKR ${revenue}

*Aaj (${todays.length}):*
${lines.join('\n') || '— koi nahi —'}`;
  await sendMessage(from, msg);
}

module.exports = { handle };
