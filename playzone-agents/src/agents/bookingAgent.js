// Booking Agent — drives the full booking conversation with GPT-4o function
// calling. Tools: search_slots, hold_slot, create_booking, get_venue_details.
// After create_booking it auto-sends payment instructions and schedules a
// 30-minute hold-expiry job.
require('dotenv').config();
const OpenAI = require('openai');
const db = require('../tools/database');
const { sendMessage, paymentInstructions } = require('../tools/notifications');
const { scheduleHoldExpiry } = require('../tools/scheduler');
const log = require('../utils/logger');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const HOLD_MINUTES = Number(process.env.HOLD_MINUTES || 90);

const TOOLS = [
  {
    type: 'function',
    function: {
      name: 'search_slots',
      description: 'Search available courts/slots by city, sport and/or date.',
      parameters: {
        type: 'object',
        properties: {
          city: { type: 'string', description: 'City name, e.g. Lahore' },
          sport: { type: 'string', description: 'Sport name, e.g. Futsal, Badminton, Cricket' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD (optional)' },
        },
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'hold_slot',
      description: 'Temporarily hold a slot for the user while they decide (soft hold).',
      parameters: { type: 'object', properties: { slot_id: { type: 'integer' } }, required: ['slot_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'create_booking',
      description: 'Create a pending booking. Returns advance amount and booking ref. Triggers payment instructions.',
      parameters: {
        type: 'object',
        properties: {
          slot_id: { type: 'integer' },
          booking_date: { type: 'string', description: 'YYYY-MM-DD' },
          start_time: { type: 'string', description: 'HH:MM (24h)' },
          end_time: { type: 'string', description: 'HH:MM (24h), 00:00 = midnight' },
          user_name: { type: 'string' },
        },
        required: ['slot_id', 'booking_date', 'start_time', 'end_time'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_venue_details',
      description: 'Get a venue address and payment info.',
      parameters: { type: 'object', properties: { venue_id: { type: 'integer' } }, required: ['venue_id'] },
    },
  },
];

function systemPrompt(userName) {
  return `You are PlayZone booking assistant. Help users book indoor sports courts.
Communicate naturally in Urdu/English mixed (Hinglish). Be friendly, brief, and helpful.
Current date: ${new Date().toISOString().slice(0, 10)}
User name: ${userName || 'Player'}
Times are 24h HH:MM. A slot's price is PER HOUR; total = hours × rate.
Available tools: search_slots, hold_slot, create_booking, get_venue_details.
When the user confirms a specific slot/time, call create_booking. Do not invent slot ids — use search_slots first.`;
}

// `identity` = real phone for DB writes; `replyTo` = the chat to message (may be @lid).
async function runTool(name, args, identity, replyTo = identity) {
  const from = identity;
  log.step('bookingAgent tool', name, JSON.stringify(args));
  switch (name) {
    case 'search_slots': {
      const sportId = args.sport ? await db.resolveSportId(args.sport) : null;
      const slots = await db.searchSlots({ city: args.city, sport: sportId, date: args.date });
      return slots.slice(0, 8).map((s) => ({
        slot_id: s.slot_id, venue_id: s.venue_id, venue: s.venue_name, city: s.city, area: s.area,
        start: String(s.start_time).slice(0, 5), end: String(s.end_time).slice(0, 5),
        per_hour_rate: Number(s.per_hour_rate),
      }));
    }
    case 'hold_slot':
      return { ok: true, note: `Slot ${HOLD_MINUTES} min ke liye hold hai. Confirm karne ke liye time & date batayein.` };
    case 'get_venue_details': {
      const v = await db.getVenueDetails(args.venue_id);
      if (!v) return { error: 'venue_not_found' };
      return {
        name: v.name, address: v.address, city: v.city, area: v.area,
        owner_whatsapp: v.owner_whatsapp,
        payment: v.payment_config ? { method: v.payment_config.method, account: v.payment_config.account_number, name: v.payment_config.account_name } : null,
      };
    }
    case 'create_booking': {
      const booking = await db.createBooking({
        whatsappNumber: from,
        userName: args.user_name,
        slotId: args.slot_id,
        bookingDate: args.booking_date,
        startTime: args.start_time.length === 5 ? args.start_time + ':00' : args.start_time,
        endTime: args.end_time.length === 5 ? args.end_time + ':00' : args.end_time,
      });
      // Persist which booking this conversation is paying for (payment agent reads this).
      await db.saveConversation(from, [], booking.id);

      const cfg = await db.getPaymentConfig(booking.venue_id);
      if (cfg) {
        await sendMessage(replyTo, paymentInstructions(cfg, booking));
      } else {
        await sendMessage(replyTo, '⚠️ Venue ne abhi payment details set nahi kiye. Venue se rabta karein.');
      }
      await scheduleHoldExpiry(booking.id, replyTo);

      // Notify the venue owner that a slot was booked.
      try {
        const venue = await db.getVenueDetails(booking.venue_id);
        if (venue && venue.owner_whatsapp) {
          const ownerMsg = `🔔 *Nayi Booking!* (PlayZone)
🏟️ ${venue.name}
📅 ${booking.booking_date}  ⏰ ${String(booking.start_time).slice(0, 5)}-${String(booking.end_time).slice(0, 5)} (${booking.hours} hr)
👤 Customer: ${booking.booked_by_name || 'Customer'} (${booking.booked_by_phone || '-'})
💰 Total: PKR ${Number(booking.amount)}  |  Advance: PKR ${Number(booking.advance_amount)}
Status: ⏳ Payment pending
🔖 Ref: #${booking.booking_ref}`;
          await sendMessage(venue.owner_whatsapp, ownerMsg);
          log.ok('notified venue owner', venue.owner_whatsapp);
        }
      } catch (e) { log.warn('owner notify failed', e.message); }

      return {
        booking_id: booking.id, booking_ref: booking.booking_ref,
        total_amount: Number(booking.amount), advance_amount: Number(booking.advance_amount),
        remaining_amount: Number(booking.remaining_amount),
        note: `Payment instructions bhej di gayi hain. ${HOLD_MINUTES} min mein screenshot bhejein.`,
      };
    }
    default:
      return { error: 'unknown_tool' };
  }
}

// history: array of {role, content} (prior turns). Returns { reply, history }.
// `from` = real identity for DB writes; `replyTo` = chat to message (may be @lid).
async function handle(from, text, history = [], userName = 'Player', replyTo = from) {
  const messages = [{ role: 'system', content: systemPrompt(userName) }, ...history, { role: 'user', content: text }];

  for (let i = 0; i < 6; i++) {
    const resp = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.4,
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
    });
    const m = resp.choices[0].message;
    messages.push(m);

    if (m.tool_calls && m.tool_calls.length) {
      for (const tc of m.tool_calls) {
        let out;
        try {
          out = await runTool(tc.function.name, JSON.parse(tc.function.arguments || '{}'), from, replyTo);
        } catch (e) {
          log.error('tool error', tc.function.name, e.message);
          out = { error: e.message };
        }
        messages.push({ role: 'tool', tool_call_id: tc.id, content: JSON.stringify(out) });
      }
      continue; // let the model read tool results
    }

    const reply = m.content || 'Kaisay help karun? "book" likhein slot dhundne ke liye.';
    // Return trimmed history (drop the system prompt) for the orchestrator to persist.
    return { reply, history: messages.slice(1) };
  }
  return { reply: 'Thodi confusion ho gayi 😅 — dobara batayein kya book karna hai?', history: messages.slice(1) };
}

module.exports = { handle };
