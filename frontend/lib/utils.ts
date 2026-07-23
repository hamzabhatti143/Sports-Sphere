export function formatTime(t: string): string {
  if (!t) return '';
  const [h, m] = t.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatDay(day: number): string {
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return days[day] ?? '';
}

export function formatDayShort(day: number): string {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days[day] ?? '';
}

export function getInitials(name: string): string {
  if (!name) return 'VO';
  return name.trim().split(' ').map((w) => w[0]).join('').toUpperCase().slice(0, 2) || 'VO';
}

export function formatPKR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return 'PKR 0';
  const n = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (Number.isNaN(n)) return 'PKR 0';
  return `PKR ${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
}
