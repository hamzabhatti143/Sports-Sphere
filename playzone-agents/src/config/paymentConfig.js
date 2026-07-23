// Payment-config helpers. Per-venue payment details live in the DB
// (payment_config table); this module centralises defaults + math.
const db = require('../tools/database');

const DEFAULT_ADVANCE_PERCENT = 50;
const AMOUNT_TOLERANCE_PKR = 5;         // ±5 PKR rounding tolerance on the amount check
const TXN_MAX_AGE_MINUTES = 120;        // transaction must be within last 2 hours

function computeAdvance(total, advancePercent = DEFAULT_ADVANCE_PERCENT) {
  const advance = Math.round((Number(total) * advancePercent) / 100);
  return { advance, remaining: Number(total) - advance };
}

async function getForVenue(venueId) {
  const cfg = await db.getPaymentConfig(venueId);
  if (!cfg) return null;
  return { ...cfg, advance_percent: cfg.advance_percent ?? DEFAULT_ADVANCE_PERCENT };
}

module.exports = {
  DEFAULT_ADVANCE_PERCENT,
  AMOUNT_TOLERANCE_PKR,
  TXN_MAX_AGE_MINUTES,
  computeAdvance,
  getForVenue,
};
