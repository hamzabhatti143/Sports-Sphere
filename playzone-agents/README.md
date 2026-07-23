# PlayZone Agents (WhatsApp + GPT-4o payment verification)

A Node.js WhatsApp bot that books indoor sports slots and **verifies payment
screenshots with GPT-4o Vision**, then auto-confirms bookings.

> Adapted from the Supabase spec to use the **existing Neon Postgres** database
> that the FastAPI backend (`../backend`) already uses — so bot bookings and
> website bookings share one source of truth. `@supabase/supabase-js` was
> replaced with `pg`.

## Architecture

```
WhatsApp ─▶ tools/whatsapp.js ─▶ agents/orchestrator.js ─┬─▶ bookingAgent.js  (GPT-4o function calling)
   ▲                                                      ├─▶ paymentAgent.js  (GPT-4o Vision verify)
   │                                                      ├─▶ venueAgent.js
   └──────────────── sendMessage ◀───────────────────────┴─▶ matchmakerAgent.js
                                    tools/database.js (pg → Neon)  tools/scheduler.js (Bull 30-min holds)
```

Data flow: user chats → `bookingAgent` creates a **pending** booking + sends
payment instructions + schedules a 30-min hold → user sends screenshot →
`paymentAgent` runs the 8-point check with GPT-4o Vision → **confirmed** (both
user + venue owner notified) or **payment_failed** (reason sent back).

## Setup

```bash
cd playzone-agents
cp .env.example .env      # fill OPENAI_API_KEY; set DATABASE_URL = same as ../backend/.env
npm install               # installs whatsapp-web.js (pulls Chromium), openai, pg, bull, ioredis…
npm run migrate           # adds agent columns/tables to the shared DB (idempotent)
# Redis must be running for holds/conversation cache:  redis-server
npm start                 # prints a QR — scan with WhatsApp → Linked Devices
```

Set a venue's payment details:

```bash
curl -X POST http://localhost:3000/admin/payment-config -H "Content-Type: application/json" -d '{
  "venue_id": 1, "method": "JazzCash",
  "account_number": "03243373891", "account_name": "Muhammad Hamza Bhatti",
  "advance_percent": 50
}'
```

## Admin API
- `GET  /health`
- `GET  /admin/bookings`
- `GET  /admin/conversations`
- `POST /admin/payment-config`  `{ venue_id, method, account_number, account_name, advance_percent }`
- `POST /admin/send-message`    `{ number, text }`

## Notes / deviations from the spec
- **DB**: Neon Postgres via `pg` (not Supabase). Tables reused: `users`, `venues`,
  `weekly_slots` (the spec's `slots`), `bookings`, `discounts`. Added: `payment_config`,
  `conversations`, and booking columns `advance_amount/remaining_amount/payment_verified/
  transaction_id`, plus a `payment_failed` booking status.
- Prices are **per hour** (matches the website); totals = hours × rate, then discount.
- Requires **OpenAI key, Redis, and a WhatsApp scan** to actually run. Set
  `DISABLE_WHATSAPP=true` to boot just the admin API (e.g. to run migrations/config).
