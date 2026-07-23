'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle2, CalendarDays, Clock, LogIn, UserPlus, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { DAYS } from '@/lib/constants';
import { formatTime, formatPrice } from '@/lib/format';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export interface BookingSlot {
  id: number;
  day_of_week: number;
  start_time: string;
  end_time: string;
  price: number | string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  slot: BookingSlot | null;
  venueName: string;
  sportName: string;
  initialDate?: string;
  onBooked?: () => void;
}

interface Availability {
  window_start: string;
  window_end: string;
  per_hour: string | number;
  discount: null | { dtype: string; value: number; days: number[]; valid_until: string | null; label: string };
  booked_ranges: { start: string; end: string }[];
}

const hourOf = (t: string) => parseInt(t.split(':')[0], 10);
const pad = (h: number) => `${String(h).padStart(2, '0')}:00:00`;

function priceFor(perHour: number, hours: number, availability: Availability | null, date: string) {
  const subtotal = perHour * hours;
  const d = availability?.discount;
  let discountAmount = 0;
  let label: string | null = null;
  if (d) {
    const weekday = (() => { const js = new Date(date + 'T00:00:00').getDay(); return js === 0 ? 6 : js - 1; })();
    const dayOk = !d.days.length || d.days.includes(weekday);
    const notExpired = !d.valid_until || date <= d.valid_until;
    if (dayOk && notExpired) {
      discountAmount = d.dtype === 'percentage' ? (subtotal * d.value) / 100 : Math.min(d.value, subtotal);
      label = d.label;
    }
  }
  return { subtotal, discountAmount, total: subtotal - discountAmount, label };
}

export default function BookingModal({ open, onClose, slot, venueName, sportName, initialDate, onBooked }: Props) {
  const user = typeof window !== 'undefined' ? getCurrentUser() : null;
  const [date, setDate] = useState(initialDate ?? '');
  const [availability, setAvailability] = useState<Availability | null>(null);
  const [loadingAvail, setLoadingAvail] = useState(false);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [duration, setDuration] = useState(1);
  const [whatsapp, setWhatsapp] = useState('');
  const [step, setStep] = useState<'select' | 'confirm' | 'success'>('select');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

  // Reset when (re)opened.
  useEffect(() => {
    if (open) {
      setDate(initialDate ?? '');
      setAvailability(null);
      setStartHour(null);
      setDuration(1);
      setStep('select');
      setResult(null);
      setError('');
      // Prefill WhatsApp from the account profile.
      if (user) api.auth.me().then((me: any) => setWhatsapp(me?.whatsapp || '')).catch(() => {});
    }
  }, [open, initialDate]); // eslint-disable-line react-hooks/exhaustive-deps

  const dateMatchesDay = useMemo(() => {
    if (!date || !slot) return false;
    const js = new Date(date + 'T00:00:00').getDay();
    const ourDay = js === 0 ? 6 : js - 1;
    return ourDay === slot.day_of_week;
  }, [date, slot]);

  // Load availability once we have a valid date.
  useEffect(() => {
    if (!open || !slot || !date || !dateMatchesDay) { setAvailability(null); return; }
    setLoadingAvail(true);
    api.slots.availability(slot.id, date)
      .then((a: any) => setAvailability(a))
      .catch(() => setAvailability(null))
      .finally(() => setLoadingAvail(false));
  }, [open, slot, date, dateMatchesDay]);

  // Windows ending at midnight store end as 00:00 — treat it as 24:00.
  const winStart = availability ? hourOf(availability.window_start) : 0;
  const winEndRaw = availability ? hourOf(availability.window_end) : 0;
  const winEnd = availability && winEndRaw <= winStart ? winEndRaw + 24 : winEndRaw;
  const endH = (s: string) => { const h = hourOf(s); return h === 0 ? 24 : h; };

  const hourBooked = (h: number) =>
    (availability?.booked_ranges ?? []).some((r) => h >= hourOf(r.start) && h < endH(r.end));

  const startOptions = useMemo(() => {
    const opts: number[] = [];
    for (let h = winStart; h < winEnd; h++) if (!hourBooked(h)) opts.push(h);
    return opts;
  }, [availability]); // eslint-disable-line react-hooks/exhaustive-deps

  // Split the window into the actually-available sub-ranges (window minus booked
  // ranges), e.g. a 6PM–12AM slot booked 8–11PM => [6–8PM, 11PM–12AM].
  const freeRanges = useMemo(() => {
    const ranges: { start: number; end: number }[] = [];
    let cur: { start: number; end: number } | null = null;
    for (let h = winStart; h < winEnd; h++) {
      if (!hourBooked(h)) {
        if (cur) cur.end = h + 1; else cur = { start: h, end: h + 1 };
      } else if (cur) { ranges.push(cur); cur = null; }
    }
    if (cur) ranges.push(cur);
    return ranges;
  }, [availability]); // eslint-disable-line react-hooks/exhaustive-deps

  const durationValid = (h: number, dur: number) => {
    if (h + dur > winEnd) return false;
    for (let x = h; x < h + dur; x++) if (hourBooked(x)) return false;
    return true;
  };

  const perHour = availability ? Number(availability.per_hour) : Number(slot?.price ?? 0);
  const price = startHour !== null ? priceFor(perHour, duration, availability, date) : null;
  const canContinue = date && dateMatchesDay && startHour !== null && durationValid(startHour, duration);

  // Send midnight as 00:00; display hours >= 24 as their next-day clock time.
  const sendTime = (h: number) => pad(h % 24);
  const dispTime = (h: number) => formatTime(pad(h % 24));
  const advance = price ? Math.round(price.total / 2) : 0;

  const confirmBooking = async () => {
    if (!slot || startHour === null) return;
    if (whatsapp.trim().length < 10) { setError('Enter a valid WhatsApp number'); return; }
    setError('');
    setSubmitting(true);
    try {
      const res: any = await api.bookings.create({
        slot_id: slot.id,
        booking_date: date,
        start_time: sendTime(startHour),
        end_time: sendTime(startHour + duration),
        booked_by_phone: whatsapp.trim(),
      });
      setResult(res);
      setStep('success');
      toast.success('Booking placed!');
      onBooked?.();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!slot) return null;

  // Not logged in → login gate.
  if (open && !user) {
    return (
      <Modal isOpen={open} onClose={onClose} title="Login required">
        <div className="text-center py-4">
          <p className="text-muted text-sm mb-6">Please login or register to book this slot.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="btn-primary rounded-full px-5"><LogIn className="w-4 h-4" /> Login</Link>
            <Link href="/register" className="btn-secondary rounded-full px-5"><UserPlus className="w-4 h-4" /> Register</Link>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen={open}
      onClose={onClose}
      title={step === 'success' ? undefined : `Book ${sportName} · ${venueName}`}
    >
      {step === 'select' && (
        <div className="space-y-5">
          {/* Date */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Date ({DAYS[slot.day_of_week]} only)</label>
            <div className="relative">
              <CalendarDays className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input type="date" className="input-field pl-10" value={date} onChange={(e) => { setDate(e.target.value); setStartHour(null); }} />
            </div>
            {date && !dateMatchesDay && (
              <p className="text-sm text-danger mt-1">This slot is only available on {DAYS[slot.day_of_week]}.</p>
            )}
          </div>

          {dateMatchesDay && (
            <>
              <div className="rounded-lg bg-surface-muted p-3 text-sm flex items-start gap-2">
                <Clock className="w-4 h-4 text-muted mt-0.5 flex-shrink-0" />
                <span className="text-muted">Available:</span>
                <span className="font-semibold text-ink">
                  {!availability
                    ? `${formatTime(slot.start_time)} – ${formatTime(slot.end_time)}`
                    : freeRanges.length === 0
                      ? 'Fully booked'
                      : freeRanges.map((r) => `${dispTime(r.start)} – ${dispTime(r.end)}`).join('  ·  ')}
                </span>
              </div>

              {loadingAvail ? (
                <p className="text-sm text-muted">Loading availability…</p>
              ) : startOptions.length === 0 ? (
                <p className="text-sm text-danger">Fully booked for this date. Please pick another day.</p>
              ) : (
                <>
                  {/* Start time */}
                  <div>
                    <label className="block text-sm font-semibold text-ink mb-1.5">Start Time</label>
                    <select className="input-field" value={startHour ?? ''} onChange={(e) => { setStartHour(Number(e.target.value)); setDuration(1); }}>
                      <option value="">Select start time</option>
                      {startOptions.map((h) => <option key={h} value={h}>{dispTime(h)}</option>)}
                    </select>
                  </div>

                  {/* Duration */}
                  {startHour !== null && (
                    <div>
                      <label className="block text-sm font-semibold text-ink mb-1.5">Duration</label>
                      <div className="flex gap-2">
                        {[1, 2, 3, 4].map((d) => (
                          <button key={d} type="button" disabled={!durationValid(startHour, d)}
                            onClick={() => setDuration(d)}
                            className={`px-4 py-2 rounded-lg text-sm font-semibold border transition disabled:opacity-40 disabled:cursor-not-allowed ${
                              duration === d ? 'bg-primary text-white border-primary' : 'bg-white text-ink border-line hover:bg-surface-muted'
                            }`}>
                            {d} hr
                          </button>
                        ))}
                      </div>
                      <p className="text-sm text-muted mt-2">
                        Duration: {duration} hour{duration > 1 ? 's' : ''} · {dispTime(startHour)} – {dispTime(startHour + duration)}
                      </p>
                    </div>
                  )}

                  {/* Price summary (live) */}
                  {price && (
                    <div className="rounded-lg border border-line p-4 space-y-1.5 text-sm">
                      <div className="flex justify-between"><span className="text-muted">Rate</span><span className="font-medium text-ink">{formatPrice(perHour)}/hour</span></div>
                      <div className="flex justify-between"><span className="text-muted">Duration</span><span className="font-medium text-ink">{duration} hour{duration > 1 ? 's' : ''}</span></div>
                      <div className="flex justify-between"><span className="text-muted">Subtotal</span><span className="font-medium text-ink">{formatPrice(price.subtotal)}</span></div>
                      {price.label && (
                        <div className="flex justify-between text-green-600"><span className="flex items-center gap-1"><Tag className="w-3.5 h-3.5" /> Discount: {price.label}</span><span>- {formatPrice(price.discountAmount)}</span></div>
                      )}
                      <div className="flex justify-between pt-1.5 border-t border-line">
                        <span className="font-bold text-ink">Total</span>
                        <span className={`font-bold ${price.label ? 'text-green-600' : 'text-ink'}`}>{formatPrice(price.total)}</span>
                      </div>
                      <div className="flex justify-between text-muted"><span>Advance (50%)</span><span>{formatPrice(advance)}</span></div>
                      <div className="flex justify-between text-muted"><span>Remaining at venue</span><span>{formatPrice(price.total - advance)}</span></div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          <div className="flex justify-end gap-3 pt-1">
            <Button variant="secondary" onClick={onClose} className="rounded-full px-5">Cancel</Button>
            <Button disabled={!canContinue} onClick={() => setStep('confirm')} className="rounded-full px-5">Continue</Button>
          </div>
        </div>
      )}

      {step === 'confirm' && price && startHour !== null && (
        <div className="space-y-4">
          <div className="rounded-lg bg-surface-muted p-4 text-sm space-y-1">
            <p className="font-bold text-ink">{venueName}</p>
            <p className="text-muted">{sportName} · {date}</p>
            <p className="text-muted">{dispTime(startHour)} – {dispTime(startHour + duration)} · {duration} hr</p>
            <p className="font-bold text-ink pt-1">Total: {formatPrice(price.total)} · Advance {formatPrice(advance)}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Your WhatsApp Number</label>
            <input className="input-field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="03XX XXXXXXX" />
          </div>
          <p className="text-xs text-muted flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#25D366]" /> Venue owner will contact you on WhatsApp to confirm payment.
          </p>
          {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex justify-between gap-3 pt-1">
            <Button variant="secondary" onClick={() => setStep('select')} className="rounded-full px-5">Back</Button>
            <Button onClick={confirmBooking} loading={submitting} className="rounded-full px-5">Confirm Booking</Button>
          </div>
        </div>
      )}

      {step === 'success' && result && (
        <div className="text-center py-4">
          <CheckCircle2 className="w-14 h-14 text-primary mx-auto mb-3" />
          <h3 className="text-xl font-bold text-ink mb-1">Booking Placed!</h3>
          <p className="text-muted text-sm">Reference <span className="font-mono font-semibold text-ink">#{result.reference}</span></p>
          <div className="rounded-lg bg-surface-muted p-4 text-sm text-left mt-4 space-y-1">
            <p className="font-bold text-ink">{venueName}</p>
            <p className="text-muted">{sportName} · {result.booking_date}</p>
            <p className="text-muted">{formatTime(result.start_time)} – {formatTime(result.end_time)} · {result.hours} hr</p>
            <p className="font-bold text-ink">Total: {formatPrice(result.amount)}</p>
            <p className="text-xs text-amber-600 pt-1">Status: Pending — the venue will confirm on WhatsApp.</p>
          </div>
          <div className="flex gap-3 justify-center mt-5">
            <Link href="/bookings" className="btn-primary rounded-full px-5">My Bookings</Link>
            <Button variant="secondary" onClick={onClose} className="rounded-full px-5">Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
