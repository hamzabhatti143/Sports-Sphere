// WhatsApp client (whatsapp-web.js). Shows a QR (terminal + /qr page), routes
// every incoming message/image to the Orchestrator, exposes sendMessage(), and
// self-heals: whatsapp-web.js/Puppeteer occasionally leaves the browser page in
// a "detached Frame" / "Session closed" state where the client still reports
// ready but every send fails. We detect those, rebuild the client, and re-flush
// queued messages. A watchdog also rebuilds if the session silently drops.
require('dotenv').config();
const crypto = require('crypto');
const https = require('https');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const log = require('../utils/logger');
const { toWaId, toIntl } = require('../utils/phone');

// --- Manual WhatsApp media download+decrypt --------------------------------
// Current WhatsApp Web broke the library's in-browser downloadAndMaybeDecrypt
// (throws minified "r"). We instead read the media's encryption metadata from
// the page (simple property reads that still work), fetch the encrypted blob
// from the WhatsApp CDN, and AES-256-CBC decrypt it in Node ourselves.
const MEDIA_KEY_INFO = {
  image: 'WhatsApp Image Keys',
  sticker: 'WhatsApp Image Keys',
  video: 'WhatsApp Video Keys',
  audio: 'WhatsApp Audio Keys',
  ptt: 'WhatsApp Audio Keys',
  document: 'WhatsApp Document Keys',
};

function httpGetBuffer(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, { headers: { 'User-Agent': 'WhatsApp/2.2400.0', Origin: 'https://web.whatsapp.com' } }, (res) => {
        if (res.statusCode !== 200) { res.resume(); return reject(new Error('CDN HTTP ' + res.statusCode)); }
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => resolve(Buffer.concat(chunks)));
      })
      .on('error', reject);
  });
}

// Normalise a mediaKey from any shape (base64 string, Buffer, {type:'Buffer',data},
// array, Uint8Array) into a 32-byte Buffer.
function toKeyBuffer(mk) {
  if (!mk) return null;
  if (Buffer.isBuffer(mk)) return mk;
  if (typeof mk === 'string') return Buffer.from(mk, 'base64');
  if (mk.type === 'Buffer' && Array.isArray(mk.data)) return Buffer.from(mk.data);
  if (Array.isArray(mk)) return Buffer.from(mk);
  if (mk instanceof Uint8Array) return Buffer.from(mk);
  if (typeof mk === 'object') { const v = Object.values(mk); if (v.length) return Buffer.from(v); }
  return null;
}

async function downloadMediaManual(msg) {
  const d = (msg && msg._data) || {};
  let directPath = d.directPath;
  let mediaKeyRaw = d.mediaKey;
  let mimetype = d.mimetype || (msg && msg.mimetype);
  let type = d.type || (msg && msg.type);

  // Fallback: read the fields from the page if the Node-side raw data lacks them.
  if (!directPath || !mediaKeyRaw) {
    try {
      const meta = await client.pupPage.evaluate(async (msgId) => {
        try {
          const Col = window.require('WAWebCollections');
          let m = Col.Msg.get(msgId);
          if (!m && msgId) { try { const r = await Col.Msg.getMessagesById([msgId]); m = r && r.messages && r.messages[0]; } catch (e) {} }
          if (!m) return { error: 'not found' };
          let mediaKeyB64 = null;
          const mk = m.mediaKey;
          if (mk) {
            if (typeof mk === 'string') mediaKeyB64 = mk;
            else { const b = new Uint8Array(mk.buffer ? mk.buffer : mk); let s = ''; for (let i = 0; i < b.length; i++) s += String.fromCharCode(b[i]); mediaKeyB64 = btoa(s); }
          }
          return { directPath: m.directPath, mediaKeyB64, mimetype: m.mimetype, type: m.type };
        } catch (e) { return { error: String((e && e.message) || e) }; }
      }, msg.id && msg.id._serialized);
      if (meta && !meta.error) {
        directPath = directPath || meta.directPath;
        mediaKeyRaw = mediaKeyRaw || meta.mediaKeyB64;
        mimetype = mimetype || meta.mimetype;
        type = type || meta.type;
      }
    } catch (e) { log.warn('page meta fallback failed:', (e && e.message) || e); }
  }

  const mediaKey = toKeyBuffer(mediaKeyRaw);
  log.step('manual media meta', 'dp:', directPath ? 'yes' : 'no', 'keyBytes:', mediaKey ? mediaKey.length : 0, 'type:', type);
  if (!directPath || !mediaKey || mediaKey.length < 16) throw new Error(`missing directPath/mediaKey (dp=${!!directPath}, keyLen=${mediaKey ? mediaKey.length : 0})`);

  const info = MEDIA_KEY_INFO[type] || 'WhatsApp Image Keys';
  const expanded = Buffer.from(crypto.hkdfSync('sha256', mediaKey, Buffer.alloc(32), Buffer.from(info, 'utf8'), 112));
  const iv = expanded.subarray(0, 16);
  const cipherKey = expanded.subarray(16, 48);

  const url = directPath.startsWith('http') ? directPath : 'https://mmg.whatsapp.net' + directPath;
  const enc = await httpGetBuffer(url);
  const cipherText = enc.subarray(0, enc.length - 10); // last 10 bytes = MAC
  const decipher = crypto.createDecipheriv('aes-256-cbc', cipherKey, iv);
  const data = Buffer.concat([decipher.update(cipherText), decipher.final()]);
  return { data: data.toString('base64'), mimetype: mimetype || 'image/jpeg' };
}

let client = null;
let ready = false;
let everReady = false; // has the client paired+connected at least once this process?
let recovering = false;
let lastQr = null;              // most recent QR string (for the /qr web page)
const outbox = [];             // queued until the client is ready

// Errors that mean the underlying browser page is dead and only a rebuild helps.
function isFatalBrowserError(e) {
  const m = (e && e.message) || '';
  return /detached Frame|Session closed|Protocol error|Target closed|Execution context was destroyed|page has been closed|Most likely the page has been closed/i.test(m);
}

// Remove stale Chromium singleton locks left by an unclean exit, so a fresh
// start isn't blocked by "browser is already running for ...".
function cleanSessionLocks() {
  try {
    const fs = require('fs');
    const path = require('path');
    const cp = require('child_process');
    // Kill any orphaned Chromium still bound to this session's userDataDir. Without
    // this, a relaunch after a crash/recovery fails with "browser is already
    // running". Runs only at process start (before we launch our own browser).
    if (process.platform === 'win32') {
      try {
        cp.execSync(
          "powershell -NoProfile -Command \"Get-CimInstance Win32_Process | Where-Object { $_.CommandLine -like '*session-playzone*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }\"",
          { stdio: 'ignore', timeout: 15000 }
        );
      } catch (e) { /* best effort */ }
    } else {
      try { cp.execSync("pkill -f session-playzone", { stdio: 'ignore', timeout: 15000 }); } catch (e) {}
    }
    const dir = path.join(process.cwd(), '.wwebjs_auth', 'session-playzone');
    for (const f of ['SingletonLock', 'SingletonCookie', 'SingletonSocket']) {
      const p = path.join(dir, f);
      try { if (fs.existsSync(p)) { fs.rmSync(p, { force: true }); log.warn('removed stale', f); } } catch (e) {}
    }
  } catch (e) { log.warn('lock cleanup failed', e.message); }
}

function buildClient() {
  cleanSessionLocks();
  const executablePath =
    process.env.CHROME_PATH ||
    (process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : undefined);

  const c = new Client({
    authStrategy: new LocalAuth({ clientId: 'playzone' }),
    // Don't persist a web-version snapshot: current WhatsApp Web dropped the
    // manifest-<ver>.json marker, which crashes LocalWebCache.persist.
    webVersionCache: { type: 'none' },
    puppeteer: {
      ...(executablePath ? { executablePath } : {}),
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  c.on('qr', (qr) => {
    lastQr = qr;
    qrcode.generate(qr, { small: true });
    log.info('Scan the QR above with WhatsApp → Linked Devices  (or open http://localhost:' + (process.env.PORT || 3000) + '/qr in a browser)');
  });
  c.on('ready', () => { ready = true; everReady = true; lastQr = null; log.ok('WhatsApp client ready'); flush(); });
  c.on('authenticated', () => log.ok('WhatsApp authenticated'));
  c.on('auth_failure', (m) => log.error('WhatsApp auth failure', m));
  c.on('disconnected', (reason) => {
    ready = false;
    log.warn('WhatsApp disconnected:', reason, '— rebuilding…');
    recover('disconnected');
  });
  c.on('message', handleIncoming);
  return c;
}

function initWhatsApp() {
  if (process.env.DISABLE_WHATSAPP === 'true') {
    log.warn('DISABLE_WHATSAPP=true — WhatsApp client not started');
    return null;
  }
  client = buildClient();
  client.initialize().catch((e) => log.error('WhatsApp init failed', e.message));
  startWatchdog();
  return client;
}

// Recover from a dead browser page. In-process rebuild fights the Chromium
// userDataDir lock ("browser is already running"), so instead we exit and let
// PM2 restart the whole process — a clean browser, and LocalAuth means no
// re-scan. destroy() first so the child Chromium is killed before we exit.
async function recover(reason) {
  if (recovering) return;
  recovering = true;
  ready = false;
  log.warn('recovering WhatsApp client (restarting process):', reason);
  try { if (client) await client.destroy(); } catch (e) { log.warn('destroy during recover failed', e.message); }
  // Give logs a moment to flush, then exit non-zero so PM2 relaunches us.
  setTimeout(() => process.exit(1), 800);
}

// Every 3 minutes, if the client WAS paired but the page is now unhealthy, rebuild.
// We only monitor after the first successful pairing (everReady) — before that the
// client is legitimately "unpaired" while waiting for the QR scan, and reacting to
// that would restart-loop and keep regenerating the QR.
function startWatchdog() {
  setInterval(async () => {
    if (!client || recovering || !everReady) return;
    try {
      const state = await client.getState(); // 'CONNECTED' when healthy
      if (state && state !== 'CONNECTED') {
        log.warn('watchdog: state =', state);
        recover('watchdog:' + state);
      }
    } catch (e) {
      log.warn('watchdog: getState failed —', e.message);
      recover('watchdog:getState');
    }
  }, 3 * 60 * 1000).unref();
}

async function downloadWithRetry(msg, attempts = 2) {
  for (let i = 1; i <= attempts; i++) {
    // Primary: manual CDN download + Node-side decrypt (bypasses the broken
    // in-browser downloadAndMaybeDecrypt).
    try {
      const media = await downloadMediaManual(msg);
      if (media && media.data) { log.ok('media via manual decrypt', media.mimetype); return media; }
    } catch (e) {
      log.warn(`manual media attempt ${i} failed: ${(e && e.message) || e}`);
    }
    // Fallback: the library's own download (works on unaffected setups).
    try {
      const media = await msg.downloadMedia();
      if (media && media.data) { log.ok('media via library download'); return media; }
    } catch (e) {
      log.warn(`library downloadMedia attempt ${i} failed: ${(e && e.message) || e}`);
    }
    if (i < attempts) await new Promise((r) => setTimeout(r, 1200));
  }
  return null;
}

// WhatsApp's "LID" (hidden-number) chats arrive as '<lid>@lid', which is NOT the
// customer's real phone — so it won't match a booking made on the website with
// their real number. Resolve the real phone from the contact so lookups line up.
// Returns an id toLocal() can normalise (e.g. '923...@c.us' or '923...').
async function resolveLookupId(msg, from) {
  if (!String(from).includes('@lid')) return from;
  try {
    const contact = await msg.getContact();
    if (contact) {
      const sid = contact.id && contact.id._serialized;
      if (sid && sid.includes('@c.us')) { log.step('resolved @lid -> real', sid); return sid; }
      if (contact.number) { log.step('resolved @lid -> number', contact.number); return String(contact.number); }
    }
    // Fallback: some builds expose the phone on the raw message data.
    const alt = msg._data && (msg._data.author || msg._data.peerRecipientPn || msg._data.senderPn);
    if (alt && String(alt).includes('@c.us')) { log.step('resolved @lid via _data', alt); return String(alt); }
  } catch (e) { log.warn('resolveLookupId failed:', (e && e.message) || e); }
  log.warn('could not resolve real number for', from, '- using lid');
  return from;
}

async function handleIncoming(msg) {
  const from = msg && msg.from;
  try {
    if (msg.fromMe || msg.isStatus) return;
    const orchestrator = require('../agents/orchestrator'); // lazy — breaks require cycle
    const lookupId = await resolveLookupId(msg, from); // real phone for @lid chats

    if (msg.hasMedia) {
      log.step('media message from', from, 'type:', msg.type);
      const media = await downloadWithRetry(msg);
      if (!media) {
        log.error('media download failed after retries for', from);
        await sendMessage(from, '⚠️ Aapki image download nahi ho saki. Please dobara bhej dein — behtar ho ga agar *Gallery/Photos* se bhejein (Document ke bajaye).');
        return;
      }
      const mime = media.mimetype || '';
      log.step('media downloaded', 'mime:', mime, 'bytes:', media.data ? media.data.length : 0);
      if (mime.startsWith('image/')) {
        log.step('payment proof (image) received from', from);
        return orchestrator.handleImage(from, media.data, msg.body || '', lookupId);
      }
      if (mime === 'application/pdf') {
        log.step('pdf received from', from);
        return sendMessage(from, '📄 Receipt mil gayi. Verify karne ke liye please us ka *photo ya screenshot (image)* bhej dein.');
      }
      // Some slips arrive as a generic document with no/odd mimetype — try as image.
      log.step('non-image media, trying as image', mime);
      return orchestrator.handleImage(from, media.data, msg.body || '', lookupId);
    }

    log.step('message from', from, JSON.stringify(msg.body || ''));
    return orchestrator.handleMessage(from, msg.body || '', lookupId);
  } catch (e) {
    log.error('incoming handler error:', (e && e.stack) || (e && e.message) || e);
    try { if (from) await sendMessage(from, '⚠️ Kuch masla ho gaya message process karne mein. Dobara try karein.'); } catch {}
  }
}

async function sendMessage(number, text) {
  // Incoming chats can be @c.us, @lid or @g.us — reply to those verbatim; only
  // raw phone numbers get reformatted into a WhatsApp id.
  const raw = String(number || '');
  if (!client || !ready) {
    outbox.push({ waId: raw.includes('@') ? raw : toWaId(number), text });
    log.warn('WhatsApp not ready — queued message to', raw);
    return;
  }

  // For a raw phone number, ask WhatsApp for the real sendable id. This resolves
  // the newer LID addressing (avoids "No LID for user") and tells us if the
  // number isn't on WhatsApp at all.
  let waId;
  if (raw.includes('@')) {
    waId = raw;
  } else {
    try {
      const numId = await client.getNumberId(toIntl(number));
      if (!numId) { log.warn('number not on WhatsApp — skipping', toIntl(number)); return; }
      waId = numId._serialized;
    } catch (e) {
      log.warn('getNumberId failed, using fallback id', e.message);
      waId = toWaId(number);
    }
  }

  try {
    await client.sendMessage(waId, text);
    log.ok('sent WhatsApp message to', waId);
  } catch (e) {
    log.error('sendMessage failed', e.message);
    // If the browser page died, requeue and rebuild so the message isn't lost.
    if (isFatalBrowserError(e)) {
      outbox.push({ waId, text });
      recover('sendMessage:' + e.message.slice(0, 40));
    }
  }
}

function flush() {
  while (outbox.length) {
    const { waId, text } = outbox.shift();
    client.sendMessage(waId, text)
      .then(() => log.ok('sent queued message to', waId))
      .catch((e) => {
        log.error('flush send failed', e.message);
        if (isFatalBrowserError(e)) { outbox.push({ waId, text }); recover('flush:' + e.message.slice(0, 40)); }
      });
  }
}

module.exports = { initWhatsApp, sendMessage, isReady: () => ready, getLastQr: () => lastQr };
