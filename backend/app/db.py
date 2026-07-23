from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool
from dotenv import load_dotenv
import os

# Load .env from the backend root (one level up from this app/ package),
# regardless of the current working directory uvicorn is launched from.
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./sportspot.db")

if "sqlite" in DATABASE_URL:
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
else:
    # Neon / serverless Postgres drops idle connections, which leaves stale
    # sockets in the pool and causes "SSL connection has been closed
    # unexpectedly". pool_pre_ping validates a connection before use (and
    # transparently reconnects if it's dead); pool_recycle proactively
    # discards connections older than the recycle window.
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        pool_recycle=300,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
