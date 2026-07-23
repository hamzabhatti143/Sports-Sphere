# SportSpot Architecture & Tech Choices

## Backend: FastAPI + Uvicorn Explanation

### Why FastAPI?

FastAPI is a modern Python web framework that:
- ✅ **Async support** - Handles concurrent requests efficiently
- ✅ **Type hints** - Built-in validation with Pydantic
- ✅ **Auto docs** - Generates API docs at `/docs`
- ✅ **Fast** - Comparable to Node.js/Go for performance
- ✅ **Easy to use** - Simple decorator-based routing

```python
from fastapi import FastAPI

app = FastAPI()

@app.post("/auth/login")
def login(req: AuthLogin):
    # FastAPI auto-validates req against AuthLogin schema
    return {"token": "..."}
```

### Uvicorn: The Application Server

**What is Uvicorn?**

Uvicorn is an ASGI (Asynchronous Server Gateway Interface) server that:
- Runs your FastAPI application
- Handles HTTP requests/responses
- Manages connections

**The Flow:**
```
Client (Browser)
    ↓
HTTP Request
    ↓
Uvicorn Server (port 8000)
    ↓
FastAPI Application (main.py)
    ↓
Your Code (routers, handlers)
    ↓
HTTP Response
    ↓
Client (Browser)
```

### `python main.py` vs `uvicorn main:app --reload`

**Option 1: `python main.py`**
```python
# In backend/main.py:
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
    # This starts uvicorn internally
```

Pros:
- ✅ Simple - One command
- ✅ Works fine for production

Cons:
- ❌ No auto-reload on code changes
- ❌ Must manually restart server to see changes
- ❌ Less control over settings

**Option 2: `uvicorn main:app --reload`** (Recommended for Development)
```bash
# Directly runs uvicorn with options
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Pros:
- ✅ **Auto-reload** - Detects code changes instantly
- ✅ **Faster development** - No manual restarts
- ✅ **Flexible** - Can change port, workers, host
- ✅ **Standard approach** - Industry best practice

Cons:
- ❌ None for development!

**Why recommend Uvicorn directly?**

When you're developing, you want:
1. Change code
2. See changes immediately
3. Repeat

With `uvicorn --reload`:
```
┌─────────────────────────────┐
│ You edit main.py            │
│         ↓                   │
│ Uvicorn detects change      │
│         ↓                   │
│ Server restarts instantly   │
│         ↓                   │
│ Changes live on localhost   │
└─────────────────────────────┘
```

Without `--reload`:
```
┌──────────────────────────────────┐
│ You edit main.py                 │
│         ↓                        │
│ Nothing happens!                 │
│         ↓                        │
│ You manually stop server (Ctrl+C)│
│         ↓                        │
│ You restart server (python main) │
│         ↓                        │
│ Changes live on localhost        │
└──────────────────────────────────┘
```

---

## Database: SQLAlchemy + Alembic

### SQLAlchemy (ORM)

Object-Relational Mapping lets you write Python code instead of raw SQL:

**Without SQLAlchemy (Raw SQL):**
```sql
SELECT * FROM users WHERE email = 'user@example.com';
UPDATE venues SET name = 'New Name' WHERE id = 1;
INSERT INTO bookings (slot_id, booking_date, ...) VALUES (1, '2026-01-01', ...);
```

**With SQLAlchemy (Python):**
```python
user = db.query(User).filter(User.email == 'user@example.com').first()
venue = db.query(Venue).filter(Venue.id == 1).first()
venue.name = 'New Name'
db.commit()

booking = Booking(slot_id=1, booking_date='2026-01-01', ...)
db.add(booking)
db.commit()
```

Benefits:
- ✅ Type-safe (Python objects)
- ✅ Cross-database (PostgreSQL, SQLite, MySQL)
- ✅ Relationships (user.venues, venue.slots)
- ✅ Less error-prone than raw SQL

### Alembic (Migrations)

Alembic manages database schema changes:

**Problem it solves:**
```
Dev 1: "I added a 'phone' column to players table"
Dev 2: "I added a 'address' column too"

When deploying:
- Production database needs both changes
- But in what order?
- What if deployment fails halfway?
```

**Alembic's solution:**
```bash
# Each change is a timestamped migration file
2026010101_add_phone_to_players.py
2026010102_add_address_to_players.py

# Run them in order, automatically
python -m alembic upgrade head
```

Benefits:
- ✅ Version control for database
- ✅ Rollback capability
- ✅ Automatic schema updates
- ✅ Works with any database

---

## Frontend: Next.js 15

### Why Next.js?

Next.js is a React framework that provides:
- ✅ **File-based routing** - `app/page.tsx` = `/`
- ✅ **Server components** - Reduce JavaScript sent to browser
- ✅ **Built-in optimization** - Images, fonts, bundles
- ✅ **API routes** - Optional backend endpoints
- ✅ **TypeScript** - Type safety by default
- ✅ **Tailwind CSS** - Utility-first CSS framework

### App Router vs Pages Router

**We use App Router (newer, recommended):**
```
frontend/app/
├── page.tsx              # / (homepage)
├── venues/
│   ├── login/page.tsx    # /venues/login
│   ├── register/page.tsx # /venues/register
│   └── dashboard/page.tsx# /venues/dashboard
├── players/
│   ├── page.tsx          # /players
│   └── register/page.tsx # /players/register
└── book/
    └── [slotId]/page.tsx # /book/:slotId (dynamic)
```

Benefits:
- ✅ More intuitive folder structure
- ✅ Better performance with server components
- ✅ Simpler data fetching patterns

---

## Authentication: JWT

### How JWT Works

**Traditional (Session-based):**
```
1. User logs in
2. Server creates session, stores in database
3. Sends session ID to client
4. Client sends session ID with requests
5. Server looks up session in database each time
```

**JWT (Token-based):**
```
1. User logs in (email/password)
2. Server creates signed token containing user info
3. Sends token to client (encrypted in token)
4. Client sends token with requests
5. Server verifies token signature (no database lookup needed)
```

### JWT Advantages

- ✅ **Stateless** - No server session storage needed
- ✅ **Scalable** - Multiple servers can verify token independently
- ✅ **Mobile-friendly** - Easy to store on mobile
- ✅ **Cross-domain** - Works across different domains

### Token Structure
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.
eyJzdWIiOjEsInJvbGUiOiJ2ZW51ZV9vd25lciIsImV4cCI6MTcyNTI4MDAwMH0.
signature_here

Header.Payload.Signature
```

---

## API Design: REST

### REST Principles

Our API follows REST (Representational State Transfer):

```
POST   /venues              # Create venue
GET    /venues/me           # Get my venues
POST   /venues/{id}/slots   # Create slot for venue
PUT    /venues/{id}/slots/{slotId}   # Update slot
DELETE /venues/{id}/slots/{slotId}   # Delete slot

GET    /slots/search        # Search slots (public)
POST   /bookings            # Create booking (public)

GET    /players             # Get players (public)
POST   /players             # Register player
```

HTTP Methods:
- **GET** - Read/retrieve data
- **POST** - Create new resource
- **PUT** - Update existing resource
- **DELETE** - Remove resource

Status Codes:
- **200** - Success
- **201** - Created
- **400** - Bad request (validation error)
- **401** - Unauthorized (not logged in)
- **403** - Forbidden (no permission)
- **404** - Not found
- **409** - Conflict (e.g., double booking)
- **500** - Server error

---

## Data Validation

### Backend: Pydantic

```python
from pydantic import BaseModel, field_validator, EmailStr

class AuthRegister(BaseModel):
    email: EmailStr  # Validates email format
    password: str
    
    @field_validator("password")
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters")
        return v
```

Benefits:
- ✅ Automatic validation on request
- ✅ Clear error messages
- ✅ Type hints integrated with validation

### Frontend: HTML5 + TypeScript

```typescript
<input
    type="email"              // HTML5 validation
    required
    minLength={2}
    value={name}
    onChange={(e) => setName(e.target.value)}
/>
```

Benefits:
- ✅ Native browser validation
- ✅ Better UX (quick feedback)
- ✅ TypeScript catches type errors at build time

---

## Error Handling Strategy

### Backend

```python
try:
    booking = Booking(...)
    db.add(booking)
    db.commit()  # May raise IntegrityError if duplicate
except IntegrityError:
    # Database constraint violation (double booking)
    return JSONResponse(
        status_code=409,
        content={"detail": "This slot is already booked"}
    )
```

### Frontend

```typescript
try {
    await api.bookings.create(data);
    showToast('Booked successfully', 'success');
} catch (error) {
    if (error.message.includes('already booked')) {
        showToast('Slot taken! Try another time.', 'error');
    } else {
        showToast(error.message, 'error');
    }
}
```

Benefits:
- ✅ Graceful error handling
- ✅ User-friendly messages
- ✅ Proper HTTP status codes

---

## Development vs Production

### Development
```bash
# Backend
uvicorn main:app --reload          # Auto-restart on changes

# Frontend  
npm run dev                        # Hot module reload
```

### Production
```bash
# Backend
uvicorn main:app --workers 4       # Multiple workers for load

# Frontend
npm run build && npm start         # Optimized, minified output
```

---

## Database Choices

### SQLite (Development) ✅
```
DATABASE_URL=sqlite:///./sportspot.db
```
- ✅ No setup needed
- ✅ File-based (no server)
- ✅ Great for development
- ❌ Not for production (single connection)

### PostgreSQL (Production) ✅
```
DATABASE_URL=postgresql://user:pass@localhost/sportspot
```
- ✅ Multi-user safe
- ✅ Concurrent connections
- ✅ Transactions
- ✅ Scaling ready

---

## Summary

| Component | Why | How |
|-----------|-----|-----|
| **FastAPI** | Modern, fast Python framework | Decorators define endpoints |
| **Uvicorn** | ASGI server for production-ready performance | `uvicorn main:app --reload` |
| **SQLAlchemy** | Type-safe database ORM | Python objects instead of SQL |
| **Alembic** | Database version control | Timestamped migration files |
| **Next.js** | React framework with routing, optimization | File-based app directory |
| **JWT** | Stateless authentication | Signed tokens instead of sessions |
| **TypeScript** | Type safety | Catch errors before runtime |
| **Tailwind CSS** | Utility-first CSS | Responsive mobile-first design |

All choices prioritize:
- 🎯 **Developer Experience** - Easy to work with
- ⚡ **Performance** - Fast for users
- 🔒 **Security** - Secure by default
- 📈 **Scalability** - Ready to grow
