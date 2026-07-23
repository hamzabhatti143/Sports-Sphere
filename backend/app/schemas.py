from pydantic import BaseModel, EmailStr, field_validator, model_validator
from typing import Optional, List, Literal
from datetime import time
from decimal import Decimal
from app.utils import normalize_pk_whatsapp

class AuthRegister(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    whatsapp: str

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, v):
        return normalize_pk_whatsapp(v)

class PositionInput(BaseModel):
    sport_id: int
    position_name: str

class RegisterRequest(BaseModel):
    """Unified registration for all 3 user types."""
    user_type: Literal["venue_owner", "player"]
    full_name: str
    email: EmailStr
    whatsapp: str
    password: str
    city: str

    # Player-only (optional)
    positions: Optional[List[PositionInput]] = None
    experience_level: Optional[str] = None
    avail_weekdays: bool = False
    avail_weekends: bool = False
    avail_evenings: bool = False
    bio: Optional[str] = None

    # Venue-owner-only (optional)
    venue_name: Optional[str] = None
    venue_address: Optional[str] = None
    sports: Optional[List[int]] = None  # sport ids the venue offers

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v):
        if len(v.strip()) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v.strip()

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, v):
        return normalize_pk_whatsapp(v)

    @model_validator(mode="after")
    def validate_conditional(self):
        if self.user_type == "venue_owner":
            if not (self.venue_name and self.venue_name.strip()):
                raise ValueError("Venue name is required for venue owners")
            if not (self.venue_address and self.venue_address.strip()):
                raise ValueError("Venue address is required for venue owners")
        return self

class AuthLogin(BaseModel):
    email: EmailStr
    password: str

class UserMeOut(BaseModel):
    id: int
    email: EmailStr
    role: str
    full_name: Optional[str] = None
    whatsapp: Optional[str] = None
    city: Optional[str] = None

    class Config:
        from_attributes = True

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    whatsapp: Optional[str] = None
    city: Optional[str] = None
    password: Optional[str] = None

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, v):
        if v is None:
            return v
        return normalize_pk_whatsapp(v)

    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if v is None:
            return v
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    user_id: Optional[int] = None
    full_name: Optional[str] = None

class VenueCreate(BaseModel):
    name: str
    city: str
    area: str
    address: str
    description: Optional[str] = None

class VenueUpdate(BaseModel):
    name: Optional[str] = None
    city: Optional[str] = None
    area: Optional[str] = None
    address: Optional[str] = None
    description: Optional[str] = None

class VenueOut(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    city: str
    area: str
    address: str
    description: Optional[str]
    owner_id: int

    class Config:
        from_attributes = True

class SlotCreate(BaseModel):
    sport_id: int
    day_of_week: int
    slot_date: Optional[str] = None
    start_time: time
    end_time: time
    price: Decimal
    is_recurring: bool = True

    @field_validator("day_of_week")
    @classmethod
    def validate_day_of_week(cls, v):
        if not 0 <= v <= 6:
            raise ValueError("day_of_week must be 0-6 (Monday-Sunday)")
        return v

    @field_validator("price")
    @classmethod
    def validate_price(cls, v):
        if v <= 0:
            raise ValueError("Price must be positive")
        return v

class SlotUpdate(BaseModel):
    sport_id: Optional[int] = None
    day_of_week: Optional[int] = None
    slot_date: Optional[str] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    price: Optional[Decimal] = None
    is_recurring: Optional[bool] = None

class SlotOut(BaseModel):
    id: int
    venue_id: int
    venue_name: Optional[str] = None
    venue_slug: Optional[str] = None
    venue_city: Optional[str] = None
    venue_area: Optional[str] = None
    sport_id: int
    day_of_week: int
    slot_date: Optional[str] = None
    start_time: time
    end_time: time
    price: Decimal
    is_recurring: bool
    booked_dates: List[str] = []  # YYYY-MM-DD format for a specific query date
    next_date: Optional[str] = None  # the date this card refers to (query date or next occurrence)
    booked_ranges: List[dict] = []  # taken sub-ranges [{start,end}] on next_date, for split display
    discount: Optional[dict] = None  # active discount preview, if any

    class Config:
        from_attributes = True

class SlotDetailOut(BaseModel):
    id: int
    venue_id: int
    sport_id: int
    day_of_week: int
    start_time: time
    end_time: time
    price: Decimal
    is_recurring: bool
    venue: VenueOut

    class Config:
        from_attributes = True

class SlotBasicOut(BaseModel):
    id: int
    venue_id: int
    sport_id: int
    day_of_week: int
    slot_date: Optional[str] = None
    start_time: time
    end_time: time
    price: Decimal
    is_recurring: bool

    class Config:
        from_attributes = True

class VenueWithSlotsOut(BaseModel):
    id: int
    name: str
    slug: Optional[str] = None
    city: str
    area: str
    address: str
    description: Optional[str]
    owner_id: int
    slots: List[SlotBasicOut] = []

    class Config:
        from_attributes = True

class CourtOut(BaseModel):
    sport_id: int
    sport_name: str
    slots: List[SlotBasicOut] = []

class VenuePublicOut(BaseModel):
    id: int
    name: str
    slug: str
    city: str
    area: str
    address: str
    description: Optional[str]
    owner_whatsapp: Optional[str] = None
    discount: Optional[dict] = None
    courts: List[CourtOut] = []

class BookingCreate(BaseModel):
    slot_id: int
    booking_date: str  # YYYY-MM-DD format
    start_time: time
    end_time: time
    booked_by_phone: str
    booked_by_name: Optional[str] = None  # falls back to the account name

    @field_validator("booked_by_phone")
    @classmethod
    def validate_phone(cls, v):
        return normalize_pk_whatsapp(v)

    @model_validator(mode="after")
    def validate_range(self):
        # end 00:00 means midnight / end-of-day, which is after any start time.
        end_min = self.end_time.hour * 60 + self.end_time.minute
        if end_min == 0:
            return self
        start_min = self.start_time.hour * 60 + self.start_time.minute
        if end_min <= start_min:
            raise ValueError("End time must be after start time")
        return self

class BookingOut(BaseModel):
    id: int
    reference: Optional[str] = None
    slot_id: int
    booked_by_name: str
    booked_by_phone: str
    booking_date: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hours: Optional[int] = None
    amount: Optional[Decimal] = None
    status: str

    class Config:
        from_attributes = True

class DiscountInfo(BaseModel):
    label: Optional[str] = None
    amount: Optional[Decimal] = None

class MyBookingOut(BaseModel):
    """A customer's own booking, enriched with venue/sport context."""
    id: int
    reference: Optional[str] = None
    slot_id: int
    venue_id: int
    venue_name: str
    venue_slug: Optional[str] = None
    venue_whatsapp: Optional[str] = None  # owner contact, for confirmed bookings
    sport_id: int
    booking_date: str
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    hours: Optional[int] = None
    amount: Optional[Decimal] = None
    status: str

class SlotAvailabilityOut(BaseModel):
    """Everything the booking modal needs for one slot on a given date."""
    slot_id: int
    venue_id: int
    venue_name: str
    sport_id: int
    day_of_week: int
    window_start: time
    window_end: time
    per_hour: Decimal
    booking_date: str
    discount: Optional[dict] = None
    booked_ranges: List[dict] = []  # [{start, end}] of existing non-cancelled bookings

# --- Discounts (venue portal, Chunk 4) ---
class DiscountUpdate(BaseModel):
    enabled: bool = False
    dtype: str = "percentage"  # "percentage" | "fixed"
    value: Decimal = Decimal(0)
    days: List[int] = [0, 1, 2, 3, 4, 5, 6]
    valid_until: Optional[str] = None

class DiscountOut(BaseModel):
    enabled: bool
    dtype: str
    value: Decimal
    days: List[int]
    valid_until: Optional[str] = None

class OwnerBookingOut(BaseModel):
    id: int
    reference: Optional[str] = None
    booking_date: str
    booked_by_name: str
    booked_by_phone: str
    status: str
    venue_id: int
    venue_name: str
    sport_id: int
    day_of_week: int
    start_time: time
    end_time: time
    hours: Optional[int] = None
    amount: Optional[Decimal] = None
    price: Decimal

class BookingStatusUpdate(BaseModel):
    status: str  # pending | confirmed | cancelled

class PlayerPositionCreate(BaseModel):
    sport_id: int
    position_name: str

class PlayerCreate(BaseModel):
    full_name: str
    phone: str
    city: str
    positions: List[PlayerPositionCreate]

    @field_validator("full_name")
    @classmethod
    def validate_name(cls, v):
        if len(v) < 2:
            raise ValueError("Name must be at least 2 characters")
        return v

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v):
        if len(v) < 10:
            raise ValueError("Phone must be at least 10 digits")
        return v

class PlayerPositionOut(BaseModel):
    sport_id: int
    position_name: str

    class Config:
        from_attributes = True

class PlayerOut(BaseModel):
    id: int
    user_id: int
    full_name: str
    phone: str
    whatsapp: Optional[str] = None
    city: str
    bio: Optional[str] = None
    experience_level: Optional[str] = None
    avail_weekdays: bool = False
    avail_weekends: bool = False
    avail_evenings: bool = False
    positions: List[PlayerPositionOut] = []
    created_at: Optional[str] = None

    class Config:
        from_attributes = True

class PlayerUpdate(BaseModel):
    full_name: Optional[str] = None
    whatsapp: Optional[str] = None
    city: Optional[str] = None
    bio: Optional[str] = None
    experience_level: Optional[str] = None
    avail_weekdays: Optional[bool] = None
    avail_weekends: Optional[bool] = None
    avail_evenings: Optional[bool] = None
    positions: Optional[List[PlayerPositionCreate]] = None

    @field_validator("whatsapp")
    @classmethod
    def validate_whatsapp(cls, v):
        if v is None:
            return v
        return normalize_pk_whatsapp(v)

# --- Opponent posts (Chunks 3, 7, 10) ---
class OpponentPostCreate(BaseModel):
    sport_id: int
    positions: List[str] = []
    description: str
    whatsapp: Optional[str] = None  # falls back to profile
    skill_level: Optional[str] = None
    when_where: Optional[str] = None
    city: Optional[str] = None

    @field_validator("description")
    @classmethod
    def validate_desc(cls, v):
        if len(v.strip()) < 5:
            raise ValueError("Please write a longer description")
        return v.strip()

class OpponentPostOut(BaseModel):
    id: int
    user_id: int
    player_id: Optional[int] = None
    player_name: str
    player_city: Optional[str] = None
    sport_id: int
    positions: List[str] = []
    description: str
    whatsapp: str
    skill_level: Optional[str] = None
    when_where: Optional[str] = None
    city: Optional[str] = None
    created_at: Optional[str] = None
    responses: int = 0

class PlayerStatsOut(BaseModel):
    total_bookings: int = 0
    upcoming_bookings: int = 0
    posts_created: int = 0
    profile_views: int = 0

class SearchParams(BaseModel):
    city: Optional[str] = None
    area: Optional[str] = None
    sport: Optional[int] = None
    date: str  # YYYY-MM-DD format
    skip: int = 0
    limit: int = 20
