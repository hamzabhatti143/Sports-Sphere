# PlayZone / SportSpot — Production Deployment Guide

## The system has 3 running parts + 1 database

| Component | Folder | Tech | Port |
|-----------|--------|------|------|
| Website (frontend) | `frontend/` | Next.js | 3000 |
| API (backend) | `backend/` | FastAPI (Python) | 8000 |
| WhatsApp bot | `playzone-agents/` | Node + whatsapp-web.js (Puppeteer/Chromium) | 3001 |
| Database | — | **Neon Postgres (already cloud-hosted)** | — |

The database is **already** on Neon (cloud), shared by all three parts. Nothing about the DB
changes when you go live — the same `DATABASE_URL` works from any server.

---

## ⚠️ Vercel vs Hugging Face — the honest answer

**Neither can host the WhatsApp bot.** The bot runs a real Chromium browser (via
whatsapp-web.js) that must stay alive 24/7 and keep a saved login session on disk.

| Platform | Frontend | Backend API | **WhatsApp bot** |
|----------|----------|-------------|------------------|
| **Vercel** | ✅ Great | ⚠️ Possible but awkward (serverless) | ❌ **Impossible** — serverless, no long-running process, no browser, no persistent disk |
| **Hugging Face Spaces** | ❌ Not meant for this | ❌ Not meant for this | ❌ **No** — Spaces sleep & have ephemeral storage → the WhatsApp session is lost, needs re-scan constantly |
| **VPS** (DigitalOcean, Hetzner, Contabo…) | ✅ | ✅ | ✅ **Yes — this is what the bot needs** |
| Railway / Render | ✅ | ✅ | ✅ if you attach a **persistent disk** for the session |

### Recommended setup (simplest, ~$5–6/month)
- **One small Linux VPS** running all three parts under PM2 (exactly like it runs now on Windows).
- **Database stays on Neon** (no change).
- Optionally put the **frontend on Vercel** (it's the one thing Vercel is perfect for) and point it
  at the VPS's backend URL.

> Bottom line: **Vercel is only good for the frontend. Hugging Face is not suitable for any part
> of this. The WhatsApp bot (and ideally the backend) must live on a VPS or a host with a
> persistent disk and always-on process.**

---

## Deploy on a VPS (recommended)

1. **Create a VPS** (Ubuntu 22.04, 1–2 GB RAM). Install Node 18+, Python 3.11+, and Chromium:
   ```bash
   sudo apt update && sudo apt install -y nodejs npm python3 python3-venv python3-pip chromium-browser
   npm i -g pm2
   ```
2. **Copy the project** (git clone or scp) to the server.
3. **Set env files** (`backend/.env` and `playzone-agents/.env`) — see the variables below.
   On Linux set `CHROME_PATH=/usr/bin/chromium-browser`.
4. **Install deps & migrate:**
   ```bash
   cd backend && python3 -m venv venv && . venv/bin/activate && pip install -r requirements.txt && python -m alembic upgrade head && cd ..
   cd playzone-agents && npm install && npm run migrate && cd ..
   cd frontend && npm install && npm run build && cd ..
   ```
5. **Start everything under PM2** (already defined in `playzone-agents/ecosystem.config.js` — adjust
   the `cwd`/paths to the server's paths, and set the frontend to `npm run start` after `build`):
   ```bash
   pm2 start playzone-agents/ecosystem.config.js
   pm2 save
   pm2 startup            # prints a command — run it, so PM2 restarts on server boot
   ```
6. **Link WhatsApp once:** open `http://<server-ip>:3001/qr` (over an SSH tunnel or temporarily) and
   scan with the business phone. The session is saved to `playzone-agents/.wwebjs_auth` and survives
   restarts — no re-scan needed.

Put Nginx in front for HTTPS on the website + API. Keep port **3001 (bot admin) closed to the public** —
it only needs to be reachable by the backend on the same server (`BOT_URL=http://127.0.0.1:3001`).

---

## Required environment variables

**`backend/.env`**
```
DATABASE_URL=postgresql://…neon…            # same Neon URL
SECRET_KEY=…                                # JWT signing secret
BOT_URL=http://127.0.0.1:3001               # where the bot admin API is
BOT_ADMIN_TOKEN=…                           # MUST match the bot's ADMIN_TOKEN
```

**`playzone-agents/.env`**
```
OPENAI_API_KEY=…
DATABASE_URL=postgresql://…neon…            # same Neon URL as backend
PORT=3001
HOST=127.0.0.1                              # keep admin API on loopback
ADMIN_TOKEN=…                               # MUST match backend BOT_ADMIN_TOKEN
DISABLE_REDIS=true                          # no Redis needed (DB-based holds)
CHROME_PATH=/usr/bin/chromium-browser       # Linux path (Windows: Chrome path)
```

**Frontend:** set its API base URL env to the public backend URL (e.g. `https://api.yourdomain.com`).

---

## How "booking → WhatsApp payment message" is wired (confirmed working)

```
Customer books on website
   → Frontend POST /bookings (backend)
   → Backend saves booking (status = pending) in Neon
   → Backend BackgroundTask (app/wa_notify.py):
        • writes advance/remaining on the booking
        • writes a conversations row linking the customer's number → this booking
        • POST http://127.0.0.1:3001/admin/send-message (with BOT_ADMIN_TOKEN)
   → Bot sends the JazzCash advance-payment WhatsApp message to the customer
   → Customer replies with payment screenshot
   → Bot (GPT-4o Vision) verifies it against booking #, confirms, notifies customer + owner
```

The customer's number comes from `booked_by_phone` (required at checkout). For this to work in
production the backend must be able to reach the bot at `BOT_URL`, and both must share the same
`ADMIN_TOKEN`. On a single VPS this is automatic (`127.0.0.1:3001`).

---

## Real-world 24/7 notes
- The VPS is always-on by design (unlike a home PC), so this is the reliable path for 24/7.
- The linked WhatsApp phone (03152528048) should come online at least once every ~14 days or
  WhatsApp unlinks the device.
- The bot self-heals from Puppeteer "detached Frame"/session drops (auto-rebuild + watchdog) and
  PM2 restarts it on crash/boot.
