'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Tag, Save } from 'lucide-react';
import { api } from '@/lib/api';
import { DAYS } from '@/lib/constants';

interface DiscountState {
  enabled: boolean;
  dtype: 'percentage' | 'fixed';
  value: string;
  days: number[];
  valid_until: string;
}

const DEFAULT: DiscountState = { enabled: false, dtype: 'percentage', value: '10', days: [0, 1, 2, 3, 4, 5, 6], valid_until: '' };
const SAMPLE = 1200;

export default function DiscountManager({ venueId }: { venueId: number }) {
  const [d, setD] = useState<DiscountState>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.venues.getDiscount(venueId).then((res: any) => {
      setD({
        enabled: !!res.enabled,
        dtype: res.dtype === 'fixed' ? 'fixed' : 'percentage',
        value: String(res.value ?? '10'),
        days: res.days?.length ? res.days : [0, 1, 2, 3, 4, 5, 6],
        valid_until: res.valid_until || '',
      });
    }).catch(() => setD(DEFAULT)).finally(() => setLoading(false));
  }, [venueId]);

  const toggleDay = (i: number) =>
    setD((prev) => ({ ...prev, days: prev.days.includes(i) ? prev.days.filter((x) => x !== i) : [...prev.days, i].sort((a, b) => a - b) }));

  const save = async () => {
    setSaving(true);
    try {
      await api.venues.saveDiscount(venueId, {
        enabled: d.enabled,
        dtype: d.dtype,
        value: parseFloat(d.value) || 0,
        days: d.days,
        valid_until: d.valid_until || null,
      });
      toast.success('Discount saved');
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  const val = parseFloat(d.value) || 0;
  const discounted = d.dtype === 'percentage' ? SAMPLE - (SAMPLE * val) / 100 : Math.max(0, SAMPLE - val);
  const label = d.dtype === 'percentage' ? `${val}% OFF` : `PKR ${val} OFF`;

  if (loading) return <div className="portal-card p-5 h-40 animate-pulse bg-slate-100" />;

  return (
    <div className="portal-card p-5 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-lg bg-orange-50 text-orange-500"><Tag className="w-4 h-4" /></span>
          <h2 className="font-bold text-slate-800">Discount Management</h2>
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <span className="text-sm text-slate-600">Offer Discount</span>
          <input type="checkbox" className="w-9 h-5 accent-green-600" checked={d.enabled} onChange={(e) => setD({ ...d, enabled: e.target.checked })} />
        </label>
      </div>

      {d.enabled && (
        <>
          <div className="mt-4 rounded-lg bg-green-50 border border-green-100 px-4 py-2.5 text-sm text-green-700 font-medium">
            Active discount: customers will see <span className="line-through text-green-600/70">PKR {SAMPLE}</span> → <span className="font-bold">PKR {discounted.toLocaleString()}</span> ({label})
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Discount Type</label>
              <div className="flex gap-4">
                {(['percentage', 'fixed'] as const).map((t) => (
                  <label key={t} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                    <input type="radio" name="dtype" checked={d.dtype === t} onChange={() => setD({ ...d, dtype: t })} className="accent-green-600" />
                    {t === 'percentage' ? 'Percentage (%)' : 'Fixed (PKR)'}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-500 mb-1.5 block">Discount Value</label>
              <input type="number" className="portal-input" value={d.value} onChange={(e) => setD({ ...d, value: e.target.value })} placeholder={d.dtype === 'percentage' ? '10' : '500'} />
            </div>
          </div>

          <div className="mt-4">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Applicable Days</label>
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((day, i) => (
                <button key={i} type="button" onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${d.days.includes(i) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {day.slice(0, 3)}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 max-w-xs">
            <label className="text-xs font-medium text-slate-500 mb-1.5 block">Valid Until (optional)</label>
            <input type="date" className="portal-input" value={d.valid_until} onChange={(e) => setD({ ...d, valid_until: e.target.value })} />
          </div>
        </>
      )}

      <div className="mt-5 flex justify-end">
        <button onClick={save} disabled={saving} className="portal-btn-primary px-5"><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save Discount'}</button>
      </div>
    </div>
  );
}
