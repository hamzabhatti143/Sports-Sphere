'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MapPin, Navigation } from 'lucide-react';
import { api } from '@/lib/api';
import PortalLayout from '@/components/venue/PortalLayout';

export default function EditVenuePage() {
  const params = useParams();
  const router = useRouter();
  const slug = String(params.slug);

  const [venueId, setVenueId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: '', city: '', area: '', address: '', description: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const v = (await api.venues.getBySlug(slug)) as any;
      setVenueId(v.id);
      setForm({ name: v.name ?? '', city: v.city ?? '', area: v.area ?? '', address: v.address ?? '', description: v.description ?? '' });
    } catch { setNotFound(true); }
    finally { setLoading(false); }
  }, [slug]);

  useEffect(() => { load(); }, [load]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
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
    if (!validate() || venueId === null) return;
    setSaving(true);
    try {
      await api.venues.update(venueId, form);
      toast.success('Venue updated');
      router.push('/venues/dashboard');
    } catch (err) { toast.error((err as Error).message); setSaving(false); }
  };

  return (
    <PortalLayout pageTitle="Edit Venue">
      <div className="portal-card p-8 max-w-2xl">
        {loading ? (
          <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 bg-slate-100 rounded-lg animate-pulse" />)}</div>
        ) : notFound ? (
          <div className="text-center py-10">
            <p className="font-semibold text-slate-700">Venue not found</p>
            <Link href="/venues/dashboard" className="text-green-600 text-sm mt-2 inline-block">Back to dashboard</Link>
          </div>
        ) : (
          <>
            <h1 className="font-bold text-xl text-slate-800 mb-6">Edit Venue</h1>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Venue Name</label>
                <input className="portal-input" value={form.name} onChange={(e) => set('name', e.target.value)} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">City</label>
                <div className="relative"><MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input className="portal-input pl-9" value={form.city} onChange={(e) => set('city', e.target.value)} /></div>
                {errors.city && <p className="text-xs text-red-500 mt-1">{errors.city}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Area</label>
                <div className="relative"><Navigation className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" /><input className="portal-input pl-9" value={form.area} onChange={(e) => set('area', e.target.value)} /></div>
                {errors.area && <p className="text-xs text-red-500 mt-1">{errors.area}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Full Address</label>
                <textarea rows={3} className="portal-input" value={form.address} onChange={(e) => set('address', e.target.value)} />
                {errors.address && <p className="text-xs text-red-500 mt-1">{errors.address}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Description</label>
                <textarea rows={3} className="portal-input" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </div>
              <div className="md:col-span-2 flex gap-3 justify-end mt-8 pt-6 border-t border-slate-100">
                <Link href="/venues/dashboard" className="portal-btn-secondary px-5">Cancel</Link>
                <button type="submit" disabled={saving} className="portal-btn-primary px-5">{saving ? 'Saving…' : 'Save Changes'}</button>
              </div>
            </form>
          </>
        )}
      </div>
    </PortalLayout>
  );
}
