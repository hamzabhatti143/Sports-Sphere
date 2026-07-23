'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Search, MapPin, Calendar, ChevronDown, Zap, X,
  Feather, Target, Circle, CircleDot, Disc,
} from 'lucide-react';
import { api } from '@/lib/api';
import { SPORTS, getSportName } from '@/lib/constants';
import { formatTimeRange, formatPKR, formatDayShort } from '@/lib/utils';
import { applyDiscount, DiscountPreview } from '@/lib/discount';
import { slotStatus, dateGroup, DATE_GROUP_ORDER, DateGroup, freeRanges } from '@/lib/slotstatus';
import BookingModal, { BookingSlot } from '@/components/booking/BookingModal';

interface Slot {
  id: number; venue_id: number; venue_name: string; venue_slug: string; venue_city: string; venue_area: string;
  sport_id: number; day_of_week: number; slot_date?: string | null; next_date?: string | null;
  start_time: string; end_time: string; price: number | string; booked_dates: string[];
  booked_ranges?: { start: string; end: string }[];
  discount?: DiscountPreview | null;
}

const POPULAR = [
  { label: 'Badminton', sportId: 3, Icon: Feather },
  { label: 'Futsal', sportId: 1, Icon: Zap },
  { label: 'Cricket (Indoor)', sportId: 2, Icon: Target },
  { label: 'Table Tennis', sportId: 5, Icon: Circle },
  { label: 'Basketball', sportId: null, Icon: CircleDot },
  { label: 'Snooker', sportId: null, Icon: Disc },
];

// Highlight matched search term inside a string.
function Highlight({ text, term }: { text: string; term: string }) {
  if (!term || term.length < 2) return <>{text}</>;
  const i = text.toLowerCase().indexOf(term.toLowerCase());
  if (i === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="bg-yellow-200 text-inherit rounded px-0.5">{text.slice(i, i + term.length)}</mark>
      {text.slice(i + term.length)}
    </>
  );
}

export default function HomePage() {
  const [date, setDate] = useState(''); // empty = Any Date
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [sport, setSport] = useState('');
  const [q, setQ] = useState('');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [allCities, setAllCities] = useState<string[]>([]);
  const [allAreas, setAllAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [bookingSlot, setBookingSlot] = useState<Slot | null>(null);
  const didInit = useRef(false);

  const searchSlots = useCallback(async () => {
    setLoading(true);
    try {
      const results = (await api.slots.search({
        date, city: city || undefined, area: area || undefined, sport: sport ? parseInt(sport) : undefined,
      })) as Slot[];
      setSlots(results);
      if (!city && !area && !sport) {
        setAllCities([...new Set(results.map((s) => s.venue_city).filter(Boolean))]);
        setAllAreas([...new Set(results.map((s) => s.venue_area).filter(Boolean))]);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [date, city, area, sport]);

  // Initialize from URL params on first mount.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('search')) setQ(p.get('search')!);
    if (p.get('city')) setCity(p.get('city')!);
    if (p.get('sport')) setSport(p.get('sport')!);
    didInit.current = true;
    searchSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the URL in sync (shareable/bookmarkable) — debounced.
  useEffect(() => {
    if (!didInit.current) return;
    const t = setTimeout(() => {
      const p = new URLSearchParams();
      if (q) p.set('search', q);
      if (city) p.set('city', city);
      if (sport) p.set('sport', sport);
      const qs = p.toString();
      window.history.replaceState(null, '', qs ? `/?${qs}` : '/');
    }, 300);
    return () => clearTimeout(t);
  }, [q, city, sport]);

  const today = new Date().toISOString().slice(0, 10);
  // The date a card refers to: the searched date, or the slot's next occurrence.
  const refDateOf = (s: Slot) => date || s.next_date || today;

  // Client-side live text filter (min 2 chars), AND-combined with dropdown filters.
  const visibleSlots = useMemo(() => {
    if (q.trim().length < 2) return slots;
    const term = q.trim().toLowerCase();
    return slots.filter((s) =>
      [s.venue_name, getSportName(s.sport_id), s.venue_area, s.venue_city]
        .some((f) => (f || '').toLowerCase().includes(term))
    );
  }, [slots, q]);

  // When no specific date is chosen, group slots by their next occurrence.
  const grouped = useMemo(() => {
    const map: Record<DateGroup, Slot[]> = { Today: [], Tomorrow: [], 'This Week': [], Upcoming: [] };
    for (const s of visibleSlots) map[dateGroup(refDateOf(s))].push(s);
    return map;
  }, [visibleSlots, date]); // eslint-disable-line react-hooks/exhaustive-deps

  const pickSport = (sportId: number | null) => {
    if (sportId === null) { toast('Coming soon!'); return; }
    setSport(String(sportId));
    setTimeout(() => {
      api.slots.search({ date, city: city || undefined, area: area || undefined, sport: sportId })
        .then((r) => setSlots(r as Slot[])).catch(() => {});
      document.getElementById('available-slots')?.scrollIntoView({ behavior: 'smooth' });
    }, 0);
  };

  const selectCls = 'w-full appearance-none bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500';

  const STATUS_BADGE = {
    available: { text: '● Available', cls: 'bg-[#dcfce7] text-[#16a34a]' },
    booked: { text: 'Booked', cls: 'bg-[#fee2e2] text-[#dc2626]' },
    expired: { text: 'Expired', cls: 'bg-[#f3f4f6] text-[#6b7280]' },
  } as const;

  const renderCard = (slot: Slot) => {
    const refDate = refDateOf(slot);
    const status = slotStatus(slot, refDate);
    const when = `${formatDayShort(slot.day_of_week)}${slot.next_date ? `, ${slot.next_date}` : ''} | ${formatTimeRange(slot.start_time, slot.end_time)}`;
    // Available sub-ranges for this date (window minus booked). Only worth showing
    // when the slot is partially booked (i.e. some — but not all — time is taken).
    const free = status === 'available' ? freeRanges(slot.start_time, slot.end_time, slot.booked_ranges || []) : [];
    const isPartiallyBooked = (slot.booked_ranges?.length ?? 0) > 0 && free.length > 0;
    const disc = applyDiscount(Number(slot.price), slot.discount, refDate);
    const badge = STATUS_BADGE[status];
    const dim = status === 'booked' ? 'opacity-85' : status === 'expired' ? 'opacity-70' : '';
    return (
      <div key={slot.id} className={`relative rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex flex-col bg-white ${dim}`}>
        <span className={`absolute top-3 right-3 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.text}</span>
        <div className="pr-20">
          <h3 className="font-bold text-slate-900 leading-tight"><Highlight text={slot.venue_name} term={q} /></h3>
          <p className="flex items-center gap-1 text-sm text-slate-400 mt-1"><MapPin className="w-3.5 h-3.5" /> <Highlight text={`${slot.venue_area}, ${slot.venue_city}`} term={q} /></p>
        </div>
        <span className="text-xs font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full w-fit mt-2">{getSportName(slot.sport_id)}</span>

        <div className="flex items-end justify-between mt-4 mb-2">
          <p className="flex items-center gap-1.5 text-sm text-slate-600"><Calendar className="w-4 h-4 text-slate-400" /> {when}</p>
        </div>

        {isPartiallyBooked && (
          <div className="mb-3 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Available:</span>
            {free.map((r) => (
              <span key={r.start} className="text-[11px] font-semibold bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                {formatTimeRange(r.start, r.end)}
              </span>
            ))}
          </div>
        )}

        {disc.hasDiscount ? (
          <div className="flex items-center gap-2">
            <p className="text-green-600 font-bold">{formatPKR(disc.final)}<span className="text-slate-400 font-normal text-sm"> / hour</span></p>
            <span className="text-slate-400 line-through text-sm">{formatPKR(slot.price)}</span>
            <span className="text-[10px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">{disc.label}</span>
          </div>
        ) : (
          <p className="text-green-600 font-bold">{formatPKR(slot.price)} <span className="text-slate-400 font-normal text-sm">/ hour</span></p>
        )}

        <div className="mt-4">
          {status === 'available' ? (
            <button onClick={() => setBookingSlot(slot)} className="block w-full text-center bg-green-600 hover:bg-green-700 text-white font-semibold py-2.5 rounded-xl transition-colors">Book Now</button>
          ) : status === 'booked' ? (
            <div className="w-full py-2.5 text-center rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold">Unavailable</div>
          ) : (
            <div className="w-full py-2.5 text-center rounded-xl bg-slate-100 text-slate-400 text-sm font-semibold">Slot Expired</div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white">
      {/* ===== HERO ===== */}
      <section className="bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-10 items-center pt-12 pb-8">
            <div>
              <h1 className="text-4xl sm:text-5xl font-extrabold leading-tight text-slate-900">
                Find, Book &amp; Play<br />
                <span className="text-green-600">Indoor Sports</span>
              </h1>
              <p className="mt-4 text-lg text-slate-500 max-w-md">Discover and book the best indoor sports venues near you.</p>
              <div className="mt-6 flex gap-3">
                <a href="#available-slots" className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-full transition-colors">Browse Slots</a>
                <Link href="/opponents" className="border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold px-6 py-3 rounded-full transition-colors">Find Opponents</Link>
              </div>
            </div>
            <div className="relative rounded-3xl overflow-hidden h-64 sm:h-80 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #16a34a 0%, #15803d 60%, #064e3b 100%)' }}>
              <div className="absolute inset-0 opacity-20"
                style={{ backgroundImage: 'radial-gradient(circle at 20% 30%, white 2px, transparent 2px), radial-gradient(circle at 70% 60%, white 2px, transparent 2px)', backgroundSize: '40px 40px' }} />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center text-white">
                  <div className="flex items-center justify-center gap-3 mb-3"><Feather className="w-10 h-10" /><Zap className="w-10 h-10" /><Target className="w-10 h-10" /></div>
                  <p className="font-bold text-2xl tracking-wide">Your Court Awaits</p>
                  <p className="text-white/70 text-sm mt-1">Badminton · Futsal · Cricket &amp; more</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search bar with live text search as first field */}
          <div className="bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 p-4 sm:p-5 -mb-8 relative z-10">
            <div className="relative mb-3">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search by venue name, sport, or area..."
                className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              {q && (
                <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative">
                <select className={selectCls} value={sport} onChange={(e) => setSport(e.target.value)}>
                  <option value="">Select Sport</option>
                  {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <select className={selectCls} value={city} onChange={(e) => setCity(e.target.value)}>
                  <option value="">All Cities</option>
                  {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <select className={selectCls} value={area} onChange={(e) => setArea(e.target.value)}>
                  <option value="">All Areas</option>
                  {allAreas.map((a) => <option key={a} value={a}>{a}</option>)}
                </select>
                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
              <div className="relative">
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="Any Date"
                  className={`w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 ${date ? 'text-slate-800' : 'text-slate-400'}`} />
                {!date && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 bg-white pr-2">Any Date</span>}
                {date && <button onClick={() => setDate('')} className="absolute right-9 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
              </div>
              <button onClick={searchSlots} className="bg-green-600 hover:bg-green-700 text-white font-semibold rounded-xl px-6 py-3 flex items-center justify-center gap-2 transition-colors">
                <Search className="w-4 h-4" /> Search
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ===== POPULAR SPORTS ===== */}
      <section id="popular-sports" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <h2 className="text-2xl font-bold text-slate-900 mb-8">Popular Sports</h2>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-4">
          {POPULAR.map(({ label, sportId, Icon }) => (
            <button key={label} onClick={() => pickSport(sportId)} className="flex flex-col items-center gap-3 group">
              <span className="w-16 h-16 rounded-full bg-green-50 group-hover:bg-green-100 flex items-center justify-center text-green-600 transition-colors"><Icon className="w-7 h-7" /></span>
              <span className="text-sm font-medium text-slate-700 text-center">{label}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ===== AVAILABLE SLOTS ===== */}
      <section id="available-slots" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-20">
        <h2 className="text-2xl font-bold text-slate-900 mb-6">Available Slots</h2>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-100 p-5 animate-pulse">
                <div className="h-5 w-3/4 bg-slate-200 rounded mb-3" />
                <div className="h-3 w-1/2 bg-slate-200 rounded mb-4" />
                <div className="h-3 w-2/3 bg-slate-200 rounded mb-4" />
                <div className="h-9 w-full bg-slate-200 rounded-xl" />
              </div>
            ))}
          </div>
        ) : visibleSlots.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto"><Search className="w-7 h-7 text-slate-400" /></div>
            <p className="text-lg font-bold text-slate-700 mt-4">{q ? `No results found for "${q}"` : 'No slots found'}</p>
            <p className="text-slate-400 text-sm mt-1">Try a different sport, city, or date.</p>
            {q && <button onClick={() => setQ('')} className="mt-4 text-green-600 font-medium text-sm">Clear search</button>}
          </div>
        ) : date ? (
          // Specific date chosen → single grid.
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {visibleSlots.map(renderCard)}
          </div>
        ) : (
          // Any Date → grouped by Today / Tomorrow / This Week / Upcoming.
          <div className="space-y-10">
            {DATE_GROUP_ORDER.filter((g) => grouped[g].length > 0).map((g) => (
              <div key={g}>
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">{g}<span className="text-sm font-normal text-slate-400">({grouped[g].length})</span></h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  {grouped[g].map(renderCard)}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Shared booking modal (login-gated) */}
      <BookingModal
        open={bookingSlot !== null}
        onClose={() => { setBookingSlot(null); searchSlots(); }}
        slot={bookingSlot as BookingSlot | null}
        venueName={bookingSlot?.venue_name ?? ''}
        sportName={bookingSlot ? getSportName(bookingSlot.sport_id) : ''}
        initialDate={date || bookingSlot?.next_date || undefined}
      />
    </div>
  );
}
