"""Chunk 2 migration: account-linked, time-range bookings + discounts.

- adds 'pending' to the bookingstatus enum
- adds user_id / reference / start_time / end_time / hours / amount to bookings
- drops the old one-booking-per-slot-per-date unique constraint
- creates the discounts table (via metadata)
Idempotent — safe to re-run. Postgres (Neon) syntax.
"""
from sqlalchemy import text
from app.db import engine, Base
import app.models  # noqa: F401  (register all models on Base)

# 1. Enum value must be added outside a transaction block.
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    conn.execute(text("ALTER TYPE bookingstatus ADD VALUE IF NOT EXISTS 'pending'"))
    print("bookingstatus enum: ensured 'pending' value")

# 2. New tables (discounts) that don't yet exist.
Base.metadata.create_all(bind=engine)
print("metadata.create_all: ensured discounts table")

# 3. New columns + constraint changes on bookings.
with engine.begin() as conn:
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS user_id INTEGER"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reference VARCHAR"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_time TIME"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS end_time TIME"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS hours INTEGER"))
    conn.execute(text("ALTER TABLE bookings ADD COLUMN IF NOT EXISTS amount NUMERIC(10, 2)"))
    conn.execute(text("ALTER TABLE bookings DROP CONSTRAINT IF EXISTS uq_slot_date"))
    conn.execute(text("CREATE UNIQUE INDEX IF NOT EXISTS ix_bookings_reference ON bookings (reference)"))
    conn.execute(text("CREATE INDEX IF NOT EXISTS ix_bookings_user_id ON bookings (user_id)"))
    print("bookings: columns + constraints ensured")

print("Chunk 2 migration complete.")
