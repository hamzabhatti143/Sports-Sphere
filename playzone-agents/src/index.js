// PlayZone Agents — entrypoint. Boots Express (admin API), the WhatsApp client,
// and the Bull hold-expiry scheduler.
require('dotenv').config();
const express = require('express');
const QRCode = require('qrcode');
const db = require('./tools/database');
const { initWhatsApp, sendMessage, isReady, getLastQr } = require('./tools/whatsapp');
const { holdExpired } = require('./tools/notifications');
const log = require('./utils/logger');

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/health', (_req, res) => res.json({ ok: true, service: 'playzone-agents' }));

// Browser page to scan the WhatsApp QR (auto-refreshes; shows a success state once linked).
app.get('/qr', async (_req, res) => {
  const ready = isReady();
  const qr = getLastQr();
  let body;
  if (ready) {
    body = '<h1>✅ WhatsApp is linked</h1><p>The bot is connected and ready. You can close this tab.</p>';
  } else if (qr) {
    const dataUrl = await QRCode.toDataURL(qr, { margin: 2, width: 320 });
    body = `<h1>Scan to link WhatsApp</h1>
      <img src="${dataUrl}" alt="WhatsApp QR" />
      <p>WhatsApp → Settings → <b>Linked Devices</b> → <b>Link a Device</b>, then scan.</p>
      <p class="muted">This page refreshes every 15s to keep the code fresh.</p>`;
  } else {
    body = '<h1>Starting…</h1><p>Generating QR code. This page will refresh automatically.</p>';
  }
  res.setHeader('Content-Type', 'text/html');
  res.send(`<!doctype html><html><head><meta charset="utf-8"/>
    <meta http-equiv="refresh" content="15"/>
    <title>PlayZone — Link WhatsApp</title>
    <style>body{font-family:system-ui,Segoe UI,Arial,sans-serif;text-align:center;padding:40px;color:#0f172a}
    img{border:1px solid #e2e8f0;border-radius:12px;padding:8px;background:#fff}
    .muted{color:#64748b;font-size:14px}h1{font-size:22px}</style></head>
    <body>${body}</body></html>`);
});

// --- Admin API (protected) ---
// Every /admin/* route requires the shared token. Combined with binding to
// 127.0.0.1 this keeps the admin API off the LAN and gated behind a secret.
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
app.use('/admin', (req, res, next) => {
  if (!ADMIN_TOKEN) return res.status(503).json({ error: 'ADMIN_TOKEN not configured' });
  const token = req.get('x-admin-token') || (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (token !== ADMIN_TOKEN) return res.status(401).json({ error: 'unauthorized' });
  next();
});

app.get('/admin/bookings', async (_req, res) => {
  try { res.json(await db.listBookings(200)); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/admin/conversations', async (_req, res) => {
  try { res.json(await db.listConversations()); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/payment-config', async (req, res) => {
  try {
    const { venue_id, method, account_number, account_name, advance_percent } = req.body || {};
    if (!venue_id || !method || !account_number || !account_name) {
      return res.status(400).json({ error: 'venue_id, method, account_number, account_name required' });
    }
    const cfg = await db.setPaymentConfig({ venue_id, method, account_number, account_name, advance_percent });
    res.json({ ok: true, config: cfg });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/admin/send-message', async (req, res) => {
  try {
    const { number, text } = req.body || {};
    if (!number || !text) return res.status(400).json({ error: 'number and text required' });
    await sendMessage(number, text);
    res.json({ ok: true });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';
const HOLD_MINUTES = Number(process.env.HOLD_MINUTES || 90);

// Redis-free slot-hold enforcement: every minute, cancel pending bookings older
// than HOLD_MINUTES (created in the last 24h so historical data is untouched)
// and notify the customer. Works for both bot and website bookings, and
// survives restarts because it reads from the DB, not an in-memory timer.
function startHoldSweeper() {
  const sweep = async () => {
    try {
      const released = await db.releaseExpiredHolds(HOLD_MINUTES);
      for (const b of released) {
        log.warn('released expired hold', b.reference);
        if (b.booked_by_phone) await sendMessage(b.booked_by_phone, holdExpired());
      }
    } catch (e) {
      log.error('hold sweep failed', e.message);
    }
  };
  setInterval(sweep, 60 * 1000).unref();
  log.ok(`hold sweeper ready (${HOLD_MINUTES}-min holds, DB-based)`);
}

async function start() {
  // Fail fast if the DB is unreachable.
  try {
    await db.query('SELECT 1');
    log.ok('database connected');
  } catch (e) {
    log.error('DATABASE not reachable — check DATABASE_URL in .env', e.message);
  }

  try { startHoldSweeper(); } catch (e) { log.error('hold sweeper init failed', e.message); }
  try { initWhatsApp(); } catch (e) { log.error('whatsapp init failed', e.message); }

  app.listen(PORT, HOST, () => log.ok(`admin API on http://${HOST}:${PORT}`));
}

start();

// keep the process alive on unhandled errors instead of crashing the bot
process.on('unhandledRejection', (e) => log.error('unhandledRejection', e && e.message));
process.on('uncaughtException', (e) => log.error('uncaughtException', e && e.message));

module.exports = app;
