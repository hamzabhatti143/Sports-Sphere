"""One-off migration: add `slug` column to venues, backfill, and index it."""
from sqlalchemy import text
from app.db import engine, SessionLocal
from app.models import Venue
from app.utils import make_unique_slug

with engine.begin() as conn:
    conn.execute(text("ALTER TABLE venues ADD COLUMN IF NOT EXISTS slug VARCHAR"))

db = SessionLocal()
try:
    venues = db.query(Venue).order_by(Venue.id).all()
    for v in venues:
        if not v.slug:
            v.slug = make_unique_slug(db, v.name, Venue, exclude_id=v.id)
            print(f"  venue {v.id}: {v.name!r} -> slug={v.slug!r}")
    db.commit()
finally:
    db.close()

with engine.begin() as conn:
    conn.execute(text(
        "CREATE UNIQUE INDEX IF NOT EXISTS ix_venues_slug ON venues (slug)"
    ))

print("Migration complete.")
