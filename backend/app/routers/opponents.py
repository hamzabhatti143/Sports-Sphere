from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_
from typing import List, Optional
from app.db import get_db
from app.models import OpponentPost, User, Player, Booking, WeeklySlot
from app.schemas import OpponentPostCreate, OpponentPostOut
from app.auth import get_current_user
from app.utils import normalize_pk_whatsapp

router = APIRouter(prefix="/opponents", tags=["opponents"])


def _to_out(db: Session, post: OpponentPost) -> OpponentPostOut:
    player = db.query(Player).filter(Player.user_id == post.user_id).first()
    positions = [p for p in (post.positions or "").split(",") if p.strip() != ""]
    return OpponentPostOut(
        id=post.id,
        user_id=post.user_id,
        player_id=player.id if player else None,
        player_name=(player.full_name if player else None) or (post.user.full_name if post.user else "Player"),
        player_city=player.city if player else post.city,
        sport_id=post.sport_id,
        positions=positions,
        description=post.description,
        whatsapp=post.whatsapp,
        skill_level=post.skill_level,
        when_where=post.when_where,
        city=post.city,
        created_at=post.created_at.isoformat() if post.created_at else None,
        responses=post.views or 0,
    )


@router.post("", response_model=OpponentPostOut, status_code=201)
def create_post(req: OpponentPostCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    whatsapp = req.whatsapp or current_user.whatsapp
    if not whatsapp:
        raise HTTPException(status_code=400, detail="A WhatsApp number is required")
    whatsapp = normalize_pk_whatsapp(whatsapp)
    city = req.city or current_user.city
    post = OpponentPost(
        user_id=current_user.id,
        sport_id=req.sport_id,
        positions=",".join(req.positions),
        description=req.description,
        whatsapp=whatsapp,
        skill_level=req.skill_level,
        when_where=req.when_where,
        city=city,
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    return _to_out(db, post)


@router.get("", response_model=List[OpponentPostOut])
def list_posts(
    sport: Optional[int] = Query(None),
    city: Optional[str] = Query(None),
    position: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    skip: int = Query(0),
    limit: int = Query(50),
    db: Session = Depends(get_db),
):
    q = db.query(OpponentPost)
    if sport:
        q = q.filter(OpponentPost.sport_id == sport)
    if city:
        q = q.filter(OpponentPost.city == city)
    if position:
        q = q.filter(OpponentPost.positions.ilike(f"%{position}%"))
    if search:
        term = f"%{search}%"
        q = q.filter(or_(
            OpponentPost.description.ilike(term),
            OpponentPost.positions.ilike(term),
        ))
    posts = q.order_by(OpponentPost.created_at.desc(), OpponentPost.id.desc()).offset(skip).limit(limit).all()
    return [_to_out(db, p) for p in posts]


@router.get("/me", response_model=List[OpponentPostOut])
def my_posts(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    posts = (
        db.query(OpponentPost)
        .filter(OpponentPost.user_id == current_user.id)
        .order_by(OpponentPost.created_at.desc(), OpponentPost.id.desc())
        .all()
    )
    return [_to_out(db, p) for p in posts]


@router.get("/{post_id}", response_model=OpponentPostOut)
def get_post(post_id: int, db: Session = Depends(get_db)):
    post = db.query(OpponentPost).filter(OpponentPost.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="Post not found")
    post.views = (post.views or 0) + 1
    db.commit()
    db.refresh(post)
    return _to_out(db, post)


@router.delete("/{post_id}", status_code=204)
def delete_post(post_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    post = db.query(OpponentPost).filter(OpponentPost.id == post_id).first()
    if not post or post.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Post not found")
    db.delete(post)
    db.commit()
