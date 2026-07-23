"""Shared discount / price calculation used by bookings, slot search and the
venue portal. Keeps the discount rules in one place."""
from datetime import datetime
from decimal import Decimal, ROUND_HALF_UP

TWO = Decimal("0.01")


def discount_active_on(discount, booking_date: str) -> bool:
    """Is the venue's discount valid for the given YYYY-MM-DD date?"""
    if not discount or not discount.enabled:
        return False
    try:
        day = datetime.strptime(booking_date, "%Y-%m-%d").weekday()
    except (ValueError, TypeError):
        return False
    days = [int(x) for x in (discount.days or "").split(",") if x.strip() != ""]
    if days and day not in days:
        return False
    if discount.valid_until:
        try:
            end = datetime.strptime(discount.valid_until, "%Y-%m-%d").date()
            if datetime.strptime(booking_date, "%Y-%m-%d").date() > end:
                return False
        except (ValueError, TypeError):
            pass
    return True


def compute_price(per_hour, hours: int, discount, booking_date: str) -> dict:
    """Return subtotal / discount_amount / total / label for a booking."""
    subtotal = (Decimal(str(per_hour)) * hours).quantize(TWO, ROUND_HALF_UP)
    disc_amount = Decimal("0.00")
    label = None
    if discount_active_on(discount, booking_date):
        value = Decimal(str(discount.value or 0))
        if discount.dtype == "percentage":
            disc_amount = (subtotal * value / Decimal(100)).quantize(TWO, ROUND_HALF_UP)
            label = f"{int(value) if value == int(value) else value}% OFF"
        else:
            disc_amount = min(value, subtotal).quantize(TWO, ROUND_HALF_UP)
            label = f"PKR {int(value) if value == int(value) else value} OFF"
    total = (subtotal - disc_amount).quantize(TWO, ROUND_HALF_UP)
    return {
        "subtotal": subtotal,
        "discount_amount": disc_amount,
        "total": total,
        "discount_label": label,
    }


def discount_preview(discount) -> dict | None:
    """Lightweight discount summary for API payloads (no date/amount)."""
    if not discount or not discount.enabled:
        return None
    value = discount.value or 0
    return {
        "enabled": True,
        "dtype": discount.dtype,
        "value": float(value),
        "days": [int(x) for x in (discount.days or "").split(",") if x.strip() != ""],
        "valid_until": discount.valid_until,
        "label": (
            f"{int(value) if value == int(value) else value}% OFF"
            if discount.dtype == "percentage"
            else f"PKR {int(value) if value == int(value) else value} OFF"
        ),
    }
