import random
import string
from datetime import datetime, date
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from app.db import get_db
from app.models import Booking, WeeklySlot, Venue, User, BookingStatus
from app.schemas import (
    BookingCreate, BookingOut, OwnerBookingOut, MyBookingOut, BookingStatusUpdate,
)
from app.auth import require_owner, get_current_user
from app.pricing import compute_price
from app.timeutil import start_minutes, end_minutes
from app.wa_notify import send_advance_payment_request

router = APIRouter(prefix="/bookings", tags=["bookings"])

_DUMMY = date(2000, 1, 1)


def _hours_between(start, end) -> int:
    """Whole hours between a start and end time, treating end 00:00 as 24:00."""
    return int(round((end_minutes(end) - start_minutes(start)) / 60))


def _gen_reference(db: Session) -> str:
    while True:
        ref = "PZ" + "".join(random.choices(string.ascii_uppercase + string.digits, k=6))
        if not db.query(Booking).filter(Booking.reference == ref).first():
            return ref


def _day_of_week(date_str: str) -> int:
    return datetime.strptime(date_str, "%Y-%m-%d").weekday()


@router.get("/me", response_model=List[MyBookingOut])
def get_my_bookings(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """The signed-in customer's own bookings."""
    rows = (
        db.query(Booking, WeeklySlot, Venue)
        .join(WeeklySlot, Booking.slot_id == WeeklySlot.id)
        .join(Venue, WeeklySlot.venue_id == Venue.id)
        .options(joinedload(Venue.owner))  # avoid per-row lazy load of the owner
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.booking_date.desc(), Booking.id.desc())
        .all()
    )
    out = []
    for booking, slot, venue in rows:
        status_val = booking.status.value if hasattr(booking.status, "value") else booking.status
        out.append(MyBookingOut(
            id=booking.id,
            reference=booking.reference,
            slot_id=slot.id,
            venue_id=venue.id,
            venue_name=venue.name,
            venue_slug=venue.slug,
            # Only reveal the venue owner's WhatsApp once the booking is confirmed.
            venue_whatsapp=venue.owner.whatsapp if status_val == "confirmed" and venue.owner else None,
            sport_id=slot.sport_id,
            booking_date=booking.booking_date,
            start_time=booking.start_time or slot.start_time,
            end_time=booking.end_time or slot.end_time,
            hours=booking.hours,
            amount=booking.amount,
            status=status_val,
        ))
    return out


@router.get("/owner", response_model=List[OwnerBookingOut])
def get_owner_bookings(owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    """All bookings across the owner's venues (venue portal)."""
    rows = (
        db.query(Booking, WeeklySlot, Venue)
        .join(WeeklySlot, Booking.slot_id == WeeklySlot.id)
        .join(Venue, WeeklySlot.venue_id == Venue.id)
        .filter(Venue.owner_id == owner.id)
        .order_by(Booking.booking_date.desc(), Booking.id.desc())
        .all()
    )
    return [
        OwnerBookingOut(
            id=booking.id,
            reference=booking.reference,
            booking_date=booking.booking_date,
            booked_by_name=booking.booked_by_name,
            booked_by_phone=booking.booked_by_phone,
            status=booking.status.value if hasattr(booking.status, "value") else booking.status,
            venue_id=venue.id,
            venue_name=venue.name,
            sport_id=slot.sport_id,
            day_of_week=slot.day_of_week,
            start_time=booking.start_time or slot.start_time,
            end_time=booking.end_time or slot.end_time,
            hours=booking.hours,
            amount=booking.amount if booking.amount is not None else slot.price,
            price=slot.price,
        )
        for booking, slot, venue in rows
    ]


@router.post("", response_model=BookingOut, status_code=201)
def create_booking(
    req: BookingCreate,
    background: BackgroundTasks,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    slot = db.query(WeeklySlot).filter(WeeklySlot.id == req.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    # Date must fall on the slot's weekday.
    try:
        if _day_of_week(req.booking_date) != slot.day_of_week:
            raise HTTPException(status_code=400, detail="Selected date does not match this slot's day")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid booking date")

    # Requested range must sit inside the venue's available window
    # (end 00:00 counts as 24:00 / end-of-day).
    req_start, req_end = start_minutes(req.start_time), end_minutes(req.end_time)
    win_start, win_end = start_minutes(slot.start_time), end_minutes(slot.end_time)
    if req_start < win_start or req_end > win_end:
        raise HTTPException(status_code=400, detail="Selected time is outside the available window")

    hours = _hours_between(req.start_time, req.end_time)
    if hours < 1:
        raise HTTPException(status_code=400, detail="Booking must be at least 1 hour")

    # Overlap check against existing non-cancelled bookings for this slot/date.
    existing = db.query(Booking).filter(
        Booking.slot_id == slot.id,
        Booking.booking_date == req.booking_date,
        Booking.status != BookingStatus.cancelled,
    ).all()
    for b in existing:
        bs = start_minutes(b.start_time or slot.start_time)
        be = end_minutes(b.end_time or slot.end_time)
        if req_start < be and req_end > bs:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="This time is already booked. Please pick another time.",
            )

    price = compute_price(slot.price, hours, slot.venue.discount, req.booking_date)

    booking = Booking(
        slot_id=slot.id,
        user_id=current_user.id,
        reference=_gen_reference(db),
        booked_by_name=(req.booked_by_name or current_user.full_name or "Guest"),
        booked_by_phone=req.booked_by_phone,
        booking_date=req.booking_date,
        start_time=req.start_time,
        end_time=req.end_time,
        hours=hours,
        amount=price["total"],
        status=BookingStatus.pending,
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)

    # Best-effort: WhatsApp the customer the advance-payment instructions and
    # link this booking so a later payment screenshot auto-confirms it. Runs
    # after the response and never blocks/breaks booking creation.
    background.add_task(send_advance_payment_request, booking.id)

    return BookingOut(
        id=booking.id,
        reference=booking.reference,
        slot_id=booking.slot_id,
        booked_by_name=booking.booked_by_name,
        booked_by_phone=booking.booked_by_phone,
        booking_date=booking.booking_date,
        start_time=booking.start_time,
        end_time=booking.end_time,
        hours=booking.hours,
        amount=booking.amount,
        status=booking.status.value,
    )


@router.patch("/{booking_id}/cancel", response_model=BookingOut)
def cancel_booking(
    booking_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.status == BookingStatus.cancelled:
        raise HTTPException(status_code=400, detail="Booking is already cancelled")
    if booking.status == BookingStatus.confirmed:
        raise HTTPException(status_code=400, detail="Confirmed bookings can't be cancelled here — contact the venue")
    # Only future bookings can be cancelled by the customer.
    if booking.booking_date < date.today().isoformat():
        raise HTTPException(status_code=400, detail="Past bookings can't be cancelled")
    booking.status = BookingStatus.cancelled
    db.commit()
    db.refresh(booking)
    return BookingOut(
        id=booking.id, reference=booking.reference, slot_id=booking.slot_id,
        booked_by_name=booking.booked_by_name, booked_by_phone=booking.booked_by_phone,
        booking_date=booking.booking_date, start_time=booking.start_time,
        end_time=booking.end_time, hours=booking.hours, amount=booking.amount,
        status=booking.status.value,
    )


@router.patch("/{booking_id}/status", response_model=OwnerBookingOut)
def update_booking_status(
    booking_id: int,
    req: BookingStatusUpdate,
    owner: User = Depends(require_owner),
    db: Session = Depends(get_db),
):
    """Venue owner sets a booking to confirmed / cancelled (Chunk 4)."""
    row = (
        db.query(Booking, WeeklySlot, Venue)
        .join(WeeklySlot, Booking.slot_id == WeeklySlot.id)
        .join(Venue, WeeklySlot.venue_id == Venue.id)
        .filter(Booking.id == booking_id, Venue.owner_id == owner.id)
        .first()
    )
    if not row:
        raise HTTPException(status_code=404, detail="Booking not found")
    booking, slot, venue = row
    if req.status not in ("pending", "confirmed", "cancelled"):
        raise HTTPException(status_code=400, detail="Invalid status")
    booking.status = BookingStatus(req.status)
    db.commit()
    db.refresh(booking)
    return OwnerBookingOut(
        id=booking.id, reference=booking.reference, booking_date=booking.booking_date,
        booked_by_name=booking.booked_by_name, booked_by_phone=booking.booked_by_phone,
        status=booking.status.value, venue_id=venue.id, venue_name=venue.name,
        sport_id=slot.sport_id, day_of_week=slot.day_of_week,
        start_time=booking.start_time or slot.start_time,
        end_time=booking.end_time or slot.end_time, hours=booking.hours,
        amount=booking.amount if booking.amount is not None else slot.price, price=slot.price,
    )
