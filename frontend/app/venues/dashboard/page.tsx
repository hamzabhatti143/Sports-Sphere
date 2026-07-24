'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Layers, Clock8, Wallet, MapPin, Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { api } from '@/lib/api';
import { getSportName } from '@/lib/constants';
import { formatTimeRange, formatPKR } from '@/lib/utils';
import PortalLayout from '@/components/venue/PortalLayout';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Slot { id: number; sport_id: number; day_of_week: number; start_time: string; end_time: string; price: number | string; }
interface Venue { id: number; name: string; slug: string; city: string; area: string; slots: Slot[]; }
interface Booking {
  id: number; booking_date: string; booked_by_name: string; booked_by_phone: string;
  status: string; venue_name: string; sport_id: number; start_time: string; end_time: string;
  price: number | string; amount?: number | string;
}

function StatCard({ label, value, Icon, tint }: { label: string; value: number; Icon: typeof Layers; tint: string }) {
  return (
    <div className="portal-card p-5">
      <div className="flex items-start justify-between">
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{label}</span>
        <span className={`p-2 rounded-lg ${tint}`}><Icon className="w-4 h-4" /></span>
      </div>
      <p className="text-3xl font-bold text-slate-900 mt-3">{value}</p>
    </div>
  );
}

function statusBadge(status: string) {
  if (status === 'cancelled') return 'badge-cancelled';
  if (status === 'pending') return 'badge-pending';
  return 'badge-confirmed';
}

export default function DashboardPage() {
  const router = useRouter();
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [hasDiscount, setHasDiscount] = useState(false);
  const [deleteVenue, setDeleteVenue] = useState<Venue | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, b] = await Promise.all([api.venues.getMyVenues(), api.bookings.owner()]);
      setVenues(v as Venue[]);
      setBookings(b as Booking[]);
      // Any active discount across the owner's venues?
      const discounts = await Promise.all(
        (v as Venue[]).map((venue) => api.venues.getDiscount(venue.id).catch(() => null))
      );
      setHasDiscount(discounts.some((d: any) => d?.enabled));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const totalSlots = venues.reduce((n, v) => n + (v.slots?.length || 0), 0);
  const pendingCount = bookings.filter((b) => b.status === 'pending').length;
  const revenue = bookings
    .filter((b) => b.status === 'confirmed')
    .reduce((sum, b) => sum + Number(b.amount ?? b.price ?? 0), 0);
  const recent = [...bookings].sort((a, b) => b.booking_date.localeCompare(a.booking_date)).slice(0, 5);

  const dateStr = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const handleDeleteVenue = async () => {
    if (!deleteVenue) return;
    setDeleting(true);
    try {
      await api.venues.remove(deleteVenue.id);
      toast.success('Venue deleted');
      setVenues((prev) => prev.filter((v) => v.id !== deleteVenue.id));
      setDeleteVenue(null);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <PortalLayout pageTitle="Dashboard">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-slate-800">Welcome back! 👋</h1>
        <p className="text-sm text-slate-500">{dateStr}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Slots" value={totalSlots} Icon={Layers} tint="bg-blue-50 text-blue-600" />
        <StatCard label="Pending Confirmations" value={pendingCount} Icon={Clock8} tint="bg-amber-50 text-amber-600" />
        <div className="portal-card p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Total Revenue</span>
            <span className="p-2 rounded-lg bg-green-50 text-green-600"><Wallet className="w-4 h-4" /></span>
          </div>
          <p className="text-3xl font-bold text-slate-900 mt-3">{formatPKR(revenue)}</p>
          <p className="text-xs text-slate-400 mt-1">from confirmed bookings</p>
        </div>
        <div className="portal-card p-5">
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Active Discount</span>
            <span className="p-2 rounded-lg bg-orange-50 text-orange-500"><Tag className="w-4 h-4" /></span>
          </div>
          <p className="mt-3">
            <span className={`text-sm font-bold px-3 py-1 rounded-full ${hasDiscount ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-500'}`}>
              {hasDiscount ? 'Yes' : 'No'}
            </span>
          </p>
          <Link href="/venues/slots" className="text-xs text-green-600 font-medium mt-2 inline-block">Manage →</Link>
        </div>
      </div>

      {/* Recent bookings */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Recent Bookings</h2>
          <Link href="/venues/bookings" className="text-green-600 text-sm font-medium">View All →</Link>
        </div>
        <div className="portal-card overflow-hidden mt-3">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                {['Date', 'Time', 'Sport', 'Booked By', 'Contact', 'Amount', 'Status'].map((h) => (
                  <th key={h} className="text-xs font-semibold text-slate-500 uppercase px-4 py-3 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr><td colSpan={7} className="text-center text-slate-400 py-8 text-sm">No bookings yet</td></tr>
              ) : recent.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/50">
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-medium text-slate-800">{b.booking_date}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-600">{formatTimeRange(b.start_time, b.end_time)}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-600">{getSportName(b.sport_id)}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-800 font-medium">{b.booked_by_name}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-500 font-mono text-xs">{b.booked_by_phone}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-semibold text-slate-800">{formatPKR(b.price)}</td>
                  <td className="text-sm px-4 py-3.5 border-b border-slate-100"><span className={statusBadge(b.status)}>{b.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* My venues */}
      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">My Venues</h2>
          <Link href="/venues/create" className="portal-btn-primary"><Plus className="w-4 h-4" /> Add Venue</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-3">
          {venues.map((v) => {
            const sportIds = [...new Set((v.slots || []).map((s) => s.sport_id))];
            return (
              <div key={v.id} className="portal-card p-5 hover:shadow-md transition-shadow">
                <p className="font-semibold text-slate-900">{v.name}</p>
                <p className="flex items-center gap-1 text-sm text-slate-500 mt-1">
                  <MapPin className="w-3.5 h-3.5 text-green-600" /> {v.area}, {v.city}
                </p>
                <div className="flex gap-1.5 mt-3 flex-wrap">
                  {sportIds.length ? sportIds.map((sid) => (
                    <span key={sid} className="bg-green-50 text-green-700 text-xs px-2 py-0.5 rounded-full">{getSportName(sid)}</span>
                  )) : <span className="text-xs text-slate-400">No sports yet</span>}
                </div>
                <div className="mt-4 pt-4 border-t border-slate-100 flex gap-2">
                  <Link href="/venues/slots" className="portal-btn-primary text-xs px-3 py-1.5">Manage Slots</Link>
                  <Link href={`/venues/${v.slug}/edit`} className="portal-btn-secondary p-1.5 rounded-lg"><Pencil className="w-4 h-4" /></Link>
                  <button onClick={() => setDeleteVenue(v)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
          {venues.length === 0 && (
            <div className="portal-card p-8 text-center text-slate-400 text-sm md:col-span-3">
              No venues yet. <Link href="/venues/create" className="text-green-600 font-medium">Create one</Link>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={deleteVenue !== null}
        onClose={() => setDeleteVenue(null)}
        onConfirm={handleDeleteVenue}
        title={`Delete ${deleteVenue?.name ?? 'venue'}?`}
        description="This will also remove all associated slots and past/pending bookings, and cannot be undone. Venues with upcoming confirmed bookings can't be deleted."
        confirmLabel="Delete Venue"
        loading={deleting}
      />
    </PortalLayout>
  );
}
