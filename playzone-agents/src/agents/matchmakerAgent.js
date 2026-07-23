// Matchmaker Agent — finds players/opponents for a user.
const db = require('../tools/database');
const { sendMessage } = require('../tools/whatsapp');
const { toIntl } = require('../utils/phone');
const log = require('../utils/logger');

async function handle(from, _text, user) {
  log.step('matchmakerAgent for', from);
  const players = await db.searchPlayers({ city: user && user.city });
  if (!players.length) {
    await sendMessage(from, '👥 Abhi koi player nahi mila. Baad mein try karein ya website par "Find Opponents" dekhein.');
    return;
  }
  const lines = players.slice(0, 8).map((p) => {
    const wa = p.phone ? `wa.me/${toIntl(p.phone)}` : '';
    return `• ${p.full_name} (${p.city})${p.experience_level ? ' — ' + p.experience_level : ''}${wa ? ' — ' + wa : ''}`;
  });
  await sendMessage(from, `👥 *Players mile:*\n${lines.join('\n')}\n\nKisi se baat karne ke liye uska wa.me link kholein.`);
}

module.exports = { handle };
