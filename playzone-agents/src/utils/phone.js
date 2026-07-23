// Phone-number helpers. The DB stores Pakistani numbers in local form
// '03XXXXXXXXX'; whatsapp-web.js uses international ids like '923001234567@c.us'.

function digitsOnly(raw) {
  return String(raw || '').replace(/\D/g, '');
}

// Any input -> local '03XXXXXXXXX'
function toLocal(raw) {
  let d = digitsOnly(raw);
  if (d.endsWith('c.us')) d = d.replace('cus', ''); // safety, already stripped by digitsOnly
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return '0' + d; // d is now the 10-digit '3XXXXXXXXX'
}

// Any input -> WhatsApp chat id '923XXXXXXXXX@c.us'
function toWaId(raw) {
  const local = toLocal(raw); // 03XXXXXXXXX
  return '92' + local.slice(1) + '@c.us';
}

// Any input -> bare international '923XXXXXXXXX'
function toIntl(raw) {
  return '92' + toLocal(raw).slice(1);
}

module.exports = { digitsOnly, toLocal, toWaId, toIntl };
