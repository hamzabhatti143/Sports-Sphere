'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Plus, ChevronDown, Layers, BookOpen, CheckCircle, Calendar, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { SPORTS, DAYS } from '@/lib/constants';
import { formatTimeRange } from '@/lib/utils';
import PortalLayout from '@/components/venue/PortalLayout';
import DiscountManager from '@/components/venue/DiscountManager';
import Modal from '@/components/ui/Modal';
import ConfirmModal from '@/components/ui/ConfirmModal';

interface Slot { id: number; sport_id: number; day_of_week: number; start_time: string; end_time: string; price: number | string; is_recurring: boolean; }
interface Venue { id: number; name: string; slug: string; slots: Slot[]; }
interface Booking { venue_name: string; day_of_week: number; start_time: string; end_time: string; booking_date: string; }

const today = new Date().toISOString().split('T')[0];
const timeKey = (s: { start_time: string; end_time: string }) => `${s.start_time}-${s.end_time}`;

// The next calendar date matching a day_of_week (0=Mon … 6=Sun), formatted for display.
function nextDateForDow(dow: number): string {
  const start = new Date();
  for (let i = 0; i < 8; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    if (((d.getDay() + 6) % 7) === dow) {
      return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
    }
  }
  return '';
}
const emptyForm = { sport_id: 1, day_of_week: 0, start_time: '18:00', end_time: '19:00', price: '1200', is_recurring: true };

export default function ManageSlotsPage() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    try {
      const [v, b] = await Promise.all([api.venues.getMyVenues(), api.bookings.owner()]);
      const vs = v as Venue[];
      setVenues(vs);
      setBookings(b as Booking[]);
      setSelectedId((cur) => cur ?? (vs[0]?.id ?? null));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const venue = venues.find((v) => v.id === selectedId) || null;
  const slots = venue?.slots ?? [];

  const ranges = useMemo(() => [...new Set(slots.map(timeKey))].sort(), [slots]);
  const findSlot = (range: string, day: number) => slots.find((s) => timeKey(s) === range && s.day_of_week === day);
  const isBooked = (range: string, day: number) =>
    venue ? bookings.some((b) => b.venue_name === venue.name && b.day_of_week === day && `${b.start_time}-${b.end_time}` === range) : false;

  const totalSlots = slots.length;
  const bookedSlots = bookings.filter((b) => venue && b.venue_name === venue.name).length;
  const availableSlots = Math.max(0, totalSlots - slots.filter((s) => isBooked(timeKey(s), s.day_of_week)).length);
  const todaysBookings = bookings.filter((b) => venue && b.venue_name === venue.name && b.booking_date === today).length;

  const openAdd = () => { setForm(emptyForm); setEditingId(null); setModalOpen(true); };
  const openEdit = (s: Slot) => {
    setForm({ sport_id: s.sport_id, day_of_week: s.day_of_week, start_time: s.start_time.slice(0, 5), end_time: s.end_time.slice(0, 5), price: String(s.price), is_recurring: s.is_recurring });
    setEditingId(s.id);
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedId) { toast.error('Select a venue first'); return; }
    setSubmitting(true);
    const payload = {
      sport_id: Number(form.sport_id), day_of_week: Number(form.day_of_week),
      start_time: form.start_time, end_time: form.end_time, price: parseFloat(form.price), is_recurring: form.is_recurring,
    };
    try {
      if (editingId) { await api.venues.updateSlot(selectedId, editingId, payload); toast.success('Slot updated'); }
      else { await api.venues.createSlot(selectedId, payload); toast.success('Slot added'); }
      setModalOpen(false);
      load();
    } catch (err) { toast.error((err as Error).message); }
    finally { setSubmitting(false); }
  };

  const doDelete = async () => {
    if (!selectedId || !deleteId) return;
    setDeleting(true);
    try { await api.venues.deleteSlot(selectedId, deleteId); toast.success('Slot deleted'); setDeleteId(null); setModalOpen(false); load(); }
    catch (e) { toast.error((e as Error).message); }
    finally { setDeleting(false); }
  };

  const QA = ({ Icon, tint, label, value }: { Icon: typeof Layers; tint: string; label: string; value: number }) => (
    <div className="portal-card p-4 flex flex-col items-center text-center">
      <span className={`w-10 h-10 rounded-xl flex items-center justify-center mb-2 ${tint}`}><Icon className="w-5 h-5" /></span>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-0.5">{label}</p>
    </div>
  );

  return (
    <PortalLayout pageTitle="Manage Slots">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-800">Manage Slots</h1>
        <button onClick={openAdd} className="portal-btn-primary"><Plus className="w-4 h-4" /> Add Slot</button>
      </div>

      {/* Venue selector */}
      <div className="mb-6 max-w-xs relative">
        <select className="portal-input appearance-none pr-9" value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))}>
          {venues.length === 0 && <option value="">No venues</option>}
          {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
      </div>

      {/* Discount management */}
      {selectedId && <DiscountManager venueId={selectedId} />}

      {/* Weekly grid */}
      <div className="portal-card overflow-x-auto">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-xs font-semibold text-slate-500 text-left px-4 py-3 w-36">Time</th>
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
                <th key={d} className="text-xs font-semibold text-slate-500 text-center py-3 px-2">{d}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ranges.length === 0 ? (
              <tr><td colSpan={8} className="text-center text-slate-400 py-10 text-sm">No slots yet. Click “Add Slot” to create your weekly grid.</td></tr>
            ) : ranges.map((range) => {
              const [start, end] = range.split('-');
              return (
                <tr key={range}>
                  <td className="px-4 py-3.5 text-sm text-slate-600 font-medium whitespace-nowrap border-b border-slate-100">{formatTimeRange(start, end)}</td>
                  {[0, 1, 2, 3, 4, 5, 6].map((day) => {
                    const s = findSlot(range, day);
                    const booked = s && isBooked(range, day);
                    return (
                      <td key={day} className="text-center py-3 px-2 border-b border-slate-100">
                        {!s ? (
                          <span className="text-slate-300 text-sm">—</span>
                        ) : booked ? (
                          <span className="badge-booked">Booked</span>
                        ) : (
                          <span className="badge-available cursor-pointer hover:bg-green-200 transition-colors" onClick={() => openEdit(s)}>Available</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Quick actions */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <QA Icon={Layers} tint="bg-blue-50 text-blue-600" label="Total Slots" value={totalSlots} />
        <QA Icon={BookOpen} tint="bg-red-50 text-red-500" label="Booked Slots" value={bookedSlots} />
        <QA Icon={CheckCircle} tint="bg-green-50 text-green-600" label="Available Slots" value={availableSlots} />
        <QA Icon={Calendar} tint="bg-orange-50 text-orange-500" label="Today's Bookings" value={todaysBookings} />
      </div>

      {/* Add/Edit modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingId ? 'Edit Slot' : 'Add New Slot'}>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Venue</label>
            <select className="portal-input" value={selectedId ?? ''} onChange={(e) => setSelectedId(Number(e.target.value))}>
              {venues.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Sport</label>
            <select className="portal-input" value={form.sport_id} onChange={(e) => setForm({ ...form, sport_id: Number(e.target.value) })}>
              {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Day of Week</label>
            <select className="portal-input" value={form.day_of_week} onChange={(e) => setForm({ ...form, day_of_week: Number(e.target.value) })}>
              {DAYS.map((d, i) => <option key={i} value={i}>{d}</option>)}
            </select>
            <p className="text-xs text-green-700 bg-green-50 rounded-lg px-2.5 py-1.5 mt-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
              {form.is_recurring
                ? <span>Next: <b>{nextDateForDow(form.day_of_week)}</b> · repeats every {DAYS[form.day_of_week]}</span>
                : <span>Date: <b>{nextDateForDow(form.day_of_week)}</b></span>}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="text-xs font-medium text-slate-500 mb-1 block">Start Time</label><input type="time" className="portal-input" value={form.start_time} onChange={(e) => setForm({ ...form, start_time: e.target.value })} /></div>
            <div><label className="text-xs font-medium text-slate-500 mb-1 block">End Time</label><input type="time" className="portal-input" value={form.end_time} onChange={(e) => setForm({ ...form, end_time: e.target.value })} /></div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-500 mb-1 block">Per Hour Rate (PKR)</label>
            <div className="flex">
              <span className="px-3 py-2 bg-slate-100 border border-r-0 border-slate-200 rounded-l-lg text-sm text-slate-500 font-medium">PKR</span>
              <input type="number" className="portal-input rounded-none" placeholder="1200" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
              <span className="px-3 py-2 bg-slate-100 border border-l-0 border-slate-200 rounded-r-lg text-sm text-slate-500 font-medium">/ hour</span>
            </div>
            <p className="text-xs text-slate-400 mt-1">Charged per hour — booking total = hours × this rate.</p>
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-green-600" checked={form.is_recurring} onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })} />
            <span className="text-sm text-slate-700">Repeat weekly for this day</span>
          </label>

          <div className="flex gap-3 justify-end mt-2 pt-4 border-t border-slate-100">
            {editingId && (
              <button type="button" onClick={() => setDeleteId(editingId)} className="mr-auto text-sm text-red-500 hover:text-red-600 flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Delete Slot
              </button>
            )}
            <button type="button" onClick={() => setModalOpen(false)} className="portal-btn-secondary px-5">Cancel</button>
            <button type="submit" disabled={submitting} className="portal-btn-primary px-5">{editingId ? 'Save Changes' : 'Add Slot'}</button>
          </div>
        </form>
      </Modal>

      <ConfirmModal isOpen={deleteId !== null} onClose={() => setDeleteId(null)} onConfirm={doDelete} title="Delete slot?" description="This permanently removes the slot." confirmLabel="Delete" loading={deleting} />
    </PortalLayout>
  );
}
