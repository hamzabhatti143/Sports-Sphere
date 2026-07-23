export interface DiscountPreview {
  dtype: string;
  value: number;
  days: number[];
  valid_until: string | null;
  label: string;
}

// Is a venue discount active for a given YYYY-MM-DD date? (mirrors backend rules)
export function discountActiveOn(discount: DiscountPreview | null | undefined, date: string): boolean {
  if (!discount) return false;
  const js = new Date(date + 'T00:00:00').getDay();
  const weekday = js === 0 ? 6 : js - 1; // 0=Mon..6=Sun
  const dayOk = !discount.days?.length || discount.days.includes(weekday);
  const notExpired = !discount.valid_until || date <= discount.valid_until;
  return dayOk && notExpired;
}

// Returns { hasDiscount, final, label } for a card price on a given date.
export function applyDiscount(price: number, discount: DiscountPreview | null | undefined, date: string) {
  if (!discountActiveOn(discount, date) || !discount) return { hasDiscount: false, final: price, label: null as string | null };
  const off = discount.dtype === 'percentage' ? (price * discount.value) / 100 : Math.min(discount.value, price);
  return { hasDiscount: true, final: Math.max(0, price - off), label: discount.label };
}
