'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MapPin, Navigation } from 'lucide-react';
import { api } from '@/lib/api';
import { SPORTS } from '@/lib/constants';
import PortalLayout from '@/components/venue/PortalLayout';

export default function CreateVenuePage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', city: '', area: '', address: '', description: '' });
  const [sports, setSports] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleSport = (id: number) => setSports((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name) e.name = 'Required';
    if (!form.city) e.city = 'Required';
    if (!form.area) e.area = 'Required';
    if (!form.address) e.address = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      await api.venues.create(form); // sports are associated when slots are added
      toast.success('Venue created successfully');
      router.push('/venues/dashboard');
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <PortalLayout pageTitle="Create Venue">
      <div className="portal-card p-8 max-w-2xl">
        <h1 className="font-bold text-xl text-slate-800 mb-6">Add New Venue</h1>
        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Venue Name</label>
            <input className="portal-input" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Karachi Sports Hub" />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">City</label>
            <div className="relative">
              <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className="portal-input pl-9" value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Karachi" />
            </div>
            {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Area</label>
            <div className="relative">
              <Navigation className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input className="portal-input pl-9" value={form.area} onChange={(e) => set('area', e.target.value)} placeholder="Defence" />
            </div>
            {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Full Address</label>
            <textarea rows={3} className="portal-input" value={form.address} onChange={(e) => set('address', e.target.value)} />
            {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
          </div>
          <div className="md:col-span-2">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
            <textarea rows={3} className="portal-input" value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Optional" />
          </div>

          <div className="md:col-span-2 mt-1">
            <label className="text-sm font-medium text-slate-700 mb-3 block">Sports Offered</label>
            <div className="grid grid-cols-3 gap-3">
              {SPORTS.map((s) => {
                const on = sports.includes(s.id);
                return (
                  <div key={s.id} onClick={() => toggleSport(s.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 cursor-pointer transition-colors ${on ? 'border-green-500 bg-green-50' : 'border-slate-200 bg-white'}`}>
                    <span className={`w-4 h-4 rounded border flex items-center justify-center text-xs ${on ? 'bg-green-500 border-green-500 text-white' : 'border-slate-300'}`}>{on ? '✓' : ''}</span>
                    <span className="text-sm font-medium text-slate-700">{s.name}</span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-400 mt-2">Sports are finalised automatically when you add slots for them.</p>
          </div>

          <div className="md:col-span-2 flex gap-3 justify-end mt-8 pt-6 border-t border-slate-100">
            <Link href="/venues/dashboard" className="portal-btn-secondary px-5">Cancel</Link>
            <button type="submit" disabled={loading} className="portal-btn-primary px-5">{loading ? 'Creating…' : 'Create Venue'}</button>
          </div>
        </form>
      </div>
    </PortalLayout>
  );
}
