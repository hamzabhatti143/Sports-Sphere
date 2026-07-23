// Slot-hold scheduling.
//
// Holds used to run on a Bull/Redis queue. Since no Redis is deployed, hold
// expiry is now enforced by a DB sweeper in index.js (startHoldSweeper) that
// cancels pending bookings older than HOLD_MINUTES. These functions are kept as
// no-ops so callers (e.g. bookingAgent) don't need to change and no Redis
// connection is ever opened.
const log = require('../utils/logger');

const HOLD_MS = 30 * 60 * 1000;

function initScheduler() {
  // Intentionally empty — see startHoldSweeper() in index.js.
  return null;
}

async function scheduleHoldExpiry(_bookingId, _whatsappNumber, _delayMs = HOLD_MS) {
  // No-op: the DB sweeper releases expired holds by created_at.
  log.step('hold tracked (DB sweeper will release if unpaid)');
}

module.exports = { initScheduler, scheduleHoldExpiry, HOLD_MS };
