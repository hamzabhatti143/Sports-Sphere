export type SlotStatus = 'available' | 'booked' | 'expired';

interface StatusSlot {
  end_time: string;
  booked_dates: string[];
}

// Determine a slot card's status for the date it refers to (refDate = searched date or next_date).
export function slotStatus(slot: StatusSlot, refDate: string): SlotStatus {
  const today = new Date().toISOString().slice(0, 10);
  if (refDate < today) return 'expired';
  if (refDate === today) {
    const [eh, em] = slot.end_time.split(':').map(Number);
    let endMin = eh * 60 + (em || 0);
    if (endMin === 0) endMin = 24 * 60; // midnight = end of day
    const now = new Date();
    if (endMin <= now.getHours() * 60 + now.getMinutes()) return 'expired';
  }
  if (slot.booked_dates?.includes(refDate)) return 'booked';
  return 'available';
}

export interface TimeRange { start: string; end: string } // 'HH:MM'

// Split a slot window into its still-available sub-ranges (window minus booked
// ranges). e.g. window 18:00–00:00 with 20:00–23:00 booked => [18:00–20:00, 23:00–00:00].
export function freeRanges(windowStart: string, windowEnd: string, booked: TimeRange[] = []): TimeRange[] {
  const hourOf = (t: string) => parseInt(t.split(':')[0], 10);
  const ws = hourOf(windowStart);
  let we = hourOf(windowEnd);
  if (we <= ws) we += 24; // window ending at/after midnight
  const isBooked = (h: number) =>
    booked.some((r) => {
      let bs = hourOf(r.start);
      let be = hourOf(r.end);
      if (be <= bs) be += 24;
      if (bs < ws) { bs += 24; be += 24; } // normalise a past-midnight booked range
      return h >= bs && h < be;
    });
  const pad = (h: number) => `${String(h % 24).padStart(2, '0')}:00`;
  const ranges: TimeRange[] = [];
  let cur: { s: number; e: number } | null = null;
  for (let h = ws; h < we; h++) {
    if (!isBooked(h)) { if (cur) cur.e = h + 1; else cur = { s: h, e: h + 1 }; }
    else if (cur) { ranges.push({ start: pad(cur.s), end: pad(cur.e) }); cur = null; }
  }
  if (cur) ranges.push({ start: pad(cur.s), end: pad(cur.e) });
  return ranges;
}

export type DateGroup = 'Today' | 'Tomorrow' | 'This Week' | 'Upcoming';
export const DATE_GROUP_ORDER: DateGroup[] = ['Today', 'Tomorrow', 'This Week', 'Upcoming'];

export function dateGroup(dateStr: string): DateGroup {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff <= 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff <= 7) return 'This Week';
  return 'Upcoming';
}
