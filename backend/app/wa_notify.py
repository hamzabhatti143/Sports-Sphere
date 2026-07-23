"""Website -> WhatsApp bridge.

When a booking is made on the website, we ask the PlayZone WhatsApp bot
(playzone-agents, running its admin API on BOT_URL) to message the customer the
advance-payment instructions. We also:
  * write advance_amount / remaining_amount onto the booking, and
  * upsert a `conversations` row pointing at this booking, so that when the
    customer later replies on WhatsApp with their payment screenshot, the bot's
    GPT-4o Vision verifier knows which booking to confirm.

This runs as a FastAPI BackgroundTask and is strictly best-effort: any failure
(bot down, no payment config, etc.) is swallowed so it can never affect the
booking API response.
"""
import json
import logging
import os
import urllib.request

from sqlalchemy import text

from app.db import SessionLocal

log = logging.getLogger("wa_notify")

BOT_URL = os.getenv("BOT_URL", "http://127.0.0.1:3001")
BOT_ADMIN_TOKEN = os.getenv("BOT_ADMIN_TOKEN", "")
HOLD_MINUTES = int(os.getenv("HOLD_MINUTES", "90"))

# Business rule: exactly ONE payment method platform-wide (JazzCash), used for
# every venue. Kept in sync with playzone-agents' FIXED_PAYMENT_CONFIG.
FIXED_PAYMENT_CONFIG = {
    "method": "JazzCash",
    "account_number": "03243373891",
    "account_name": "Muhammad Hamza Bhatti",
    "advance_percent": 50,
}


def _post_send_message(number: str, message: str, timeout: int = 6):
    payload = json.dumps({"number": number, "text": message}).encode("utf-8")
    req = urllib.request.Request(
        BOT_URL.rstrip("/") + "/admin/send-message",
        data=payload,
        headers={
            "Content-Type": "application/json",
            "x-admin-token": BOT_ADMIN_TOKEN,
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.status


def _hhmm(t) -> str:
    return str(t)[:5] if t is not None else "?"


def send_advance_payment_request(booking_id: int):
    """Look up the booking + venue payment config and WhatsApp the customer."""
    db = SessionLocal()
    try:
        row = db.execute(
            text(
                """
                SELECT b.reference, b.booking_date, b.start_time, b.end_time,
                       b.hours, b.amount, b.booked_by_phone, b.booked_by_name,
                       v.id AS venue_id, v.name AS venue_name,
                       u.whatsapp AS user_whatsapp,
                       owner.whatsapp AS owner_whatsapp
                  FROM bookings b
                  JOIN weekly_slots s ON s.id = b.slot_id
                  JOIN venues v ON v.id = s.venue_id
                  LEFT JOIN users u ON u.id = b.user_id
                  LEFT JOIN users owner ON owner.id = v.owner_id
                 WHERE b.id = :bid
                """
            ),
            {"bid": booking_id},
        ).mappings().first()
        if not row:
            log.warning("wa_notify: booking %s not found", booking_id)
            return

        number = row["booked_by_phone"] or row["user_whatsapp"]
        if not number:
            log.warning("wa_notify: booking %s has no contact number", booking_id)
            return  # no way to reach the customer

        # Single fixed payment method for every venue.
        cfg = FIXED_PAYMENT_CONFIG

        total = float(row["amount"] or 0)
        advance_percent = int(cfg["advance_percent"])
        advance = round(total * advance_percent / 100)
        remaining = round(total - advance)

        # Persist the split and a conversation pointer so a later screenshot maps here.
        db.execute(
            text("UPDATE bookings SET advance_amount = :a, remaining_amount = :r WHERE id = :bid"),
            {"a": advance, "r": remaining, "bid": booking_id},
        )
        db.execute(
            text(
                """
                INSERT INTO conversations (whatsapp_number, messages, current_booking_id, last_active)
                     VALUES (:num, '[]'::jsonb, :bid, NOW())
                ON CONFLICT (whatsapp_number)
                DO UPDATE SET current_booking_id = :bid, last_active = NOW()
                """
            ),
            {"num": number, "bid": booking_id},
        )
        db.commit()

        pay_block = (
            "💳 *Payment Details:*\n"
            f"Method: {cfg['method']}\n"
            f"Account: {cfg['account_number']}\n"
            f"Name: {cfg['account_name']}\n"
            f"Advance: PKR {advance}  |  Remaining: PKR {remaining}"
        )

        name = f" {row['booked_by_name']}" if row["booked_by_name"] else ""
        message = (
            f"Assalam o Alaikum{name}! 👋 PlayZone se.\n\n"
            "Aapki website booking *pending* hai:\n"
            f"🏟️ {row['venue_name']}\n"
            f"📅 {row['booking_date']}  ⏰ {_hhmm(row['start_time'])}-{_hhmm(row['end_time'])} ({row['hours']} hr)\n"
            f"💰 Total: PKR {int(total)}\n\n"
            f"{pay_block}\n\n"
            "Advance bhejne ke baad *payment screenshot* isi chat mein bhej dein "
            f"taake slot confirm ho jaye. ⏱️ {HOLD_MINUTES} min ke andar bhejein.\n"
            f"🔖 Ref: #{row['reference']}"
        )
        _post_send_message(number, message)
        log.info("wa_notify: sent advance-payment message for booking %s to %s", booking_id, number)

        # Also notify the venue owner that a slot was booked.
        owner_wa = row["owner_whatsapp"]
        if owner_wa:
            cust = row["booked_by_name"] or "Customer"
            owner_msg = (
                "🔔 *Nayi Booking!* (PlayZone)\n"
                f"🏟️ {row['venue_name']}\n"
                f"📅 {row['booking_date']}  ⏰ {_hhmm(row['start_time'])}-{_hhmm(row['end_time'])} ({row['hours']} hr)\n"
                f"👤 Customer: {cust} ({row['booked_by_phone'] or '-'})\n"
                f"💰 Total: PKR {int(total)}  |  Advance: PKR {advance}\n"
                "Status: ⏳ Payment pending\n"
                f"🔖 Ref: #{row['reference']}"
            )
            try:
                _post_send_message(owner_wa, owner_msg)
                log.info("wa_notify: notified owner %s for booking %s", owner_wa, booking_id)
            except Exception as ex:
                log.warning("wa_notify: owner notify failed for booking %s: %s", booking_id, ex)
    except Exception as ex:
        log.warning("wa_notify: failed for booking %s: %s", booking_id, ex)
        try:
            db.rollback()
        except Exception:
            pass
    finally:
        db.close()
