'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { CheckCircle2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { SPORTS, POSITIONS_BY_SPORT, getSportName, SPORT_BADGE_VARIANT } from '@/lib/constants';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import PageHeader from '@/components/ui/PageHeader';

interface SelectedPosition {
  sport_id: number;
  position_name: string;
}

export default function PlayerRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ full_name: '', phone: '', city: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [activeSport, setActiveSport] = useState<number>(SPORTS[0].id);
  const [positions, setPositions] = useState<SelectedPosition[]>([]);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (form.full_name.trim().length < 2) e.full_name = 'Name must be at least 2 characters';
    if (form.phone.trim().length < 10) e.phone = 'Enter a valid phone number';
    if (!form.city.trim()) e.city = 'City is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const togglePosition = (sport_id: number, position_name: string) => {
    setPositions((prev) => {
      const exists = prev.some((p) => p.sport_id === sport_id && p.position_name === position_name);
      return exists
        ? prev.filter((p) => !(p.sport_id === sport_id && p.position_name === position_name))
        : [...prev, { sport_id, position_name }];
    });
  };

  const isSelected = (sport_id: number, position_name: string) =>
    positions.some((p) => p.sport_id === sport_id && p.position_name === position_name);

  const handleSubmit = async () => {
    if (positions.length === 0) {
      toast.error('Please select at least one position');
      return;
    }
    const user = getCurrentUser();
    if (!user) {
      toast.error('Please log in first to create a player profile');
      router.push('/venues/login');
      return;
    }
    setLoading(true);
    try {
      await api.players.create({ ...form, positions });
      setDone(true);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div className="max-w-lg mx-auto px-4 py-20 w-full text-center">
        <div className="card p-10">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-ink mb-2">Your profile is live!</h1>
          <p className="text-muted mb-6">Teams can now find and contact you.</p>
          <Link href="/players" className="btn-primary">View Players Directory</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <PageHeader title="Create Player Profile" subtitle="Get discovered by teams looking for players" />

      {/* Progress indicator */}
      <div className="flex items-center gap-4 mb-8">
        {[1, 2].map((s) => (
          <div key={s} className="flex items-center gap-3 flex-1">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                step >= s ? 'bg-primary text-white' : 'bg-surface-muted text-muted'
              }`}
            >
              {s}
            </div>
            <span className={`text-sm font-medium ${step >= s ? 'text-ink' : 'text-muted'}`}>
              {s === 1 ? 'Your Details' : 'Sports & Positions'}
            </span>
            {s === 1 && <div className={`h-0.5 flex-1 ${step > 1 ? 'bg-primary' : 'bg-line'}`} />}
          </div>
        ))}
      </div>

      <div className="card p-6">
        {step === 1 ? (
          <div className="space-y-5">
            <Input label="Full Name" name="full_name" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} error={errors.full_name} placeholder="Your name" required />
            <Input label="Phone Number" name="phone" type="tel" value={form.phone} onChange={(e) => set('phone', e.target.value)} error={errors.phone} placeholder="03xx-xxxxxxx" required />
            <Input label="City" name="city" value={form.city} onChange={(e) => set('city', e.target.value)} error={errors.city} placeholder="e.g. Karachi" required />
            <div className="flex justify-end">
              <Button onClick={() => validateStep1() && setStep(2)}>Next</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Select Sport</label>
              <select className="input-field" value={activeSport} onChange={(e) => setActiveSport(Number(e.target.value))}>
                {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                Positions in {getSportName(activeSport)}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {(POSITIONS_BY_SPORT[activeSport] ?? []).map((pos) => (
                  <label
                    key={pos}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border cursor-pointer transition ${
                      isSelected(activeSport, pos) ? 'border-primary bg-primary/5' : 'border-line hover:bg-surface-muted'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected(activeSport, pos)}
                      onChange={() => togglePosition(activeSport, pos)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-ink">{pos}</span>
                  </label>
                ))}
              </div>
            </div>

            {positions.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-ink mb-2">Selected ({positions.length})</p>
                <div className="flex flex-wrap gap-2">
                  {positions.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => togglePosition(p.sport_id, p.position_name)}
                      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-primary/10 text-primary-dark hover:bg-primary/20 transition"
                    >
                      {p.position_name} · {getSportName(p.sport_id)}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2">
              <Button variant="secondary" onClick={() => setStep(1)}>Back</Button>
              <Button onClick={handleSubmit} loading={loading}>Create Profile</Button>
            </div>
          </div>
        )}
      </div>

      <p className="text-center text-sm text-muted mt-6">
        <Link href="/players" className="hover:text-ink transition">← View all players</Link>
      </p>
    </div>
  );
}
