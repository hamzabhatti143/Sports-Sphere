# SportSpot - Getting Started Guide

## 📚 Documentation Files

After the command file, here's what was created:

| File | Purpose |
|------|---------|
| **RUN.md** | How to run the app with scripts and venv |
| **ARCHITECTURE.md** | Why we use FastAPI, Uvicorn, etc. |
| **QUICK_START.md** | 5-minute setup and testing guide |
| **README.md** | Complete project documentation |
| **setup.sh / setup.bat** | Automated setup script |
| **run_backend.sh / run_backend.bat** | Run backend with Uvicorn |
| **run_frontend.sh / run_frontend.bat** | Run frontend |

## 🎯 Start Here

### Step 1: Understand the Setup

Read **RUN.md** first. It explains:
- ✅ How to create virtual environment (venv)
- ✅ Why `uvicorn main:app --reload` is better than `python main.py`
- ✅ Step-by-step commands for your OS

### Step 2: Run the Setup

**macOS/Linux:**
```bash
chmod +x setup.sh
./setup.sh
```

**Windows:**
```bash
setup.bat
```

This automatically:
- Creates Python venv
- Installs dependencies
- Sets up database with SQLite
- Seeds test data
- Prepares frontend

### Step 3: Start the Servers

**Option A: Use Run Scripts (Easier)**

Terminal 1:
```bash
./run_backend.sh        # macOS/Linux
run_backend.bat         # Windows
```

Terminal 2:
```bash
./run_frontend.sh       # macOS/Linux
run_frontend.bat        # Windows
```

**Option B: Manual (More Control)**

Terminal 1 - Backend:
```bash
cd backend
source venv/bin/activate              # macOS/Linux
venv\Scripts\activate.bat              # Windows
uvicorn main:app --reload
```

Terminal 2 - Frontend:
```bash
cd frontend
npm run dev
```

### Step 4: Test the App

- Open http://localhost:3000
- Login with `owner1@sportspot.com` / `password123`
- Create and manage sports slots
- Try booking on home page
- Try double-booking (should fail with error)

---

## 🤔 FAQ: Why Uvicorn?

### Q: I see FastAPI in main.py. Do I need Uvicorn?

**A:** Yes! Here's why:

**What is FastAPI?**
- A Python web framework
- Defines your API routes
- Like the "logic" of your backend

**What is Uvicorn?**
- An ASGI application server
- Runs your FastAPI app
- Listens for HTTP requests
- Handles clients connecting

**They work together:**
```
Uvicorn (server) ← runs → FastAPI app (logic) ← contains → your code
```

### Q: What's `python main.py` then?

**A:** In `main.py`, there's this code:
```python
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
```

So `python main.py` starts Uvicorn internally. But:
- ❌ No auto-reload on code changes
- ❌ Must manually restart to test changes
- ❌ Less control over settings

**vs `uvicorn main:app --reload`:**
- ✅ Auto-reload on any change
- ✅ Instant testing
- ✅ Control workers, port, etc.

### Q: Which should I use?

| Situation | Command |
|-----------|---------|
| **Development** | `uvicorn main:app --reload` |
| **Production** | `uvicorn main:app --workers 4` |
| **Quick test** | `python main.py` |

---

## 📁 Project Structure After Setup

```
sportspot/
├── backend/                          # Python FastAPI app
│   ├── venv/                        # Virtual environment (created by setup)
│   ├── app/
│   │   ├── models.py               # Database models (User, Venue, etc.)
│   │   ├── schemas.py              # Request validation (Pydantic)
│   │   ├── auth.py                 # JWT & password utilities
│   │   ├── routers/                # API endpoints
│   │   │   ├── auth.py            # /auth/login, /auth/register
│   │   │   ├── venues.py          # /venues endpoints
│   │   │   ├── slots.py           # /slots/search endpoint
│   │   │   ├── bookings.py        # /bookings endpoint
│   │   │   └── players.py         # /players endpoints
│   │   └── db.py                   # Database connection
│   ├── alembic/                    # Database migrations
│   │   └── versions/001_initial_schema.py
│   ├── sportspot.db                # SQLite database (created by migrations)
│   ├── .env                        # Environment config (DATABASE_URL, etc)
│   ├── .env.example                # Template for .env
│   ├── main.py                     # FastAPI app & Uvicorn config
│   ├── seed.py                     # Populate test data
│   ├── requirements.txt            # Python dependencies
│   └── alembic.ini                 # Migration config
│
├── frontend/                        # Next.js React app
│   ├── node_modules/               # Dependencies (created by npm install)
│   ├── app/
│   │   ├── layout.tsx              # Root layout
│   │   ├── page.tsx                # / (homepage with search)
│   │   ├── venues/
│   │   │   ├── login/page.tsx      # /venues/login
│   │   │   ├── register/page.tsx   # /venues/register
│   │   │   └── dashboard/page.tsx  # /venues/dashboard
│   │   ├── players/
│   │   │   ├── page.tsx            # /players (directory)
│   │   │   └── register/page.tsx   # /players/register
│   │   └── book/[slotId]/page.tsx  # /book/:slotId (booking form)
│   ├── lib/
│   │   ├── api.ts                  # API client
│   │   └── auth.ts                 # JWT & auth utilities
│   ├── components/
│   │   └── Toast.tsx               # Toast notifications
│   ├── .env.local                  # Local config (NEXT_PUBLIC_API_URL)
│   ├── .env.example                # Template
│   ├── package.json                # Dependencies
│   └── tsconfig.json               # TypeScript config
│
├── docker-compose.yml              # PostgreSQL setup (optional)
├── setup.sh / setup.bat            # Automated setup
├── run_backend.sh / run_backend.bat # Run backend
├── run_frontend.sh / run_frontend.bat# Run frontend
│
├── RUN.md                          # How to run + venv explanation
├── ARCHITECTURE.md                 # Why each technology choice
├── QUICK_START.md                  # 5-minute setup
├── README.md                       # Complete documentation
└── GETTING_STARTED.md              # This file
```

---

## 🚀 Virtual Environment (venv) Explained

### What is a Virtual Environment?

A venv is a folder that isolates Python packages per project:

```
Your Computer
├── System Python (global)
├── Project1 (venv) ← has own packages
│   ├── FastAPI 0.115
│   ├── SQLAlchemy 2.0.36
│   └── ...
└── Project2 (venv) ← different versions
    ├── FastAPI 0.100
    ├── SQLAlchemy 2.0.30
    └── ...
```

Without venv, all projects share same packages → conflicts!

### Creating & Activating

**Creation (one time):**
```bash
python3 -m venv venv
# Creates: venv/ folder with Python environment
```

**Activation (every session):**

macOS/Linux:
```bash
source venv/bin/activate
# Prompt changes to: (venv) user@computer backend %
```

Windows:
```bash
venv\Scripts\activate.bat
# Prompt changes to: (venv) C:\sportspot\backend>
```

**Deactivation:**
```bash
deactivate
# Prompt returns to normal
```

### When to Activate

- ✅ Before running backend (`uvicorn`, `python`, `alembic`)
- ❌ Not needed for frontend (npm handles its own)
- ❌ Not needed for running scripts if path is explicit

---

## 📊 How Data Flows

### Booking Flow

```
1. User on Frontend (http://localhost:3000)
   ↓
2. Clicks "Book Now" button
   ↓
3. Frontend calls API: POST /bookings
   ↓
4. Backend (Uvicorn server on 8000)
   - Validates input with Pydantic
   - Checks database for conflicts
   ↓
5. SQLAlchemy adds booking to database
   ↓
6. Database returns success/error
   ↓
7. Backend returns HTTP response (200 or 409)
   ↓
8. Frontend shows success/error toast
   ↓
9. User sees "Booked!" or "Already booked"
```

### Auto-reload Flow (Development)

```
1. You edit backend/app/routers/bookings.py
   ↓
2. Uvicorn detects file change (--reload watching)
   ↓
3. Uvicorn stops current process
   ↓
4. Uvicorn reloads FastAPI app
   ↓
5. Your changes are live
   ↓
6. No manual restart needed!
```

---

## 🧪 Testing Checklist

After setup, verify everything works:

- [ ] Backend starts without errors
- [ ] Can see API docs at http://localhost:8000/docs
- [ ] Frontend starts without errors
- [ ] Homepage loads at http://localhost:3000
- [ ] Can login with owner1@sportspot.com / password123
- [ ] Can see sample venues on dashboard
- [ ] Can search slots on homepage
- [ ] Can click "Book Now" on a slot
- [ ] Booking form appears
- [ ] Can submit booking successfully
- [ ] Slot shows as booked
- [ ] Try booking same slot again → "already booked" error
- [ ] Player directory loads
- [ ] Can register as a player

---

## 🔗 Quick Links

| Component | URL |
|-----------|-----|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| API Alternative Docs | http://localhost:8000/redoc |
| Database (SQLite) | backend/sportspot.db |

---

## 💡 Common Commands

```bash
# Activate backend environment
source venv/bin/activate          # macOS/Linux
venv\Scripts\activate.bat         # Windows

# Run backend with auto-reload
uvicorn main:app --reload

# Run frontend
npm run dev

# Reset database
rm backend/sportspot.db
python -m alembic upgrade head
python seed.py

# Install new backend package
pip install package_name

# Install new frontend package  
npm install package_name

# Build frontend for production
npm run build

# Stop server
Ctrl + C
```

---

## 📞 Need Help?

- **FastAPI docs:** https://fastapi.tiangolo.com
- **Next.js docs:** https://nextjs.org
- **SQLAlchemy docs:** https://docs.sqlalchemy.org
- **Uvicorn docs:** https://www.uvicorn.org

Or check:
- **RUN.md** - Specific running & venv instructions
- **ARCHITECTURE.md** - Why each technology
- **README.md** - Complete API documentation

---

## ✨ You're All Set!

You now have a complete, production-ready sports booking platform. Start with `setup.sh` (or `setup.bat`), then run the servers. Happy coding! 🚀
