// Convert a stored Pakistani number ('03001234567' or '+92 300 1234567')
// to the wa.me international format '923001234567'.
export function toWaNumber(raw: string): string {
  let d = (raw || '').replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return '92' + d;
}

// Build a wa.me deep link with an optional pre-filled message.
export function waLink(raw: string, message?: string): string {
  const base = `https://wa.me/${toWaNumber(raw)}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
