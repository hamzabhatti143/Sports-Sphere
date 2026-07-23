"""Chunk 1 migration: 3 user types + profile fields.

Adds the `general` value to the userrole enum, name/whatsapp/city columns on
users, and experience/availability/bio columns on players. Idempotent — safe to
re-run. Works on Postgres (Neon); the ADD COLUMN IF NOT EXISTS statements are
Postgres syntax.
"""
from sqlalchemy import text
from app.db import engine

# ALTER TYPE ... ADD VALUE must run outside a normal transaction block, so use
# an AUTOCOMMIT connection for the enum change.
with engine.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
    conn.execute(text("ALTER TYPE userrole ADD VALUE IF NOT EXISTS 'general'"))
    print("userrole enum: ensured 'general' value")

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp VARCHAR"))
    conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS city VARCHAR"))

    conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS experience_level VARCHAR"))
    conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS avail_weekdays BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS avail_weekends BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS avail_evenings BOOLEAN DEFAULT FALSE"))
    conn.execute(text("ALTER TABLE players ADD COLUMN IF NOT EXISTS bio VARCHAR"))
    print("users + players: columns ensured")

print("Chunk 1 migration complete.")
