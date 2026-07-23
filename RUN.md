# SportSpot - Running the Application

## ⚡ Quick Start (Copy & Paste)

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

**Open browser:** http://localhost:3000

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

**Open browser:** http://localhost:3000

---

## 📝 First Time Setup

### macOS/Linux

```bash
# Backend
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=sqlite:///./sportspot.db
python -m alembic upgrade head
python seed.py
cd ..

# Frontend
cd frontend
npm install
cd ..

# Done! Now run the commands above to start the servers
```

### Windows

```bash
# Backend
cd backend
python -m venv venv
venv\Scripts\activate.bat
pip install -r requirements.txt
set DATABASE_URL=sqlite:///./sportspot.db
python -m alembic upgrade head
python seed.py
cd ..

# Frontend
cd frontend
npm install
cd ..

# Done! Now run the commands above to start the servers
```

---

## 🎯 Virtual Environment (venv) Explained

### What is venv?

A virtual environment isolates Python packages for this project:
- Each project has its own packages
- No conflicts with other projects
- Easy to manage dependencies

### Activate/Deactivate

**macOS/Linux:**
```bash
source venv/bin/activate      # Activate
deactivate                    # Deactivate
```

**Windows:**
```bash
venv\Scripts\activate.bat     # Activate
deactivate                    # Deactivate
```

---

## 🤔 Why `uvicorn main:app --reload`?

### The Difference

| Method | Auto-reload | Best For |
|--------|-------------|----------|
| `python main.py` | ❌ No | Quick tests |
| `uvicorn main:app --reload` | ✅ Yes | **Development** |

**Why `--reload` is better:**
- ✅ Code changes reload automatically
- ✅ No need to restart server
- ✅ Faster development workflow

### How It Works

```
You edit backend/app/routers/bookings.py
        ↓
Uvicorn detects change (watching files)
        ↓
Server restarts automatically
        ↓
Changes live at http://localhost:8000
```

---

## 📋 Common Tasks

### Install New Backend Package

```bash
cd backend
source venv/bin/activate      # macOS/Linux: venv\Scripts\activate.bat on Windows
pip install package_name
pip freeze > requirements.txt
```

### Install New Frontend Package

```bash
cd frontend
npm install package_name
```

### Reset Database

```bash
cd backend
rm sportspot.db               # macOS/Linux: del sportspot.db on Windows
python -m alembic upgrade head
python seed.py
```

### Check if Servers Are Running

```bash
# Backend
curl http://localhost:8000

# Frontend
curl http://localhost:3000
```

### See API Documentation

Visit: http://localhost:8000/docs

---

## 🧪 Test Credentials

After setup, you can login with:
- **Email:** owner1@sportspot.com
- **Password:** password123

---

## 📚 More Commands

For complete list of all commands, see **COMMANDS.md**

---

## ✅ Checklist After First Run

- [ ] Backend starts without errors
- [ ] API docs visible at http://localhost:8000/docs
- [ ] Frontend starts without errors
- [ ] Homepage loads at http://localhost:3000
- [ ] Can login and see dashboard

---

## 🆘 Troubleshooting

### Port already in use

**macOS/Linux:**
```bash
lsof -i :8000    # Find what's using port 8000
kill -9 <PID>    # Kill the process
```

**Windows:**
```bash
netstat -ano | findstr :8000
taskkill /PID <PID> /F
```

### Module not found

```bash
cd backend
source venv/bin/activate    # macOS/Linux: venv\Scripts\activate.bat on Windows
pip install -r requirements.txt
```

### Frontend build fails

```bash
cd frontend
rm -rf node_modules .next   # macOS/Linux: rmdir /s /q node_modules .next on Windows
npm install
npm run dev
```

---

## 📖 Full Documentation

- **COMMANDS.md** - All commands with examples
- **ARCHITECTURE.md** - Why each technology
- **QUICK_START.md** - Testing & features
- **README.md** - Complete API docs
- **GETTING_STARTED.md** - Project overview
