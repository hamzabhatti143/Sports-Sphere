'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import {
  Zap, CheckCircle, UserPlus, Loader2, AlertCircle, Mail, Lock, User,
  MessageCircle, MapPin, Building2, Store, Users2,
} from 'lucide-react';
import { api } from '@/lib/api';
import { saveAuth, dashboardPathForRole } from '@/lib/auth';
import { CITIES, SPORTS, PLAYING_POSITIONS, EXPERIENCE_LEVELS } from '@/lib/constants';

type UserType = 'venue_owner' | 'player';

const USER_TYPES: { value: UserType; label: string; desc: string; Icon: typeof Store }[] = [
  { value: 'venue_owner', label: 'Venue Owner', desc: 'List and manage your venue', Icon: Store },
  { value: 'player', label: 'Individual Player', desc: 'Get discovered, find teams, book slots', Icon: Users2 },
];

const AVAILABILITY = [
  { key: 'avail_weekdays', label: 'Weekdays' },
  { key: 'avail_weekends', label: 'Weekends' },
  { key: 'avail_evenings', label: 'Evenings' },
] as const;

// Mirrors the backend `normalize_pk_whatsapp` validator.
function isValidPkWhatsapp(raw: string): boolean {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('0092')) d = d.slice(4);
  else if (d.startsWith('92')) d = d.slice(2);
  else if (d.startsWith('0')) d = d.slice(1);
  return d.length === 10 && d.startsWith('3');
}

function LeftPanel() {
  return (
    <div className="hidden lg:flex w-[45%] bg-[#1a2e22] p-12 flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></span>
          <span className="text-white font-bold text-2xl">Play<span className="text-green-400">Zone</span></span>
        </div>
        <p className="text-green-400 text-sm mt-1">Your game starts here</p>
      </div>
      <div className="mt-16">
        <h2 className="text-white font-bold text-3xl leading-tight">One account, every way to play</h2>
        <p className="text-slate-300 text-sm mt-3">Own a venue, find a team, or book slots — all in one place.</p>
        <div className="mt-10 flex flex-col gap-5">
          {['List your venue and manage bookings', 'Find players and complete your team', 'Book slots in seconds', 'Contact anyone on WhatsApp'].map((f) => (
            <div key={f} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-slate-400 text-sm">Already a member? <Link href="/login" className="text-green-400 font-medium">Sign in</Link></p>
    </div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const [userType, setUserType] = useState<UserType>('player');
  const [form, setForm] = useState({
    full_name: '', email: '', whatsapp: '', password: '', confirm: '', city: '',
    experience_level: 'Beginner', bio: '', venue_name: '', venue_address: '',
  });
  const [avail, setAvail] = useState({ avail_weekdays: false, avail_weekends: false, avail_evenings: false });
  const [positions, setPositions] = useState<string[]>([]);
  const [venueSports, setVenueSports] = useState<number[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const togglePosition = (p: string) =>
    setPositions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  const toggleSport = (id: number) =>
    setVenueSports((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const validate = () => {
    const e: Record<string, string> = {};
    if (form.full_name.trim().length < 2) e.full_name = 'Enter your full name';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email address';
    if (!form.whatsapp.trim()) e.whatsapp = 'WhatsApp number is required';
    else if (!isValidPkWhatsapp(form.whatsapp)) e.whatsapp = 'Enter a valid Pakistani number (03XX XXXXXXX)';
    if (form.password.length < 6) e.password = 'Password must be at least 6 characters';
    if (form.password !== form.confirm) e.confirm = 'Passwords do not match';
    if (!form.city) e.city = 'Please select your city';
    if (userType === 'venue_owner') {
      if (!form.venue_name.trim()) e.venue_name = 'Venue name is required';
      if (!form.venue_address.trim()) e.venue_address = 'Venue address is required';
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        user_type: userType,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        whatsapp: form.whatsapp.trim(),
        password: form.password,
        city: form.city,
      };
      if (userType === 'player') {
        Object.assign(payload, {
          // Registration positions are football-style — associate with Futsal (id 1).
          positions: positions.map((p) => ({ sport_id: 1, position_name: p })),
          experience_level: form.experience_level,
          ...avail,
          bio: form.bio.trim() || null,
        });
      } else if (userType === 'venue_owner') {
        Object.assign(payload, {
          venue_name: form.venue_name.trim(),
          venue_address: form.venue_address.trim(),
          sports: venueSports,
        });
      }
      const res: any = await api.auth.register(payload);
      if (!res?.access_token) throw new Error('Registration failed');
      saveAuth(res, form.email.trim());
      toast.success('Account created!');
      router.replace(dashboardPathForRole(res.role));
    } catch (err) {
      toast.error((err as Error).message);
      setLoading(false);
    }
  };

  const inputCls = (field: string) =>
    `portal-input ${errors[field] ? 'border-red-400 focus:ring-red-200' : ''}`;

  return (
    <div className="flex min-h-screen">
      <LeftPanel />
      <div className="flex-1 bg-white flex items-start justify-center p-6 sm:p-8 overflow-y-auto">
        <div className="w-full max-w-md py-8">
          <p className="text-green-600 font-bold text-sm mb-6 lg:hidden">PlayZone</p>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Tell us who you are to get started</p>

          <form onSubmit={submit} className="mt-6 flex flex-col gap-4">
            {/* User type cards */}
            <div>
              <label className="text-sm font-medium text-slate-700 mb-2 block">I am a…</label>
              <div className="grid grid-cols-2 gap-2">
                {USER_TYPES.map(({ value, label, desc, Icon }) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setUserType(value)}
                    className={`text-left rounded-xl border p-3 transition ${
                      userType === value
                        ? 'border-green-600 bg-green-50 ring-1 ring-green-600'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <Icon className={`w-5 h-5 mb-1.5 ${userType === value ? 'text-green-600' : 'text-slate-400'}`} />
                    <p className="text-xs font-semibold text-slate-800 leading-tight">{label}</p>
                    <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Common fields */}
            <Field label="Full Name" error={errors.full_name}>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input className={`${inputCls('full_name')} pl-9`} value={form.full_name} onChange={(e) => set('full_name', e.target.value)} placeholder="Your name" />
              </div>
            </Field>

            <Field label="Email Address" error={errors.email}>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="email" className={`${inputCls('email')} pl-9`} value={form.email} onChange={(e) => set('email', e.target.value)} placeholder="you@email.com" />
              </div>
            </Field>

            <Field label="WhatsApp Number" error={errors.whatsapp} hint="Used for booking confirmations and team contact">
              <div className="relative">
                <MessageCircle className="w-4 h-4 text-[#25D366] absolute left-3 top-1/2 -translate-y-1/2" />
                <input className={`${inputCls('whatsapp')} pl-9`} value={form.whatsapp} onChange={(e) => set('whatsapp', e.target.value)} placeholder="03XX XXXXXXX" />
              </div>
            </Field>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Password" error={errors.password}>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input type="password" className={`${inputCls('password')} pl-9`} value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="••••••" />
                </div>
              </Field>
              <Field label="Confirm" error={errors.confirm}>
                <input type="password" className={inputCls('confirm')} value={form.confirm} onChange={(e) => set('confirm', e.target.value)} placeholder="Repeat" />
              </Field>
            </div>

            <Field label="City" error={errors.city}>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <select className={`${inputCls('city')} pl-9`} value={form.city} onChange={(e) => set('city', e.target.value)}>
                  <option value="">Select your city</option>
                  {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </Field>

            {/* Player-only */}
            {userType === 'player' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Playing Positions</label>
                  <div className="flex flex-wrap gap-2">
                    {PLAYING_POSITIONS.map((p) => (
                      <button type="button" key={p} onClick={() => togglePosition(p)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          positions.includes(p) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                        }`}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Experience Level</label>
                  <div className="flex gap-4">
                    {EXPERIENCE_LEVELS.map((lvl) => (
                      <label key={lvl} className="flex items-center gap-1.5 text-sm text-slate-700 cursor-pointer">
                        <input type="radio" name="exp" checked={form.experience_level === lvl} onChange={() => set('experience_level', lvl)} className="accent-green-600" />
                        {lvl}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Availability</label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABILITY.map(({ key, label }) => (
                      <button type="button" key={key} onClick={() => setAvail((a) => ({ ...a, [key]: !a[key] }))}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          avail[key] ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <Field label="Short Bio (optional)">
                  <textarea className="portal-input min-h-[70px] resize-y" value={form.bio} onChange={(e) => set('bio', e.target.value)} placeholder="Tell teams about yourself…" />
                </Field>
              </div>
            )}

            {/* Venue-owner-only */}
            {userType === 'venue_owner' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col gap-4">
                <Field label="Venue Name" error={errors.venue_name}>
                  <div className="relative">
                    <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input className={`${inputCls('venue_name')} pl-9`} value={form.venue_name} onChange={(e) => set('venue_name', e.target.value)} placeholder="e.g. Smash Arena" />
                  </div>
                </Field>
                <Field label="Venue Address" error={errors.venue_address}>
                  <input className={inputCls('venue_address')} value={form.venue_address} onChange={(e) => set('venue_address', e.target.value)} placeholder="Street, area, landmark" />
                </Field>
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-2 block">Sports Offered</label>
                  <div className="flex flex-wrap gap-2">
                    {SPORTS.map((s) => (
                      <button type="button" key={s.id} onClick={() => toggleSport(s.id)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          venueSports.includes(s.id) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'
                        }`}>
                        {s.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {Object.keys(errors).length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> Please fix the highlighted fields.
              </div>
            )}

            <button type="submit" disabled={loading} className="portal-btn-primary w-full py-3 mt-1 text-base justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6">
            Already have an account? <Link href="/login" className="text-green-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium text-slate-700 mb-1 block">{label}</label>
      {children}
      {hint && !error && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}
