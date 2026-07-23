'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Calendar, MessageCircle, Wallet, Check, X } from 'lucide-react';
import { api } from '@/lib/api';
import { SPORTS, getSportName } from '@/lib/constants';
import { formatTimeRange, formatPKR } from '@/lib/utils';
import { waLink } from '@/lib/whatsapp';
import PortalLayout from '@/components/venue/PortalLayout';

interface Booking {
  id: number; reference?: string; booking_date: string; booked_by_name: string; booked_by_phone: string;
  status: string; venue_name: string; sport_id: number; start_time: string; end_time: string;
  price: number | string; amount?: number | string;
}

type Range = 'today' | 'week' | 'all';
const statusBadge = (s: string) => (s === 'cancelled' ? 'badge-cancelled' : s === 'pending' ? 'badge-pending' : 'badge-confirmed');
const todayStr = () => new Date().toISOString().slice(0, 10);
const weekAgoStr = () => { const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10); };
const monthStartStr = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`; };

export default function BookingsPage() {
  const [all, setAll] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<Range>('all');
  const [sport, setSport] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try { setAll((await api.bookings.owner()) as Booking[]); }
    catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const amountOf = (b: Booking) => Number(b.amount ?? b.price ?? 0);

  const revenueWeek = useMemo(() =>
    all.filter((b) => b.status === 'confirmed' && b.booking_date >= weekAgoStr()).reduce((s, b) => s + amountOf(b), 0), [all]);
  const revenueMonth = useMemo(() =>
    all.filter((b) => b.status === 'confirmed' && b.booking_date >= monthStartStr()).reduce((s, b) => s + amountOf(b), 0), [all]);

  const filtered = useMemo(() => all.filter((b) => {
    if (range === 'today' && b.booking_date !== todayStr()) return false;
    if (range === 'week' && b.booking_date < weekAgoStr()) return false;
    if (sport && b.sport_id !== Number(sport)) return false;
    return true;
  }).sort((a, b) => b.booking_date.localeCompare(a.booking_date)), [all, range, sport]);

  const setStatus = async (id: number, status: string) => {
    try {
      await api.bookings.updateStatus(id, status);
      toast.success(`Booking ${status}`);
      setAll((prev) => prev.map((b) => (b.id === id ? { ...b, status } : b)));
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <PortalLayout pageTitle="Bookings">
      {/* Revenue summary */}
      <div className="portal-card p-5 mb-6 flex flex-wrap items-center gap-6">
        <span className="p-2.5 rounded-lg bg-green-50 text-green-600"><Wallet className="w-5 h-5" /></span>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">This Week</p>
          <p className="text-xl font-bold text-slate-900">{formatPKR(revenueWeek)}</p>
        </div>
        <div className="h-10 w-px bg-slate-200" />
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide">This Month</p>
          <p className="text-xl font-bold text-slate-900">{formatPKR(revenueMonth)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="flex gap-1.5">
          {(['today', 'week', 'all'] as Range[]).map((r) => (
            <button key={r} onClick={() => setRange(r)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium capitalize transition ${range === r ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {r === 'week' ? 'This Week' : r}
            </button>
          ))}
        </div>
        <select className="portal-input max-w-[160px]" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">All Sports</option>
          {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="portal-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>
                {['Date', 'Time', 'Sport', 'Player', 'WhatsApp', 'Amount', 'Status', 'Actions'].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 text-left border-b border-slate-200">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => (
                    <td key={j} className="px-4 py-3.5 border-b border-slate-100"><div className="animate-pulse bg-slate-200 rounded h-4" /></td>
                  ))}</tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8}>
                  <div className="py-16 text-center">
                    <Calendar className="w-10 h-10 text-slate-300 mx-auto" />
                    <p className="text-base font-semibold text-slate-500 mt-3">No bookings found</p>
                  </div>
                </td></tr>
              ) : filtered.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-medium text-slate-800">{b.booking_date}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-700">{formatTimeRange(b.start_time, b.end_time)}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100"><span className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full font-medium">{getSportName(b.sport_id)}</span></td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-medium text-slate-800">{b.booked_by_name}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100">
                    <a href={waLink(b.booked_by_phone)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[#25D366] font-medium hover:underline">
                      <MessageCircle className="w-3.5 h-3.5" /> {b.booked_by_phone}
                    </a>
                  </td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-semibold text-slate-900">{formatPKR(b.amount ?? b.price)}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100"><span className={statusBadge(b.status)}>{b.status}</span></td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100">
                    {b.status === 'pending' ? (
                      <div className="flex gap-1.5">
                        <button onClick={() => setStatus(b.id, 'confirmed')} title="Confirm" className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setStatus(b.id, 'cancelled')} title="Cancel" className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><X className="w-4 h-4" /></button>
                      </div>
                    ) : b.status === 'confirmed' ? (
                      <button onClick={() => setStatus(b.id, 'cancelled')} className="text-xs text-red-500 hover:underline">Cancel</button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </PortalLayout>
  );
}
