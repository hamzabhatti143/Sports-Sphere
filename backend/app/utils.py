import re
from sqlalchemy.orm import Session


def normalize_pk_whatsapp(raw: str) -> str:
    """
    Normalize a Pakistani WhatsApp/phone number to local 11-digit form
    '03XXXXXXXXX'. Accepts inputs like '0300 1234567', '+92 300 1234567',
    '92300 1234567', '0300-1234567'. Raises ValueError if it isn't a valid
    Pakistani mobile number.
    """
    digits = re.sub(r"\D", "", raw or "")
    # Strip country code variants -> leave the 10-digit '3XXXXXXXXX' subscriber part.
    if digits.startswith("0092"):
        digits = digits[4:]
    elif digits.startswith("92"):
        digits = digits[2:]
    elif digits.startswith("0"):
        digits = digits[1:]
    # Now `digits` should be the 10-digit subscriber number starting with 3.
    if len(digits) != 10 or not digits.startswith("3"):
        raise ValueError("Enter a valid Pakistani mobile number (03XX XXXXXXX)")
    return "0" + digits


def slugify(text: str) -> str:
    """Generate an SEO-friendly slug from arbitrary text."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "venue"


def make_unique_slug(db: Session, name: str, model, exclude_id: int | None = None) -> str:
    """
    Build a unique slug for `name` against `model.slug`, appending -2, -3, ...
    on collision. `exclude_id` lets an update keep its own slug.
    """
    base = slugify(name)
    slug = base
    n = 2
    while True:
        query = db.query(model).filter(model.slug == slug)
        if exclude_id is not None:
            query = query.filter(model.id != exclude_id)
        if query.first() is None:
            return slug
        slug = f"{base}-{n}"
        n += 1
