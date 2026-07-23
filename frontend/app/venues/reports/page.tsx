'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { SPORTS, getSportName } from '@/lib/constants';
import { formatTimeRange, formatPKR, formatDayShort } from '@/lib/utils';
import PortalLayout from '@/components/venue/PortalLayout';

interface Slot { sport_id: number; start_time: string; end_time: string; }
interface Venue { name: string; slots: Slot[]; }
interface Booking { booking_date: string; sport_id: number; day_of_week: number; start_time: string; end_time: string; venue_name: string; price: number | string; status: string; }

const num = (p: number | string) => (typeof p === 'string' ? parseFloat(p) : p) || 0;

export default function ReportsPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);

  const load = useCallback(async () => {
    try {
      const [v, b] = await Promise.all([api.venues.getMyVenues(), api.bookings.owner()]);
      setVenues(v as Venue[]);
      // Reports reflect CONFIRMED orders only — revenue and all booking-count metrics.
      setBookings((b as Booking[]).filter((x) => x.status === 'confirmed'));
    } catch (e) { toast.error((e as Error).message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 864e5).toISOString().split('T')[0];
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];

  const revenue = useMemo(() => {
    // `bookings` is already confirmed-only (filtered at load).
    const week = bookings.filter((b) => b.booking_date >= weekAgo).reduce((s, b) => s + num(b.price), 0);
    const month = bookings.filter((b) => b.booking_date >= monthStart).reduce((s, b) => s + num(b.price), 0);
    const all = bookings.reduce((s, b) => s + num(b.price), 0);
    return { week, month, all };
  }, [bookings, weekAgo, monthStart]);

  const utilization = useMemo(() => {
    const totalBySport: Record<number, number> = {};
    venues.forEach((v) => v.slots.forEach((s) => { totalBySport[s.sport_id] = (totalBySport[s.sport_id] || 0) + 1; }));
    const bookedBySport: Record<number, number> = {};
    bookings.forEach((b) => { bookedBySport[b.sport_id] = (bookedBySport[b.sport_id] || 0) + 1; });
    return SPORTS.filter((s) => totalBySport[s.id]).map((s) => ({
      name: s.name, booked: Math.min(bookedBySport[s.id] || 0, totalBySport[s.id]), total: totalBySport[s.id],
    }));
  }, [venues, bookings]);

  const byDay = useMemo(() => {
    const counts = Array(7).fill(0);
    bookings.forEach((b) => { counts[b.day_of_week] = (counts[b.day_of_week] || 0) + 1; });
    const max = Math.max(1, ...counts);
    return counts.map((c, i) => ({ day: formatDayShort(i), count: c, pct: (c / max) * 100 }));
  }, [bookings]);

  const topSlots = useMemo(() => {
    const map = new Map<string, { label: string; sport_id: number; count: number }>();
    bookings.forEach((b) => {
      const key = `${b.venue_name}-${b.start_time}-${b.end_time}-${b.sport_id}`;
      const ex = map.get(key);
      if (ex) ex.count += 1;
      else map.set(key, { label: formatTimeRange(b.start_time, b.end_time), sport_id: b.sport_id, count: 1 });
    });
    return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 5);
  }, [bookings]);

  return (
    <PortalLayout pageTitle="Reports">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue */}
        <div className="portal-card p-6">
          <h2 className="font-semibold text-slate-800">Revenue Overview</h2>
          <div className="mt-3">
            <div className="flex justify-between border-b border-slate-100 py-3"><span className="text-sm text-slate-600">This Week</span><span className="font-bold text-green-600">{formatPKR(revenue.week)}</span></div>
            <div className="flex justify-between border-b border-slate-100 py-3"><span className="text-sm text-slate-600">This Month</span><span className="font-bold text-slate-800">{formatPKR(revenue.month)}</span></div>
            <div className="flex justify-between py-3"><span className="text-sm text-slate-600">Total All Time</span><span className="font-bold text-slate-900">{formatPKR(revenue.all)}</span></div>
          </div>
        </div>

        {/* Utilization */}
        <div className="portal-card p-6">
          <h2 className="font-semibold text-slate-800">Slot Utilization</h2>
          <div className="mt-4 flex flex-col gap-4">
            {utilization.length === 0 ? <p className="text-sm text-slate-400">No slots yet.</p> : utilization.map((u) => (
              <div key={u.name}>
                <div className="flex justify-between text-sm mb-1"><span className="text-slate-700">{u.name}</span><span className="text-slate-500">{u.booked} / {u.total} booked</span></div>
                <div className="bg-slate-100 rounded-full h-2"><div className="bg-green-500 rounded-full h-2" style={{ width: `${(u.booked / u.total) * 100}%` }} /></div>
              </div>
            ))}
          </div>
        </div>

        {/* Bookings by day */}
        <div className="portal-card p-6">
          <h2 className="font-semibold text-slate-800">Bookings by Day of Week</h2>
          <div className="mt-6 flex items-end justify-between gap-2 h-40">
            {byDay.map((d) => (
              <div key={d.day} className="flex flex-col items-center gap-1 flex-1 justify-end h-full">
                <span className="text-xs font-semibold text-slate-700">{d.count}</span>
                <div className="bg-green-500 rounded-t-sm w-8" style={{ height: `${Math.max(4, d.pct)}%` }} />
                <span className="text-xs text-slate-500">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top slots */}
        <div className="portal-card p-6">
          <h2 className="font-semibold text-slate-800">Top Slots</h2>
          <div className="mt-3">
            {topSlots.length === 0 ? <p className="text-sm text-slate-400 py-2">No bookings yet.</p> : topSlots.map((t, i) => (
              <div key={i} className="flex justify-between items-center py-2 border-b border-slate-100 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-700">{t.label}</span>
                  <span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">{getSportName(t.sport_id)}</span>
                </div>
                <span className="font-bold text-green-600">{t.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
