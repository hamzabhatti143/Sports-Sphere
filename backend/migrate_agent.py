"""Agent migration: extend the shared Neon DB for the WhatsApp payment bot.

Adds advance/remaining/payment fields to bookings, a 'payment_failed' booking
status, and the payment_config + conversations tables the agents need.
Idempotent — safe to re-run. Postgres (Neon) syntax.
"""
from sqlalchemy import text
from app.db import engine

# 1. New booking status value (must be added outside a transaction block).
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    conn.execute(text("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'payment_failed'"))
    print("bookingstatus enum: ensured 'payment_failed'")

with engine.begin() as conn:
    # 2. Booking payment columns.
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS advance_amount NUMERIC(10, 2)"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(10, 2)"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS payment_screenshot_url TEXT"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS transaction_id VARCHAR"))

    # 3. Per-venue payment configuration (JazzCash/EasyPaisa/Bank details).
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS payment_config (
            id SERIAL PRIMARY KEY,
            venue_id INTEGER REFERENCES venues(id) ON DELETE CASCADE,
            method TEXT NOT NULL,
            account_number TEXT NOT NULL,
            account_name TEXT NOT NULL,
            advance_percent INTEGER DEFAULT 50,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP DEFAULT NOW()
        )
    """))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_payment_config_venue ON payment_config (venue_id)"))

    # 4. WhatsApp conversation state (hot cache lives in Redis; this is the durable copy).
    conn.execute(text("""
        CREATE TABLE IF NOT EXISTS conversations (
            id SERIAL PRIMARY KEY,
            whatsapp_number TEXT UNIQUE,
            messages JSONB DEFAULT '[]'::jsonb,
            current_booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
            last_active TIMESTAMP DEFAULT NOW()
        )
    """))
    print("bookings columns + payment_config + conversations ensured")

print("Agent migration complete.")
