from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Enum, Time, Boolean, UniqueConstraint, Index, Numeric
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db import Base
from datetime import datetime, time
import enum

class UserRole(str, enum.Enum):
    venue_owner = "venue_owner"
    player = "player"
    admin = "admin"

class BookingStatus(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    # Written by the WhatsApp bot (playzone-agents) when payment verification fails;
    # the DB's Postgres `bookingstatus` enum already has this value (added by the
    # bot's migrate.js). It must be listed here or the ORM raises LookupError when
    # loading such a booking row. Treated as "not confirmed" everywhere in this app.
    payment_failed = "payment_failed"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(Enum(UserRole), default=UserRole.player)
    full_name = Column(String, nullable=True)
    whatsapp = Column(String, nullable=True)  # normalized local format 03XXXXXXXXX
    city = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    venues = relationship("Venue", back_populates="owner")
    player = relationship("Player", back_populates="user", uselist=False)

class Venue(Base):
    __tablename__ = "venues"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String, nullable=False)
    slug = Column(String, unique=True, index=True)
    city = Column(String, nullable=False, index=True)
    area = Column(String, nullable=False, index=True)
    address = Column(String, nullable=False)
    description = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    owner = relationship("User", back_populates="venues")
    sports = relationship("VenueSport", back_populates="venue", cascade="all, delete-orphan")
    slots = relationship("WeeklySlot", back_populates="venue", cascade="all, delete-orphan")
    discount = relationship("Discount", back_populates="venue", uselist=False, cascade="all, delete-orphan")

class Sport(Base):
    __tablename__ = "sports"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)

    venue_sports = relationship("VenueSport", back_populates="sport")
    slots = relationship("WeeklySlot", back_populates="sport")
    player_positions = relationship("PlayerPosition", back_populates="sport")

class VenueSport(Base):
    __tablename__ = "venue_sports"

    venue_id = Column(Integer, ForeignKey("venues.id"), primary_key=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), primary_key=True)

    venue = relationship("Venue", back_populates="sports")
    sport = relationship("Sport", back_populates="venue_sports")

class WeeklySlot(Base):
    __tablename__ = "weekly_slots"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    day_of_week = Column(Integer, nullable=False)  # 0=Monday, 6=Sunday
    slot_date = Column(String, nullable=True)  # YYYY-MM-DD the owner picked (day_of_week is derived from it)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    price = Column(Numeric(10, 2), nullable=False)
    is_recurring = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())

    venue = relationship("Venue", back_populates="slots")
    sport = relationship("Sport", back_populates="slots")
    bookings = relationship("Booking", back_populates="slot", cascade="all, delete-orphan")

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    slot_id = Column(Integer, ForeignKey("weekly_slots.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True, index=True)  # account that booked
    reference = Column(String, unique=True, index=True)  # human-friendly booking ref
    booked_by_name = Column(String, nullable=False)
    booked_by_phone = Column(String, nullable=False)
    booking_date = Column(String, nullable=False)  # YYYY-MM-DD format
    start_time = Column(Time, nullable=True)   # the booked sub-range within the slot window
    end_time = Column(Time, nullable=True)
    hours = Column(Integer, nullable=True)
    amount = Column(Numeric(10, 2), nullable=True)  # final amount after any discount
    status = Column(Enum(BookingStatus), default=BookingStatus.pending)
    created_at = Column(DateTime, server_default=func.now())

    slot = relationship("WeeklySlot", back_populates="bookings")
    user = relationship("User")

class Player(Base):
    __tablename__ = "players"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    full_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    city = Column(String, nullable=False)
    experience_level = Column(String, nullable=True)  # Beginner / Intermediate / Advanced
    avail_weekdays = Column(Boolean, default=False)
    avail_weekends = Column(Boolean, default=False)
    avail_evenings = Column(Boolean, default=False)
    bio = Column(String, nullable=True)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User", back_populates="player")
    positions = relationship("PlayerPosition", back_populates="player", cascade="all, delete-orphan")

class Discount(Base):
    __tablename__ = "discounts"

    id = Column(Integer, primary_key=True, index=True)
    venue_id = Column(Integer, ForeignKey("venues.id"), nullable=False, unique=True)
    enabled = Column(Boolean, default=False)
    dtype = Column(String, default="percentage")  # "percentage" | "fixed"
    value = Column(Numeric(10, 2), default=0)      # 10 (%) or 500 (PKR)
    days = Column(String, default="0,1,2,3,4,5,6")  # csv of applicable day-of-week ints
    valid_until = Column(String, nullable=True)     # YYYY-MM-DD optional expiry
    created_at = Column(DateTime, server_default=func.now())

    venue = relationship("Venue", back_populates="discount")

class PlayerPosition(Base):
    __tablename__ = "player_positions"

    id = Column(Integer, primary_key=True, index=True)
    player_id = Column(Integer, ForeignKey("players.id"), nullable=False)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    position_name = Column(String, nullable=False)

    player = relationship("Player", back_populates="positions")
    sport = relationship("Sport", back_populates="player_positions")

class OpponentPost(Base):
    __tablename__ = "opponent_posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    sport_id = Column(Integer, ForeignKey("sports.id"), nullable=False)
    positions = Column(String, nullable=True)   # csv of position names needed
    description = Column(String, nullable=False)
    city = Column(String, nullable=True, index=True)
    whatsapp = Column(String, nullable=False)
    skill_level = Column(String, nullable=True)  # Beginner / Intermediate / Advanced
    when_where = Column(String, nullable=True)
    views = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

    user = relationship("User")
