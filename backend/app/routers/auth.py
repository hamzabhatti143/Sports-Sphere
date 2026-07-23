from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.db import get_db
from app.models import (
    User, UserRole, Player, PlayerPosition, Venue, VenueSport, Sport,
)
from app.schemas import AuthRegister, AuthLogin, TokenResponse, RegisterRequest, UserMeOut, UserUpdate
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.utils import make_unique_slug
from datetime import timedelta

router = APIRouter(prefix="/auth", tags=["auth"])

ROLE_BY_TYPE = {
    "venue_owner": UserRole.venue_owner,
    "player": UserRole.player,
    # 'general' (Book Slots Only) removed — those users are now Individual Players.
    "general": UserRole.player,
}

def _issue_token(user: User) -> dict:
    access_token = create_access_token(
        data={"sub": str(user.id), "role": user.role, "name": user.full_name or ""},
        expires_delta=timedelta(minutes=60),
    )
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value if hasattr(user.role, "value") else user.role,
        "user_id": user.id,
        "full_name": user.full_name,
    }

@router.post("/register", response_model=TokenResponse)
async def register(req: RegisterRequest, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=ROLE_BY_TYPE[req.user_type],
        full_name=req.full_name,
        whatsapp=req.whatsapp,
        city=req.city,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    if req.user_type in ("player", "general"):
        player = Player(
            user_id=user.id,
            full_name=req.full_name,
            phone=req.whatsapp,
            city=req.city,
            experience_level=req.experience_level,
            avail_weekdays=req.avail_weekdays,
            avail_weekends=req.avail_weekends,
            avail_evenings=req.avail_evenings,
            bio=req.bio,
        )
        db.add(player)
        db.commit()
        db.refresh(player)
        for pos in (req.positions or []):
            db.add(PlayerPosition(
                player_id=player.id,
                sport_id=pos.sport_id,
                position_name=pos.position_name,
            ))
        db.commit()

    elif req.user_type == "venue_owner":
        venue = Venue(
            owner_id=user.id,
            name=req.venue_name,
            slug=make_unique_slug(db, req.venue_name, Venue),
            city=req.city,
            area=req.city,  # owner can refine area later in venue profile
            address=req.venue_address,
        )
        db.add(venue)
        db.commit()
        db.refresh(venue)
        for sid in (req.sports or []):
            if db.query(Sport).filter(Sport.id == sid).first():
                db.add(VenueSport(venue_id=venue.id, sport_id=sid))
        db.commit()

    return _issue_token(user)

@router.post("/register-venue-owner", response_model=TokenResponse)
async def register_venue_owner(req: AuthRegister, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == req.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        role=UserRole.venue_owner,
        full_name=req.full_name,
        whatsapp=req.whatsapp,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return _issue_token(user)

@router.post("/login", response_model=TokenResponse)
async def login(req: AuthLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    return _issue_token(user)

@router.get("/me", response_model=UserMeOut)
async def me(current_user: User = Depends(get_current_user)):
    role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    return UserMeOut(
        id=current_user.id, email=current_user.email, role=role,
        full_name=current_user.full_name, whatsapp=current_user.whatsapp, city=current_user.city,
    )

@router.patch("/me", response_model=UserMeOut)
async def update_me(req: UserUpdate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    if req.full_name is not None:
        current_user.full_name = req.full_name
    if req.whatsapp is not None:
        current_user.whatsapp = req.whatsapp
    if req.city is not None:
        current_user.city = req.city
    if req.password:
        current_user.password_hash = hash_password(req.password)
    db.commit()
    db.refresh(current_user)
    role = current_user.role.value if hasattr(current_user.role, "value") else current_user.role
    return UserMeOut(
        id=current_user.id, email=current_user.email, role=role,
        full_name=current_user.full_name, whatsapp=current_user.whatsapp, city=current_user.city,
    )
