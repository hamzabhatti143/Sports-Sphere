from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import User, Venue, VenueSport, WeeklySlot, Sport, Discount
from app.schemas import (
    VenueCreate, VenueOut, VenueUpdate, SlotCreate, SlotUpdate, SlotOut,
    VenueWithSlotsOut, VenuePublicOut, CourtOut, SlotBasicOut,
    DiscountOut, DiscountUpdate,
)
from app.auth import require_owner
from app.utils import make_unique_slug
from app.pricing import discount_preview
from decimal import Decimal
from typing import List

router = APIRouter(prefix="/venues", tags=["venues"])

@router.post("", response_model=VenueOut)
async def create_venue(req: VenueCreate, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = Venue(
        owner_id=owner.id,
        name=req.name,
        slug=make_unique_slug(db, req.name, Venue),
        city=req.city,
        area=req.area,
        address=req.address,
        description=req.description
    )
    db.add(venue)
    db.commit()
    db.refresh(venue)
    return venue

@router.get("/slug/{slug}", response_model=VenuePublicOut)
async def get_venue_by_slug(slug: str, db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.slug == slug).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found")

    slots = db.query(WeeklySlot).filter(WeeklySlot.venue_id == venue.id).all()
    vsports = db.query(VenueSport).filter(VenueSport.venue_id == venue.id).all()
    sport_names = {s.id: s.name for s in db.query(Sport).all()}

    # Courts = the sports this venue offers (from venue_sports + any sport that has slots)
    court_sport_ids = sorted({vs.sport_id for vs in vsports} | {s.sport_id for s in slots})

    courts = []
    for sid in court_sport_ids:
        court_slots = [SlotBasicOut.model_validate(s) for s in slots if s.sport_id == sid]
        courts.append(CourtOut(
            sport_id=sid,
            sport_name=sport_names.get(sid, f"Sport {sid}"),
            slots=court_slots,
        ))

    return VenuePublicOut(
        id=venue.id,
        name=venue.name,
        slug=venue.slug,
        city=venue.city,
        area=venue.area,
        address=venue.address,
        description=venue.description,
        owner_whatsapp=venue.owner.whatsapp if venue.owner else None,
        discount=discount_preview(venue.discount),
        courts=courts,
    )

@router.get("/me", response_model=List[VenueWithSlotsOut])
async def get_my_venues(owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venues = db.query(Venue).filter(Venue.owner_id == owner.id).all()
    return venues

@router.get("/{venue_id}", response_model=VenueWithSlotsOut)
async def get_venue(venue_id: int, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")
    return venue

@router.put("/{venue_id}", response_model=VenueOut)
async def update_venue(venue_id: int, req: VenueUpdate, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")

    updates = req.model_dump(exclude_unset=True)
    for field, value in updates.items():
        setattr(venue, field, value)

    # Keep the slug in sync if the name changed.
    if "name" in updates and updates["name"]:
        venue.slug = make_unique_slug(db, venue.name, Venue, exclude_id=venue.id)

    db.commit()
    db.refresh(venue)
    return venue

@router.delete("/{venue_id}", status_code=204)
async def delete_venue(venue_id: int, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")

    db.delete(venue)  # cascades to slots and their bookings
    db.commit()

def _discount_to_out(d: Discount) -> DiscountOut:
    return DiscountOut(
        enabled=d.enabled,
        dtype=d.dtype,
        value=d.value or Decimal(0),
        days=[int(x) for x in (d.days or "").split(",") if x.strip() != ""],
        valid_until=d.valid_until,
    )


@router.get("/{venue_id}/discount", response_model=DiscountOut)
async def get_discount(venue_id: int, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")
    if not venue.discount:
        return DiscountOut(enabled=False, dtype="percentage", value=Decimal(0),
                           days=[0, 1, 2, 3, 4, 5, 6], valid_until=None)
    return _discount_to_out(venue.discount)


@router.put("/{venue_id}/discount", response_model=DiscountOut)
async def upsert_discount(venue_id: int, req: DiscountUpdate, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")
    if req.dtype not in ("percentage", "fixed"):
        raise HTTPException(status_code=400, detail="Invalid discount type")

    discount = venue.discount or Discount(venue_id=venue.id)
    discount.enabled = req.enabled
    discount.dtype = req.dtype
    discount.value = req.value
    discount.days = ",".join(str(d) for d in req.days)
    discount.valid_until = req.valid_until or None
    if not discount.id:
        db.add(discount)
    db.commit()
    db.refresh(discount)
    return _discount_to_out(discount)


@router.post("/{venue_id}/slots", response_model=SlotOut)
async def create_slot(venue_id: int, req: SlotCreate, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")

    sport = db.query(Sport).filter(Sport.id == req.sport_id).first()
    if not sport:
        raise HTTPException(status_code=404, detail="Sport not found")

    venue_sport = db.query(VenueSport).filter(
        VenueSport.venue_id == venue_id,
        VenueSport.sport_id == req.sport_id
    ).first()
    if not venue_sport:
        venue_sport = VenueSport(venue_id=venue_id, sport_id=req.sport_id)
        db.add(venue_sport)

    slot = WeeklySlot(
        venue_id=venue_id,
        sport_id=req.sport_id,
        day_of_week=req.day_of_week,
        slot_date=req.slot_date,
        start_time=req.start_time,
        end_time=req.end_time,
        price=req.price,
        is_recurring=req.is_recurring
    )
    db.add(slot)
    db.commit()
    db.refresh(slot)
    return slot

@router.put("/{venue_id}/slots/{slot_id}", response_model=SlotOut)
async def update_slot(venue_id: int, slot_id: int, req: SlotUpdate, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")

    slot = db.query(WeeklySlot).filter(WeeklySlot.id == slot_id, WeeklySlot.venue_id == venue_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    if req.sport_id is not None:
        slot.sport_id = req.sport_id
    if req.day_of_week is not None:
        slot.day_of_week = req.day_of_week
    if req.slot_date is not None:
        slot.slot_date = req.slot_date
    if req.start_time is not None:
        slot.start_time = req.start_time
    if req.end_time is not None:
        slot.end_time = req.end_time
    if req.price is not None:
        slot.price = req.price
    if req.is_recurring is not None:
        slot.is_recurring = req.is_recurring

    db.commit()
    db.refresh(slot)
    return slot

@router.delete("/{venue_id}/slots/{slot_id}", status_code=204)
async def delete_slot(venue_id: int, slot_id: int, owner: User = Depends(require_owner), db: Session = Depends(get_db)):
    venue = db.query(Venue).filter(Venue.id == venue_id, Venue.owner_id == owner.id).first()
    if not venue:
        raise HTTPException(status_code=404, detail="Venue not found or you don't have access")

    slot = db.query(WeeklySlot).filter(WeeklySlot.id == slot_id, WeeklySlot.venue_id == venue_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")

    db.delete(slot)
    db.commit()
