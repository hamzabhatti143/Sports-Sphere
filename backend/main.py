from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from sqlalchemy.exc import IntegrityError
from app.db import engine, Base
from app.routers import auth, venues, slots, bookings, players, opponents
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="SportSpot API", version="1.0.0")

# Allowed browser origins. Local dev defaults, plus any comma-separated URLs from
# the CORS_ORIGINS env var (set your deployed frontend URL there on Render), and
# any *.vercel.app deployment via regex.
_default_origins = "http://localhost:3000,http://localhost:3001,http://127.0.0.1:3000"
origins = [o.strip() for o in os.getenv("CORS_ORIGINS", _default_origins).split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(IntegrityError)
async def integrity_error_handler(request, exc):
    if "uq_slot_date" in str(exc):
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={"detail": "This slot is already booked for the given date"}
        )
    return JSONResponse(
        status_code=status.HTTP_400_BAD_REQUEST,
        content={"detail": "Database constraint violation"}
    )

@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request, exc):
    # Pydantic includes the raw exception object under `ctx` for ValueError-based
    # validators, which is not JSON-serializable. Stringify ctx values so the
    # response can be encoded, and surface the first message as a readable detail.
    errors = []
    for err in exc.errors():
        err = dict(err)
        if "ctx" in err:
            err["ctx"] = {k: str(v) for k, v in err["ctx"].items()}
        errors.append(err)
    summary = errors[0].get("msg", "Validation error") if errors else "Validation error"
    if isinstance(summary, str):
        summary = summary.replace("Value error, ", "")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": summary, "errors": errors},
    )

app.include_router(auth.router)
app.include_router(venues.router)
app.include_router(slots.router)
app.include_router(bookings.router)
app.include_router(players.router)
app.include_router(opponents.router)

@app.get("/")
def read_root():
    return {"message": "SportSpot API running"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
