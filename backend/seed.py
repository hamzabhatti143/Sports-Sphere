from sqlalchemy.orm import Session
from app.db import SessionLocal, engine, Base
from app.models import User, Sport, Venue, VenueSport, WeeklySlot, UserRole
from app.auth import hash_password
from datetime import time
from decimal import Decimal

Base.metadata.create_all(bind=engine)

db = SessionLocal()

sports_data = [
    "Futsal",
    "Cricket",
    "Badminton",
    "Padel",
    "Table Tennis"
]

for sport_name in sports_data:
    existing = db.query(Sport).filter(Sport.name == sport_name).first()
    if not existing:
        sport = Sport(name=sport_name)
        db.add(sport)

db.commit()

user1 = db.query(User).filter(User.email == "owner1@sportspot.com").first()
if not user1:
    user1 = User(
        email="owner1@sportspot.com",
        password_hash=hash_password("password123"),
        role=UserRole.venue_owner
    )
    db.add(user1)
    db.commit()

user2 = db.query(User).filter(User.email == "owner2@sportspot.com").first()
if not user2:
    user2 = User(
        email="owner2@sportspot.com",
        password_hash=hash_password("password123"),
        role=UserRole.venue_owner
    )
    db.add(user2)
    db.commit()

venue1 = db.query(Venue).filter(Venue.name == "Karachi Sports Hub").first()
if not venue1:
    venue1 = Venue(
        owner_id=user1.id,
        name="Karachi Sports Hub",
        slug="karachi-sports-hub",
        city="Karachi",
        area="Defence",
        address="123 Sports Street, Defence, Karachi",
        description="Premier sports facility with multiple courts"
    )
    db.add(venue1)
    db.commit()

    futsal = db.query(Sport).filter(Sport.name == "Futsal").first()
    badminton = db.query(Sport).filter(Sport.name == "Badminton").first()

    if futsal:
        vs = VenueSport(venue_id=venue1.id, sport_id=futsal.id)
        db.add(vs)
    if badminton:
        vs = VenueSport(venue_id=venue1.id, sport_id=badminton.id)
        db.add(vs)

    db.commit()

    if futsal:
        # Add futsal slots for multiple days
        for day in [0, 2, 4]:  # Monday, Wednesday, Friday
            slot = WeeklySlot(
                venue_id=venue1.id,
                sport_id=futsal.id,
                day_of_week=day,
                start_time=time(18, 0),
                end_time=time(19, 0),
                price=Decimal("500"),
                is_recurring=True
            )
            db.add(slot)

    if badminton:
        # Add badminton slots for multiple days
        for day in [1, 3, 5]:  # Tuesday, Thursday, Saturday
            slot = WeeklySlot(
                venue_id=venue1.id,
                sport_id=badminton.id,
                day_of_week=day,
                start_time=time(16, 0),
                end_time=time(17, 0),
                price=Decimal("300"),
                is_recurring=True
            )
            db.add(slot)

    db.commit()

venue2 = db.query(Venue).filter(Venue.name == "Lahore Games Arena").first()
if not venue2:
    venue2 = Venue(
        owner_id=user2.id,
        name="Lahore Games Arena",
        slug="lahore-games-arena",
        city="Lahore",
        area="Gulberg",
        address="456 Game Avenue, Gulberg, Lahore",
        description="Indoor gaming and sports complex"
    )
    db.add(venue2)
    db.commit()

    cricket = db.query(Sport).filter(Sport.name == "Cricket").first()
    table_tennis = db.query(Sport).filter(Sport.name == "Table Tennis").first()

    if cricket:
        vs = VenueSport(venue_id=venue2.id, sport_id=cricket.id)
        db.add(vs)
    if table_tennis:
        vs = VenueSport(venue_id=venue2.id, sport_id=table_tennis.id)
        db.add(vs)

    db.commit()

    if cricket:
        # Add cricket slots for multiple days
        for day in [1, 3, 5]:  # Tuesday, Thursday, Saturday
            slot = WeeklySlot(
                venue_id=venue2.id,
                sport_id=cricket.id,
                day_of_week=day,
                start_time=time(17, 0),
                end_time=time(19, 0),
                price=Decimal("1000"),
                is_recurring=True
            )
            db.add(slot)

    if table_tennis:
        # Add table tennis slots for multiple days
        for day in [0, 2, 4, 6]:  # Monday, Wednesday, Friday, Sunday
            slot = WeeklySlot(
                venue_id=venue2.id,
                sport_id=table_tennis.id,
                day_of_week=day,
                start_time=time(19, 0),
                end_time=time(20, 0),
                price=Decimal("200"),
                is_recurring=True
            )
            db.add(slot)

    db.commit()

print("Seed script completed!")
db.close()
