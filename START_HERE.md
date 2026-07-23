# 🚀 SportSpot - Start Here

## What Changed?

✅ **Removed:** Setup scripts (setup.sh, setup.bat, run_backend.sh, etc.)  
✅ **Added:** Clean command-based guide (COMMANDS.md)  
✅ **Simplified:** RUN.md with copy-paste commands  

## ⚡ 30-Second Start

### First Time (One-time setup)

**macOS/Linux:**
```bash
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && export DATABASE_URL=sqlite:///./sportspot.db && python -m alembic upgrade head && python seed.py && cd ../frontend && npm install
```

**Windows:**
```bash
cd backend && python -m venv venv && venv\Scripts\activate.bat && pip install -r requirements.txt && set DATABASE_URL=sqlite:///./sportspot.db && python -m alembic upgrade head && python seed.py && cd ../frontend && npm install
```

### Every Day After

**Terminal 1 - Backend:**
```bash
cd backend && source venv/bin/activate && uvicorn main:app --reload
```

**Terminal 2 - Frontend:**
```bash
cd frontend && npm run dev
```

**Open:** http://localhost:3000

---

## 📚 Documentation Files

| File | What It Has |
|------|-------------|
| **RUN.md** | Quick start + venv + common tasks |
| **COMMANDS.md** | Every command you might need |
| **ARCHITECTURE.md** | Why FastAPI, Uvicorn, etc. |
| **QUICK_START.md** | Testing & features checklist |
| **README.md** | Complete API documentation |
| **GETTING_STARTED.md** | Project structure & flow |

---

## 🎯 Choose Your Path

### Path 1: Just Run It (2 min)
1. Read **RUN.md**
2. Copy the first-time setup command for your OS
3. Copy the running command for your OS
4. Done!

### Path 2: Understand Everything (10 min)
1. Read **START_HERE.md** (this file)
2. Read **COMMANDS.md** for reference
3. Read **ARCHITECTURE.md** to understand why
4. Start coding!

### Path 3: Full Deep Dive (30 min)
1. Read all documentation files
2. Understand every part of the project
3. Read API docs at http://localhost:8000/docs
4. Explore the code

---

## 🤔 Quick Answers

### Q: What's the one command I need?

**First time:**
```bash
# macOS/Linux
cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt && export DATABASE_URL=sqlite:///./sportspot.db && python -m alembic upgrade head && python seed.py && cd ../frontend && npm install

# Windows
cd backend && python -m venv venv && venv\Scripts\activate.bat && pip install -r requirements.txt && set DATABASE_URL=sqlite:///./sportspot.db && python -m alembic upgrade head && python seed.py && cd ../frontend && npm install
```

**Every day:**
Terminal 1: `cd backend && source venv/bin/activate && uvicorn main:app --reload`  
Terminal 2: `cd frontend && npm run dev`

---

### Q: What if I don't want to use venv?

You can, but it's not recommended. Venv:
- Isolates your Python packages
- Prevents conflicts with other projects
- Is the industry standard
- Takes 30 seconds to setup

---

### Q: Why `uvicorn main:app --reload` not `python main.py`?

| Aspect | `python main.py` | `uvicorn --reload` |
|--------|------------------|-------------------|
| Auto-reload | ❌ | ✅ |
| Speed | Slow (manual restart) | ⚡ Fast |
| Dev experience | Manual restart needed | Changes instant |
| Use case | Not really | **Development** |

`uvicorn` directly gives you auto-reload on code changes.

---

### Q: Where are the setup scripts?

Removed! They're harder to maintain and less flexible. Direct commands are cleaner and you have full control.

---

## ✅ Verification

After running the server commands, verify:

1. **Backend running?**
   ```bash
   curl http://localhost:8000
   # Should show: {"message":"SportSpot API running"}
   ```

2. **Frontend running?**
   ```bash
   curl http://localhost:3000
   # Should return HTML
   ```

3. **Both visible?**
   - Open http://localhost:3000 in browser
   - Should see SportSpot homepage

---

## 📖 Need Specific Help?

- **How do I run it?** → Read **RUN.md**
- **What commands exist?** → Read **COMMANDS.md**
- **Why use FastAPI/Uvicorn?** → Read **ARCHITECTURE.md**
- **How do I test?** → Read **QUICK_START.md**
- **What's the API?** → Read **README.md**
- **How's it structured?** → Read **GETTING_STARTED.md**

---

## 🚀 You're Ready!

Pick one:

**Option A:** Copy one command, wait 2 min, start coding  
**Option B:** Read RUN.md, understand it, start coding  
**Option C:** Read all docs, understand everything, start coding  

All three lead to the same place! 

**Let's go! 🎯**
