// Format a "HH:MM:SS" or "HH:MM" time string into "4:00 PM"
export function formatTime(time: string): string {
  if (!time) return '';
  const [hStr, mStr] = time.split(':');
  let hour = parseInt(hStr, 10);
  const minute = mStr ?? '00';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12 || 12;
  return `${hour}:${minute} ${ampm}`;
}

// Format a time range: "4:00 PM – 6:00 PM"
export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

// Relative time like "2 hours ago", "3 days ago", from an ISO timestamp.
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return '';
  const secs = Math.max(0, Math.floor((Date.now() - then) / 1000));
  const units: [number, string][] = [
    [60, 'second'], [60, 'minute'], [24, 'hour'], [30, 'day'], [12, 'month'], [Infinity, 'year'],
  ];
  let value = secs;
  let unit = 'second';
  for (let i = 0; i < units.length; i++) {
    unit = units[i][1];
    if (value < units[i][0]) break;
    value = Math.floor(value / units[i][0]);
  }
  if (unit === 'second' && value < 30) return 'just now';
  return `${value} ${unit}${value === 1 ? '' : 's'} ago`;
}

// Format a price (string or number) as "PKR 1,200"
export function formatPrice(price: string | number | null | undefined): string {
  if (price === null || price === undefined || price === '') return 'Contact Venue';
  const n = typeof price === 'string' ? parseFloat(price) : price;
  if (Number.isNaN(n)) return 'Contact Venue';
  return `PKR ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
