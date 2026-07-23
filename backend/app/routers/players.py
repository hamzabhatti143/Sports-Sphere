from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload, joinedload
from datetime import date
from app.db import get_db
from app.models import (
    Player, PlayerPosition, User, OpponentPost, Booking, WeeklySlot, BookingStatus,
)
from app.schemas import PlayerCreate, PlayerOut, PlayerUpdate, PlayerStatsOut, PlayerPositionOut
from app.auth import get_current_user
from app.utils import normalize_pk_whatsapp
from typing import List, Optional

router = APIRouter(prefix="/players", tags=["players"])


def player_to_out(player: Player, positions=None) -> PlayerOut:
    poss = positions if positions is not None else player.positions
    return PlayerOut(
        id=player.id,
        user_id=player.user_id,
        full_name=player.full_name,
        phone=player.phone,
        whatsapp=(player.user.whatsapp if player.user and player.user.whatsapp else player.phone),
        city=player.city,
        bio=player.bio,
        experience_level=player.experience_level,
        avail_weekdays=bool(player.avail_weekdays),
        avail_weekends=bool(player.avail_weekends),
        avail_evenings=bool(player.avail_evenings),
        positions=[PlayerPositionOut(sport_id=p.sport_id, position_name=p.position_name) for p in poss],
        created_at=player.created_at.isoformat() if player.created_at else None,
    )


@router.post("", response_model=PlayerOut)
def create_player(req: PlayerCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    existing_player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if existing_player:
        raise HTTPException(status_code=400, detail="Player profile already exists for this user")

    player = Player(
        user_id=current_user.id,
        full_name=req.full_name,
        phone=req.phone,
        city=req.city,
    )
    db.add(player)
    db.commit()
    db.refresh(player)

    for pos in req.positions:
        db.add(PlayerPosition(player_id=player.id, sport_id=pos.sport_id, position_name=pos.position_name))
    db.commit()
    db.refresh(player)
    return player_to_out(player)


@router.get("", response_model=List[PlayerOut])
def get_players(
    sport: Optional[int] = Query(None),
    position: Optional[str] = Query(None),
    city: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    # Eager-load positions + user so we don't lazy-load them per player (N+1).
    query = db.query(Player).options(selectinload(Player.positions), joinedload(Player.user))
    if city:
        query = query.filter(Player.city == city)
    players = query.offset(skip).limit(limit).all()

    result = []
    for player in players:
        positions = list(player.positions)
        if sport:
            positions = [p for p in positions if p.sport_id == sport]
        if position:
            positions = [p for p in positions if p.position_name == position]
        if (sport or position) and not positions:
            continue
        if search:
            term = search.lower()
            haystack = " ".join([
                player.full_name or "", player.city or "", player.bio or "",
                " ".join(p.position_name for p in player.positions),
            ]).lower()
            if term not in haystack:
                continue
        result.append(player_to_out(player, positions))
    return result


@router.get("/me", response_model=PlayerOut)
def get_my_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")
    return player_to_out(player)


@router.put("/me", response_model=PlayerOut)
def update_my_profile(req: PlayerUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.user_id == current_user.id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player profile not found")

    if req.full_name is not None:
        player.full_name = req.full_name
        current_user.full_name = req.full_name
    if req.city is not None:
        player.city = req.city
        current_user.city = req.city
    if req.whatsapp is not None:
        player.phone = req.whatsapp
        current_user.whatsapp = req.whatsapp
    if req.bio is not None:
        player.bio = req.bio
    if req.experience_level is not None:
        player.experience_level = req.experience_level
    if req.avail_weekdays is not None:
        player.avail_weekdays = req.avail_weekdays
    if req.avail_weekends is not None:
        player.avail_weekends = req.avail_weekends
    if req.avail_evenings is not None:
        player.avail_evenings = req.avail_evenings

    if req.positions is not None:
        db.query(PlayerPosition).filter(PlayerPosition.player_id == player.id).delete()
        for pos in req.positions:
            db.add(PlayerPosition(player_id=player.id, sport_id=pos.sport_id, position_name=pos.position_name))

    db.commit()
    db.refresh(player)
    return player_to_out(player)


@router.get("/me/stats", response_model=PlayerStatsOut)
def my_stats(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    today = date.today().isoformat()
    total = db.query(Booking).filter(Booking.user_id == current_user.id).count()
    upcoming = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id, Booking.booking_date >= today, Booking.status != BookingStatus.cancelled)
        .count()
    )
    posts = db.query(OpponentPost).filter(OpponentPost.user_id == current_user.id).all()
    return PlayerStatsOut(
        total_bookings=total,
        upcoming_bookings=upcoming,
        posts_created=len(posts),
        profile_views=sum(p.views or 0 for p in posts),
    )


@router.get("/{player_id}", response_model=PlayerOut)
def get_player(player_id: int, db: Session = Depends(get_db)):
    player = db.query(Player).filter(Player.id == player_id).first()
    if not player:
        raise HTTPException(status_code=404, detail="Player not found")
    return player_to_out(player)
