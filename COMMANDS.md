# SportSpot - Complete Commands Guide

## 🎯 One-Time Setup

### macOS/Linux

```bash
# Backend setup
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./sportspot.db
python -m alembic upgrade head
python seed.py
cd ..

# Frontend setup
cd frontend
npm install
cd ..
```

### Windows

```bash
# Backend setup
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
set DATABASE_URL=sqlite:///./sportspot.db
python -m alembic upgrade head
python seed.py
cd ..

# Frontend setup
cd frontend
npm install
cd ..
```

---

## 🚀 Running the Application

### macOS/Linux

**Terminal 1 - Backend:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Then open:** http://localhost:3000

### Windows

**Command Prompt 1 - Backend:**
```bash
cd backend
venv\Scripts\activate.bat
uvicorn main:app --reload
```

**Command Prompt 2 - Frontend:**
```bash
cd frontend
npm run dev
```

**Then open:** http://localhost:3000

---

## 📝 Common Commands

### Backend Commands

```bash
# Activate virtual environment (macOS/Linux)
cd backend
source venv/bin/activate

# Activate virtual environment (Windows)
cd backend
venv\Scripts\activate.bat

# Deactivate virtual environment (both)
deactivate

# Run backend with auto-reload
uvicorn main:app --reload

# Run backend on different port
uvicorn main:app --reload --port 9000

# Run backend without auto-reload
uvicorn main:app

# Install new package
pip install package_name

# Update requirements.txt
pip freeze > requirements.txt

# Create new migration
python -m alembic revision --autogenerate -m "Your migration name"

# Apply migrations
python -m alembic upgrade head

# Rollback last migration
python -m alembic downgrade -1

# Seed database with test data
python seed.py

# Reset database
rm sportspot.db          # macOS/Linux
del sportspot.db         # Windows
python -m alembic upgrade head
python seed.py
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Start production build
npm start

# Install new package
npm install package_name

# Remove package
npm uninstall package_name

# Check for dependency vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix

# Clear Next.js cache
rm -rf .next node_modules    # macOS/Linux
rmdir /s /q .next node_modules # Windows

# Reinstall and rebuild
npm install
npm run build
```

---

## 🗄️ Database Commands

### SQLite (Development)

```bash
# Open database in SQLite CLI
sqlite3 backend/sportspot.db

# Inside SQLite:
sqlite> .tables              # List all tables
sqlite> .schema users        # Show users table structure
sqlite> SELECT * FROM users; # Query users
sqlite> .quit                # Exit

# Reset database
rm backend/sportspot.db      # macOS/Linux
python -m alembic upgrade head
python seed.py
```

### Alembic Migrations

```bash
# Create automatic migration (generates from model changes)
cd backend
python -m alembic revision --autogenerate -m "Add phone column to players"

# Create empty migration (manual SQL)
python -m alembic revision -m "Custom migration"

# Apply all pending migrations
python -m alembic upgrade head

# Apply specific number of migrations
python -m alembic upgrade +2

# Downgrade one migration
python -m alembic downgrade -1

# Show current migration version
python -m alembic current

# Show migration history
python -m alembic history
```

---

## 🔍 Useful Debugging Commands

### Check if ports are in use

**macOS/Linux:**
```bash
# Check port 8000 (backend)
lsof -i :8000

# Check port 3000 (frontend)
lsof -i :3000

# Kill process using port 8000
kill -9 <PID>
```

**Windows:**
```bash
# Check port 8000
netstat -ano | findstr :8000

# Check port 3000
netstat -ano | findstr :3000

# Kill process using port 8000 (replace PID with actual ID)
taskkill /PID <PID> /F
```

### Test API

```bash
# Check if backend is running
curl http://localhost:8000

# Check if API docs work
curl http://localhost:8000/docs

# Login and get token
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner1@sportspot.com","password":"password123"}'

# Search slots
curl "http://localhost:8000/slots/search?date=2026-07-01&city=Karachi"
```

---

## 📊 Full Workflow Example

### Day 1: Initial Setup

```bash
# Clone/navigate to project
cd sportspot

# Setup backend
cd backend
python3 -m venv venv              # macOS/Linux
python -m venv venv                # Windows alternative
source venv/bin/activate           # macOS/Linux
venv\Scripts\activate.bat          # Windows
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./sportspot.db  # macOS/Linux
set DATABASE_URL=sqlite:///./sportspot.db     # Windows
python -m alembic upgrade head
python seed.py
cd ..

# Setup frontend
cd frontend
npm install
cd ..

# You're done! ✅
```

### Day 2: Development Work

**Terminal 1:**
```bash
cd backend
source venv/bin/activate           # macOS/Linux: venv\Scripts\activate.bat on Windows
uvicorn main:app --reload
# Runs on http://localhost:8000
```

**Terminal 2:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

**Make changes:**
- Edit `backend/app/routers/*.py` → Backend auto-reloads
- Edit `frontend/app/*.tsx` → Frontend auto-reloads

### Day 3: Add a New Feature

```bash
# 1. Make changes to models (backend/app/models.py)

# 2. Create migration
cd backend
source venv/bin/activate
python -m alembic revision --autogenerate -m "Add new feature"

# 3. Apply migration
python -m alembic upgrade head

# 4. Server auto-reloads, test changes
# Both Uvicorn and Next.js detect changes automatically
```

---

## 🐛 Troubleshooting Commands

### Backend Issues

```bash
# Check Python version
python --version

# Check pip packages installed
pip list

# Reinstall all packages
pip install -r requirements.txt --force-reinstall

# Test if FastAPI works
python -c "from main import app; print('✓ FastAPI works')"

# Check if Alembic works
python -m alembic current

# See recent database changes
python -m alembic history
```

### Frontend Issues

```bash
# Check Node version
node --version
npm --version

# Clear npm cache
npm cache clean --force

# Reinstall all dependencies
rm -rf node_modules package-lock.json  # macOS/Linux
rmdir /s /q node_modules & del package-lock.json  # Windows
npm install

# Check for errors
npm run build

# Audit dependencies
npm audit
```

### Database Issues

```bash
# Check database file size
ls -lh backend/sportspot.db        # macOS/Linux
dir backend\sportspot.db           # Windows

# Backup database
cp backend/sportspot.db backend/sportspot.db.backup  # macOS/Linux
copy backend\sportspot.db backend\sportspot.db.backup # Windows

# Reset everything
rm backend/sportspot.db            # macOS/Linux
del backend\sportspot.db           # Windows
python -m alembic upgrade head
python seed.py
```

---

## 🌐 Environment Variables

### Backend (.env)

```bash
# Set in terminal (temporary)
export DATABASE_URL=sqlite:///./sportspot.db    # macOS/Linux
set DATABASE_URL=sqlite:///./sportspot.db       # Windows

# Or create backend/.env file:
DATABASE_URL=sqlite:///./sportspot.db
SECRET_KEY=your-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

### Frontend (.env.local)

```bash
# Create frontend/.env.local file:
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## ✅ Verification Checklist

After running commands, verify everything works:

```bash
# Backend running?
curl http://localhost:8000
# Should show: {"message":"SportSpot API running"}

# API docs available?
curl http://localhost:8000/docs
# Should return HTML documentation page

# Frontend running?
curl http://localhost:3000
# Should return HTML homepage

# Database exists?
ls -lh backend/sportspot.db     # macOS/Linux
dir backend\sportspot.db        # Windows

# Can login?
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner1@sportspot.com","password":"password123"}'
# Should return {"access_token":"...","token_type":"bearer","role":"venue_owner"}
```

---

## 📚 Help Commands

```bash
# Get help on Uvicorn options
uvicorn --help

# Get help on Alembic commands
python -m alembic --help

# Get help on npm commands
npm --help

# Get Python package info
pip show package_name

# Get Python environment info
python -c "import sys; print(sys.prefix)"
```

---

## 🚀 Production-Ready Commands

### Build Frontend

```bash
cd frontend
npm run build
```

### Run Production Backend

```bash
cd backend
source venv/bin/activate           # macOS/Linux
venv\Scripts\activate.bat          # Windows

# Single worker (basic)
uvicorn main:app --host 0.0.0.0 --port 8000

# Multiple workers (recommended)
uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
```

### Run Production Frontend

```bash
cd frontend
npm run build
npm start
```

---

## 💡 Quick Reference

| Task | Command |
|------|---------|
| Activate backend venv | `source venv/bin/activate` / `venv\Scripts\activate.bat` |
| Deactivate venv | `deactivate` |
| Run backend | `uvicorn main:app --reload` |
| Run frontend | `npm run dev` |
| Install backend deps | `pip install -r requirements.txt` |
| Install frontend deps | `npm install` |
| Create migration | `python -m alembic revision --autogenerate -m "msg"` |
| Apply migrations | `python -m alembic upgrade head` |
| Seed database | `python seed.py` |
| Reset database | `rm sportspot.db && python -m alembic upgrade head && python seed.py` |
| Check API | `curl http://localhost:8000` |
| Check Frontend | `curl http://localhost:3000` |

---

## 🎯 Minimum Commands to Start

### First Time Ever

```bash
# Just copy-paste these in order:
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./sportspot.db
python -m alembic upgrade head
python seed.py

cd ../frontend
npm install
```

### Every Day After

**Terminal 1:**
```bash
cd backend
source venv/bin/activate
uvicorn main:app --reload
```

**Terminal 2:**
```bash
cd frontend
npm run dev
```

Done! 🚀
