"""One-off migration: add nullable `slot_date` column to weekly_slots."""
from sqlalchemy import text
from app.db import engine

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE weekly_slots ADD COLUMN IF NOT EXISTS slot_date VARCHAR"))

print("Migration complete: weekly_slots.slot_date added.")
