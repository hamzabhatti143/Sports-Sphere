from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import and_
from datetime import datetime, date, timedelta
from app.db import get_db
from app.models import WeeklySlot, Booking, BookingStatus, Venue
from app.schemas import SlotOut, SlotDetailOut, SlotAvailabilityOut
from app.pricing import discount_preview
from app.timeutil import start_hour, end_hour
from typing import List, Optional

router = APIRouter(prefix="/slots", tags=["slots"])

_DUMMY = date(2000, 1, 1)


def get_day_of_week(date_str: str) -> int:
    """Convert YYYY-MM-DD to day_of_week (0=Monday, 6=Sunday)"""
    return datetime.strptime(date_str, "%Y-%m-%d").weekday()


def _next_date_for_day(day_of_week: int) -> str:
    """Next calendar date (>= today) whose weekday matches day_of_week."""
    today = date.today()
    delta = (day_of_week - today.weekday()) % 7
    return (today + timedelta(days=delta)).isoformat()


def _active_bookings(db: Session, slot_id: int, date_str: str, confirmed_only: bool = False):
    q = db.query(Booking).filter(
        Booking.slot_id == slot_id,
        Booking.booking_date == date_str,
        Booking.status != BookingStatus.cancelled,
    )
    if confirmed_only:
        q = q.filter(Booking.status == BookingStatus.confirmed)
    return q.all()


def _is_fully_booked(slot: WeeklySlot, bookings) -> bool:
    """True only if every whole hour in the window is covered by CONFIRMED bookings.
    Handles windows ending at midnight (00:00 -> 24)."""
    covered = set()
    for b in bookings:
        bs = start_hour(b.start_time or slot.start_time)
        be = end_hour(b.end_time or slot.end_time)
        covered.update(range(bs, be))
    window = set(range(start_hour(slot.start_time), end_hour(slot.end_time)))
    return len(window) > 0 and window.issubset(covered)


@router.get("/search", response_model=List[SlotOut])
def search_slots(
    date: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    area: Optional[str] = Query(None),
    sport: Optional[int] = Query(None),
    skip: int = Query(0),
    limit: int = Query(100),
    db: Session = Depends(get_db)
):
    # Eager-load venue (+ its discount) so we don't lazy-load them per slot. Filters
    # use .has() (EXISTS) so no manual join is needed (which would fight joinedload).
    query = db.query(WeeklySlot).options(
        joinedload(WeeklySlot.venue).joinedload(Venue.discount)
    )

    if city:
        query = query.filter(WeeklySlot.venue.has(city=city))
    if area:
        query = query.filter(WeeklySlot.venue.has(area=area))
    if sport:
        query = query.filter(WeeklySlot.sport_id == sport)

    # Only restrict by weekday when a specific date was provided.
    if date:
        query = query.filter(WeeklySlot.day_of_week == get_day_of_week(date))

    slots = query.offset(skip).limit(limit).all()

    # Which date each card refers to (searched date, or the slot's next occurrence).
    card_date_of = {s.id: (date or _next_date_for_day(s.day_of_week)) for s in slots}

    # Batch-fetch ALL relevant bookings in one query, then group in Python — avoids
    # the previous 2-queries-per-slot N+1 that made the homepage slow.
    bookings_by_key: dict = {}
    if slots:
        rows = (
            db.query(Booking)
            .filter(
                Booking.slot_id.in_([s.id for s in slots]),
                Booking.booking_date.in_(set(card_date_of.values())),
                Booking.status != BookingStatus.cancelled,
            )
            .all()
        )
        for b in rows:
            bookings_by_key.setdefault((b.slot_id, b.booking_date), []).append(b)

    result = []
    for slot in slots:
        card_date = card_date_of[slot.id]
        active = bookings_by_key.get((slot.id, card_date), [])
        confirmed = [b for b in active if b.status == BookingStatus.confirmed]
        booked_dates = [card_date] if _is_fully_booked(slot, confirmed) else []
        booked_ranges = [
            {
                "start": (b.start_time or slot.start_time).strftime("%H:%M"),
                "end": (b.end_time or slot.end_time).strftime("%H:%M"),
            }
            for b in active
        ]
        result.append(SlotOut(
            id=slot.id,
            venue_id=slot.venue_id,
            venue_name=slot.venue.name,
            venue_slug=slot.venue.slug,
            venue_city=slot.venue.city,
            venue_area=slot.venue.area,
            sport_id=slot.sport_id,
            day_of_week=slot.day_of_week,
            start_time=slot.start_time,
            end_time=slot.end_time,
            price=slot.price,
            is_recurring=slot.is_recurring,
            booked_dates=booked_dates,
            next_date=card_date,
            booked_ranges=booked_ranges,
            discount=discount_preview(slot.venue.discount),
        ))

    return result


@router.get("/{slot_id}/availability", response_model=SlotAvailabilityOut)
def slot_availability(slot_id: int, date: str, db: Session = Depends(get_db)):
    """Booking-modal payload: window, per-hour rate, discount and taken ranges."""
    slot = db.query(WeeklySlot).filter(WeeklySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    try:
        get_day_of_week(date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date")

    bookings = _active_bookings(db, slot_id, date)
    booked_ranges = [
        {
            "start": (b.start_time or slot.start_time).strftime("%H:%M"),
            "end": (b.end_time or slot.end_time).strftime("%H:%M"),
        }
        for b in bookings
    ]
    return SlotAvailabilityOut(
        slot_id=slot.id,
        venue_id=slot.venue_id,
        venue_name=slot.venue.name,
        sport_id=slot.sport_id,
        day_of_week=slot.day_of_week,
        window_start=slot.start_time,
        window_end=slot.end_time,
        per_hour=slot.price,
        booking_date=date,
        discount=discount_preview(slot.venue.discount),
        booked_ranges=booked_ranges,
    )


@router.get("/{slot_id}", response_model=SlotDetailOut)
def get_slot(slot_id: int, db: Session = Depends(get_db)):
    slot = db.query(WeeklySlot).filter(WeeklySlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    return slot
