// Data layer — talks to the SAME Neon Postgres the FastAPI backend uses.
// This replaces @supabase/supabase-js; every Supabase `.from(...)` in the spec
// maps to a parameterized SQL query here against the existing schema
// (users, venues, weekly_slots, bookings, discounts) plus the agent tables
// (payment_config, conversations).
require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');
const log = require('../utils/logger');
const { toLocal } = require('../utils/phone');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Neon
  max: 5,
});

pool.on('error', (e) => log.error('pg pool error', e.message));

function query(text, params) {
  return pool.query(text, params);
}

function genRef() {
  const s = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
  return 'PZ' + s;
}

// ---- pricing (mirrors backend app/pricing.py) ----
function weekdayOf(dateStr) {
  return (new Date(dateStr + 'T00:00:00').getDay() + 6) % 7; // 0=Mon..6=Sun
}
// Minutes since midnight for an 'HH:MM' or 'HH:MM:SS' string/Time.
function toMinutes(t) {
  const [h, m] = String(t).split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}
function discountActive(discount, dateStr) {
  if (!discount || !discount.enabled) return false;
  const days = (discount.days || '').split(',').filter((x) => x !== '').map(Number);
  if (days.length && !days.includes(weekdayOf(dateStr))) return false;
  if (discount.valid_until && dateStr > discount.valid_until) return false;
  return true;
}
function priceFor(perHour, hours, discount, dateStr) {
  const subtotal = Number(perHour) * hours;
  let discountAmount = 0;
  if (discountActive(discount, dateStr)) {
    discountAmount = discount.dtype === 'percentage'
      ? Math.round((subtotal * Number(discount.value)) / 100)
      : Math.min(Number(discount.value), subtotal);
  }
  return { subtotal, discountAmount, total: subtotal - discountAmount };
}

// ---- users ----
async function getUserByWhatsapp(number) {
  const local = toLocal(number);
  const { rows } = await query('SELECT * FROM users WHERE whatsapp = $1 LIMIT 1', [local]);
  return rows[0] || null;
}

async function ensureUserByWhatsapp(number, name) {
  const existing = await getUserByWhatsapp(number);
  if (existing) return existing;
  const local = toLocal(number);
  const { rows } = await query(
    `INSERT INTO users (full_name, whatsapp, role) VALUES ($1, $2, 'player') RETURNING *`,
    [name || 'WhatsApp User', local]
  );
  log.ok('created user for', local);
  return rows[0];
}

// ---- payment config ----
// Business rule: there is exactly ONE payment method for the whole platform —
// this JazzCash account — used for every venue. We ignore any per-venue rows in
// the payment_config table and always return this single config, so no other
// payment method can ever be shown to a customer.
const FIXED_PAYMENT_CONFIG = Object.freeze({
  method: 'JazzCash',
  account_number: '03243373891',
  account_name: 'Muhammad Hamza Bhatti',
  advance_percent: 50,
  is_active: true,
});

async function getPaymentConfig(_venueId) {
  return { ...FIXED_PAYMENT_CONFIG };
}

// Locked: the payment method is fixed platform-wide, so this never writes a new
// method. Kept so the admin route keeps working, but it just echoes the fixed config.
async function setPaymentConfig(_input) {
  return { ...FIXED_PAYMENT_CONFIG };
}

// ---- venues / slots ----
async function getVenueDetails(venueId) {
  const { rows } = await query(
    `SELECT v.*, u.whatsapp AS owner_whatsapp
       FROM venues v LEFT JOIN users u ON u.id = v.owner_id
      WHERE v.id = $1`,
    [venueId]
  );
  const venue = rows[0];
  if (!venue) return null;
  venue.payment_config = await getPaymentConfig(venueId);
  return venue;
}

async function searchSlots({ city, sport, date }) {
  const params = [];
  const where = [];
  if (city) { params.push(city); where.push(`v.city ILIKE $${params.length}`); }
  if (sport) { params.push(sport); where.push(`s.sport_id = $${params.length}`); }
  if (date) { params.push(weekdayOf(date)); where.push(`s.day_of_week = $${params.length}`); }
  const sql = `
    SELECT s.id AS slot_id, s.venue_id, s.sport_id, s.day_of_week, s.start_time, s.end_time,
           s.price AS per_hour_rate, v.name AS venue_name, v.city, v.area, v.address,
           u.whatsapp AS owner_whatsapp
      FROM weekly_slots s
      JOIN venues v ON v.id = s.venue_id
      LEFT JOIN users u ON u.id = v.owner_id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY v.name, s.start_time
     LIMIT 30`;
  const { rows } = await query(sql, params);
  return rows;
}

async function getDiscount(venueId) {
  const { rows } = await query('SELECT * FROM discounts WHERE venue_id = $1', [venueId]);
  return rows[0] || null;
}

async function resolveSportId(nameOrId) {
  if (nameOrId == null || nameOrId === '') return null;
  if (/^\d+$/.test(String(nameOrId))) return Number(nameOrId);
  const { rows } = await query('SELECT id FROM sports WHERE name ILIKE $1 LIMIT 1', [`%${nameOrId}%`]);
  return rows[0] ? rows[0].id : null;
}

// ---- bookings ----
async function createBooking({ whatsappNumber, userName, slotId, bookingDate, startTime, endTime }) {
  const { rows: srows } = await query('SELECT * FROM weekly_slots WHERE id = $1', [slotId]);
  const slot = srows[0];
  if (!slot) throw new Error('Slot not found');

  // Date must fall on the slot's weekday (mirrors the website's check).
  if (slot.day_of_week != null && Number(slot.day_of_week) !== weekdayOf(bookingDate)) {
    throw new Error('Yeh date is slot ke din se match nahi karti. Sahi din chunein.');
  }

  // Requested range must sit inside the slot's open window (end 00:00 = 24:00).
  const reqStart = toMinutes(startTime);
  let reqEnd = toMinutes(endTime);
  if (reqEnd <= reqStart) reqEnd += 24 * 60;
  let winStart = toMinutes(slot.start_time);
  let winEnd = toMinutes(slot.end_time);
  if (winEnd <= winStart) winEnd += 24 * 60;
  if (reqStart < winStart || reqEnd > winEnd) {
    throw new Error('Yeh time available window se bahar hai. Doosra time chunein.');
  }

  const minutes = reqEnd - reqStart;
  const hours = Math.round(minutes / 60);
  if (hours < 1) throw new Error('Booking kam se kam 1 ghanta honi chahiye.');

  // Overlap guard: reject if it clashes with an existing non-cancelled booking
  // (website OR bot) for this slot/date. Prevents double-booking + double payment.
  const { rows: existing } = await query(
    `SELECT start_time, end_time FROM bookings
      WHERE slot_id = $1 AND booking_date = $2 AND status <> 'cancelled'`,
    [slotId, bookingDate]
  );
  for (const b of existing) {
    let bs = toMinutes(b.start_time || slot.start_time);
    let be = toMinutes(b.end_time || slot.end_time);
    if (be <= bs) be += 24 * 60;
    if (reqStart < be && reqEnd > bs) {
      throw new Error('Yeh time already booked hai. Please doosra time chunein.');
    }
  }

  const discount = await getDiscount(slot.venue_id);
  const { total } = priceFor(slot.price, hours, discount, bookingDate);

  const cfg = await getPaymentConfig(slot.venue_id);
  const advancePercent = cfg ? cfg.advance_percent : 50;
  const advance = Math.round((total * advancePercent) / 100);
  const remaining = total - advance;

  const user = await ensureUserByWhatsapp(whatsappNumber, userName);
  const ref = genRef();
  const { rows } = await query(
    `INSERT INTO bookings
       (slot_id, user_id, reference, booked_by_name, booked_by_phone, booking_date,
        start_time, end_time, hours, amount, advance_amount, remaining_amount, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending')
     RETURNING *`,
    [slotId, user.id, ref, user.full_name, toLocal(whatsappNumber), bookingDate,
      startTime, endTime, hours, total, advance, remaining]
  );
  const booking = rows[0];
  booking.booking_ref = booking.reference;
  booking.venue_id = slot.venue_id; // convenience for the booking agent
  return booking;
}

// booking + venue context, used by the payment agent
async function getBookingForVerification(bookingId) {
  const { rows } = await query(
    `SELECT b.*, b.reference AS booking_ref,
            v.id AS venue_id, v.name AS venue_name, v.address AS venue_address,
            u.whatsapp AS owner_whatsapp, cust.full_name AS user_name
       FROM bookings b
       JOIN weekly_slots s ON s.id = b.slot_id
       JOIN venues v ON v.id = s.venue_id
       LEFT JOIN users u ON u.id = v.owner_id
       LEFT JOIN users cust ON cust.id = b.user_id
      WHERE b.id = $1`,
    [bookingId]
  );
  const b = rows[0];
  if (!b) return null;
  // shape a `venues` sub-object so the spec's `booking.venues.name` still works
  b.venues = { id: b.venue_id, name: b.venue_name, address: b.venue_address, whatsapp: b.owner_whatsapp };
  return b;
}

async function confirmBookingPaid(bookingId, transactionId) {
  const { rows } = await query(
    `UPDATE bookings SET status = 'confirmed', payment_verified = TRUE, transaction_id = $2
       WHERE id = $1 RETURNING *`,
    [bookingId, transactionId || null]
  );
  return rows[0];
}

async function rejectBookingPayment(bookingId) {
  const { rows } = await query(
    `UPDATE bookings SET status = 'payment_failed' WHERE id = $1 RETURNING *`,
    [bookingId]
  );
  return rows[0];
}

async function releaseBooking(bookingId) {
  const { rows } = await query(
    `UPDATE bookings SET status = 'cancelled' WHERE id = $1 AND status = 'pending' RETURNING *`,
    [bookingId]
  );
  return rows[0] || null;
}

// Cancel pending bookings whose hold has expired. Scoped to the last 24h so it
// never retroactively cancels ancient/stale pending rows. Returns the released
// rows (with the customer's number) so callers can notify them.
async function releaseExpiredHolds(minutes = 90) {
  const { rows } = await query(
    `UPDATE bookings SET status = 'cancelled'
       WHERE status = 'pending'
         AND created_at < NOW() - ($1 * INTERVAL '1 minute')
         AND created_at > NOW() - INTERVAL '24 hours'
     RETURNING id, reference, booked_by_phone`,
    [minutes]
  );
  return rows;
}

// The customer's most recent booking that is still awaiting payment (used when a
// payment proof arrives but the conversation pointer is missing/stale). Includes
// 'payment_failed' so a customer can resend a corrected screenshot after a
// rejection (the slot isn't released on failure, only on hold-expiry).
async function latestPendingBooking(number) {
  const { rows } = await query(
    `SELECT id FROM bookings WHERE booked_by_phone = $1 AND status IN ('pending','payment_failed')
      ORDER BY created_at DESC LIMIT 1`,
    [toLocal(number)]
  );
  return rows[0] ? rows[0].id : null;
}

// Last-resort match: the single most recent booking still awaiting payment
// (any customer), created within the window. Used when a payment proof can't be
// tied to the sender's chat/phone (e.g. WhatsApp @lid hides the real number).
async function latestUnpaidBookingAny(minutesWindow = 180) {
  const { rows } = await query(
    `SELECT id FROM bookings WHERE status IN ('pending','payment_failed')
        AND created_at > NOW() - ($1 * INTERVAL '1 minute')
      ORDER BY created_at DESC LIMIT 1`,
    [minutesWindow]
  );
  return rows[0] ? rows[0].id : null;
}

// Fraud guard: has this transaction id already confirmed a (different) booking?
async function isTransactionUsed(transactionId, excludeBookingId = null) {
  if (!transactionId) return false;
  const { rows } = await query(
    `SELECT id FROM bookings
      WHERE transaction_id = $1 AND payment_verified = TRUE AND id <> $2 LIMIT 1`,
    [String(transactionId), excludeBookingId || -1]
  );
  return rows.length > 0;
}

async function listBookings(limit = 100) {
  const { rows } = await query(
    `SELECT b.*, v.name AS venue_name FROM bookings b
       JOIN weekly_slots s ON s.id = b.slot_id
       JOIN venues v ON v.id = s.venue_id
      ORDER BY b.created_at DESC LIMIT $1`,
    [limit]
  );
  return rows;
}

async function ownerBookings(ownerWhatsapp) {
  const { rows } = await query(
    `SELECT b.*, v.name AS venue_name FROM bookings b
       JOIN weekly_slots s ON s.id = b.slot_id
       JOIN venues v ON v.id = s.venue_id
       JOIN users u ON u.id = v.owner_id
      WHERE u.whatsapp = $1
      ORDER BY b.booking_date DESC LIMIT 50`,
    [toLocal(ownerWhatsapp)]
  );
  return rows;
}

// ---- conversations (durable copy; Redis is the hot cache) ----
async function saveConversation(number, messages, currentBookingId = null) {
  const local = toLocal(number);
  await query(
    `INSERT INTO conversations (whatsapp_number, messages, current_booking_id, last_active)
       VALUES ($1, $2::jsonb, $3, NOW())
     ON CONFLICT (whatsapp_number)
       DO UPDATE SET messages = $2::jsonb, current_booking_id = COALESCE($3, conversations.current_booking_id), last_active = NOW()`,
    [local, JSON.stringify(messages || []), currentBookingId]
  );
}

async function getConversation(number) {
  const { rows } = await query('SELECT * FROM conversations WHERE whatsapp_number = $1', [toLocal(number)]);
  return rows[0] || null;
}

async function listConversations() {
  const { rows } = await query('SELECT * FROM conversations ORDER BY last_active DESC LIMIT 100');
  return rows;
}

async function userBookings(whatsappNumber) {
  const { rows } = await query(
    `SELECT b.*, v.name AS venue_name FROM bookings b
       JOIN weekly_slots s ON s.id = b.slot_id
       JOIN venues v ON v.id = s.venue_id
      WHERE b.booked_by_phone = $1
      ORDER BY b.booking_date DESC LIMIT 10`,
    [toLocal(whatsappNumber)]
  );
  return rows;
}

async function searchPlayers({ city, sport }) {
  const params = [];
  const where = [];
  if (city) { params.push(city); where.push(`p.city ILIKE $${params.length}`); }
  const sql = `
    SELECT p.id, p.full_name, p.city, p.phone, p.experience_level
      FROM players p
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     LIMIT 20`;
  const { rows } = await query(sql, params);
  return rows;
}

module.exports = {
  pool, query, genRef, priceFor,
  getUserByWhatsapp, ensureUserByWhatsapp,
  getPaymentConfig, setPaymentConfig,
  getVenueDetails, searchSlots, getDiscount, resolveSportId,
  createBooking, getBookingForVerification, confirmBookingPaid, rejectBookingPayment, releaseBooking,
  releaseExpiredHolds, isTransactionUsed, latestPendingBooking, latestUnpaidBookingAny,
  listBookings, ownerBookings, userBookings, searchPlayers,
  saveConversation, getConversation, listConversations,
};
