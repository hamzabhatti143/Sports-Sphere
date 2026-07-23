// Portable migration (mirror of backend/migrate_agent.py) — run with `npm run migrate`.
// Adds the agent columns/tables to the shared Neon DB. Idempotent.
require('dotenv').config();
const { Client } = require('pg');
const log = require('../utils/logger');

const DDL = [
  // enum value add runs in its own (autocommit) statement
  `ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'payment_failed'`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10,2)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10,2)`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT`,
  `ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transaction_id VARCHAR`,
  `CREATE TABLE IF NOT EXISTS payment_config (
     id SERIAL PRIMARY KEY,
     venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
     method TEXT NOT NULL, account_number TEXT NOT NULL, account_name TEXT NOT NULL,
     advance_percent INTEGER DEFAULT 50, is_active BOOLEAN DEFAULT TRUE,
     created_at TIMESTAMP DEFAULT NOW())`,
  `CREATE INDEX IF NOT EXISTS ix_payment_config_venue ON payment_config (venue_id)`,
  `CREATE TABLE IF NOT EXISTS conversations (
     id SERIAL PRIMARY KEY, whatsapp_number TEXT UNIQUE,
     messages JSONB DEFAULT '[]'::jsonb,
     current_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
     last_active TIMESTAMP DEFAULT NOW())`,
];

async function run() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });
  await client.connect();
  for (const stmt of DDL) {
    try { await client.query(stmt); log.ok('applied:', stmt.slice(0, 60).replace(/\s+/g, ' ') + '…'); }
    catch (e) { log.error('failed:', stmt.slice(0, 50), '→', e.message); }
  }
  await client.end();
  log.ok('agent migration complete');
}

run().catch((e) => { log.error(e.message); process.exit(1); });
