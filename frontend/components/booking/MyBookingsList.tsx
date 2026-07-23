'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MessageCircle, CalendarDays, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getSportName } from '@/lib/constants';
import { formatTime, formatPrice } from '@/lib/format';
import { waLink } from '@/lib/whatsapp';

export interface MyBooking {
  id: number;
  reference: string;
  slot_id: number;
  venue_id: number;
  venue_name: string;
  venue_slug?: string;
  venue_whatsapp?: string | null;
  sport_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  hours: number;
  amount: string | number;
  status: string;
}

type Tab = 'all' | 'upcoming' | 'past';

const statusStyle = (s: string) =>
  s === 'confirmed' ? 'bg-green-100 text-green-700'
    : s === 'cancelled' ? 'bg-red-100 text-red-600'
    : 'bg-amber-100 text-amber-700';

export default function MyBookingsList() {
  const [rows, setRows] = useState<MyBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('all');
  const today = new Date().toISOString().slice(0, 10);

  const load = useCallback(async () => {
    setLoading(true);
    try { setRows((await api.bookings.getMine()) as MyBooking[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => rows.filter((b) => {
    if (tab === 'upcoming') return b.booking_date >= today && b.status !== 'cancelled';
    if (tab === 'past') return b.booking_date < today || b.status === 'cancelled';
    return true;
  }), [rows, tab, today]);

  const cancel = async (id: number) => {
    try { await api.bookings.cancel(id); toast.success('Booking cancelled'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-5">
        {(['all', 'upcoming', 'past'] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition ${
              tab === t ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <CalendarDays className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-slate-500 mt-3">No bookings here yet</p>
          <Link href="/" className="inline-block mt-4 bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-full">Browse Available Slots</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((b) => {
            const canCancel = b.status === 'pending' && b.booking_date >= today;
            return (
              <div key={b.id} className="bg-white rounded-xl border border-slate-100 p-4 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900">{b.venue_name}</h3>
                      <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">{getSportName(b.sport_id)}</span>
                    </div>
                    <p className="text-sm text-slate-500 mt-1">
                      {b.booking_date} · {formatTime(b.start_time)} – {formatTime(b.end_time)} · {b.hours} hr
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 font-mono">Ref #{b.reference}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-semibold capitalize ${statusStyle(b.status)}`}>{b.status}</span>
                    <p className="font-bold text-slate-900 mt-2">{formatPrice(b.amount)}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-4 pt-3 border-t border-slate-100">
                  {b.status === 'confirmed' && b.venue_whatsapp && (
                    <a href={waLink(b.venue_whatsapp, `Hi, I just booked a slot at ${b.venue_name} on PlayZone. Booking ref: #${b.reference}`)}
                      target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-[#25D366] px-3 py-1.5 rounded-lg hover:opacity-90">
                      <MessageCircle className="w-4 h-4" /> Contact Venue
                    </a>
                  )}
                  {b.venue_slug && (
                    <Link href={`/venues/${b.venue_slug}`} className="text-sm text-slate-500 hover:text-green-600">View venue</Link>
                  )}
                  {canCancel && (
                    <button onClick={() => cancel(b.id)} className="ml-auto inline-flex items-center gap-1.5 text-sm text-red-500 hover:text-red-600">
                      <X className="w-4 h-4" /> Cancel
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
