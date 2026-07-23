'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Save, CheckCircle2 } from 'lucide-react';
import { api } from '@/lib/api';
import { CITIES, EXPERIENCE_LEVELS, SPORTS, POSITIONS_BY_SPORT, getSportName } from '@/lib/constants';
import PlayerLayout from '@/components/player/PlayerLayout';
import Button from '@/components/ui/Button';

interface PlayerPosition { sport_id: number; position_name: string }

const AVAIL = [
  { key: 'avail_weekdays', label: 'Weekdays' },
  { key: 'avail_weekends', label: 'Weekends' },
  { key: 'avail_evenings', label: 'Evenings' },
] as const;

export default function PlayerProfilePage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: '', whatsapp: '', city: '', bio: '', experience_level: 'Beginner' });
  const [avail, setAvail] = useState({ avail_weekdays: false, avail_weekends: false, avail_evenings: false });
  const [positions, setPositions] = useState<PlayerPosition[]>([]);
  const [activeSport, setActiveSport] = useState<number>(SPORTS[0].id);

  useEffect(() => {
    api.players.me().then((p: any) => {
      setForm({
        full_name: p.full_name || '', whatsapp: p.whatsapp || '', city: p.city || '',
        bio: p.bio || '', experience_level: p.experience_level || 'Beginner',
      });
      setAvail({ avail_weekdays: !!p.avail_weekdays, avail_weekends: !!p.avail_weekends, avail_evenings: !!p.avail_evenings });
      const pos: PlayerPosition[] = (p.positions || []).map((x: any) => ({ sport_id: x.sport_id, position_name: x.position_name }));
      setPositions(pos);
      if (pos.length) setActiveSport(pos[0].sport_id); // open on a sport they already play
    }).catch(() => toast.error('Could not load profile')).finally(() => setLoading(false));
  }, []);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const hasPos = (sid: number, name: string) => positions.some((p) => p.sport_id === sid && p.position_name === name);
  const sportHasAny = (sid: number) => positions.some((p) => p.sport_id === sid);
  const togglePos = (sid: number, name: string) =>
    setPositions((prev) => (prev.some((p) => p.sport_id === sid && p.position_name === name)
      ? prev.filter((p) => !(p.sport_id === sid && p.position_name === name))
      : [...prev, { sport_id: sid, position_name: name }]));

  const save = async () => {
    setSaving(true);
    try {
      await api.players.updateMe({
        full_name: form.full_name,
        whatsapp: form.whatsapp,
        city: form.city,
        bio: form.bio,
        experience_level: form.experience_level,
        ...avail,
        positions,
      });
      if (typeof window !== 'undefined') localStorage.setItem('userName', form.full_name);
      toast.success('Profile saved');
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  if (loading) {
    return <PlayerLayout pageTitle="My Profile"><div className="h-96 rounded-xl bg-slate-100 animate-pulse" /></PlayerLayout>;
  }

  return (
    <PlayerLayout pageTitle="My Profile">
      <div className="max-w-2xl space-y-6">
        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Basic Details</h2>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Full Name</label>
            <input className="input-field" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">WhatsApp</label>
              <input className="input-field" value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="03XX XXXXXXX" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">City</label>
              <select className="input-field" value={form.city} onChange={(e) => set('city', e.target.value)}>
                <option value="">Select city</option>
                {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-1.5">Bio</label>
            <textarea className="input-field min-h-[80px] resize-y" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Tell teams about yourself…" />
          </div>
        </div>

        <div id="positions" className="bg-white rounded-xl border border-slate-100 p-6 space-y-4 scroll-mt-20">
          <h2 className="font-bold text-slate-900">Sports &amp; Positions</h2>

          {/* Sport selector — you can add positions across multiple sports */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Select Sport</label>
            <div className="flex flex-wrap gap-2">
              {SPORTS.map((s) => (
                <button key={s.id} type="button" onClick={() => setActiveSport(s.id)}
                  className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                    activeSport === s.id ? 'bg-green-600 text-white border-green-600'
                      : sportHasAny(s.id) ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-white text-slate-600 border-slate-200'
                  }`}>
                  {s.name}{sportHasAny(s.id) && <CheckCircle2 className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-400 mt-1.5">Pick a sport to choose its positions. You can select multiple sports — a ✓ marks the ones you play.</p>
          </div>

          {/* Positions for the active sport */}
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Positions in {getSportName(activeSport)}</label>
            <div className="flex flex-wrap gap-2">
              {(POSITIONS_BY_SPORT[activeSport] ?? []).map((p) => (
                <button key={p} type="button" onClick={() => togglePos(activeSport, p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${hasPos(activeSport, p) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Summary of everything selected, across all sports */}
          {positions.length > 0 && (
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">Your Positions</label>
              <div className="flex flex-wrap gap-1.5">
                {positions.map((p, i) => (
                  <span key={i} className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                    {p.position_name} · {getSportName(p.sport_id)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-ink mb-2">Experience Level</label>
            <div className="flex gap-4">
              {EXPERIENCE_LEVELS.map((l) => (
                <label key={l} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                  <input type="radio" name="exp" checked={form.experience_level === l} onChange={() => set('experience_level', l)} className="accent-green-600" /> {l}
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-100 p-6 space-y-4">
          <h2 className="font-bold text-slate-900">Availability</h2>
          <div className="flex flex-wrap gap-2">
            {AVAIL.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => setAvail((a) => ({ ...a, [key]: !a[key] }))}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${avail[key] ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={save} loading={saving}><Save className="w-4 h-4" /> Save Changes</Button>
      </div>
    </PlayerLayout>
  );
}
