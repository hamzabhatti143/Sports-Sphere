'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Zap, CheckCircle, UserPlus, Loader2, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';
import { saveToken } from '@/lib/auth';

const FEATURES = [
  'Set and manage your weekly slot availability',
  'Track all incoming bookings in real-time',
  'View customer details and booking history',
  'Get discovered by players across your city',
];

function AuthLeftPanel() {
  return (
    <div className="hidden lg:flex w-[45%] bg-[#1a2e22] p-12 flex-col justify-between">
      <div>
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center"><Zap className="w-5 h-5 text-white" /></span>
          <span className="text-white font-bold text-2xl">SportSpot</span>
        </div>
        <p className="text-green-400 text-sm mt-1">Venue Partner Portal</p>
      </div>
      <div className="mt-16">
        <h2 className="text-white font-bold text-3xl leading-tight">Grow Your Sports Business</h2>
        <p className="text-slate-300 text-sm mt-3">Join hundreds of venue owners managing bookings effortlessly.</p>
        <div className="mt-10 flex flex-col gap-5">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-green-400 flex-shrink-0 mt-0.5" />
              <span className="text-slate-300 text-sm">{f}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-slate-400 text-sm">Need help? <span className="text-green-400">Contact Support</span></p>
    </div>
  );
}

export default function VenueRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Mirrors the backend normalize_pk_whatsapp validator.
  const isValidPkWhatsapp = (v: string) => {
    const d = v.replace(/\D/g, '').replace(/^0092/, '').replace(/^92/, '').replace(/^0/, '');
    return d.length === 10 && d.startsWith('3');
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !whatsapp || !password) { setError('Please fill in all fields'); return; }
    if (!isValidPkWhatsapp(whatsapp)) { setError('Enter a valid WhatsApp number (03XX XXXXXXX)'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    setLoading(true);
    setError('');
    try {
      const res: any = await api.auth.registerVenueOwner({ email, password, full_name: fullName, whatsapp });
      if (!res?.access_token) throw new Error('No access token returned');
      saveToken(res.access_token);
      localStorage.setItem('userRole', res.role);
      localStorage.setItem('ownerName', fullName);
      localStorage.setItem('ownerEmail', email);
      router.replace('/venues/dashboard');
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <AuthLeftPanel />
      <div className="flex-1 bg-white flex items-center justify-center p-8 overflow-y-auto">
        <div className="w-full max-w-sm py-8">
          <p className="text-green-600 font-bold text-sm mb-8">SportSpot</p>
          <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
          <p className="text-slate-500 text-sm mt-1">Start listing your venue today</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Full Name</label>
              <input className="portal-input" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Your name" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email</label>
              <input type="email" className="portal-input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">WhatsApp Number</label>
              <input type="tel" className="portal-input" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="03XX XXXXXXX" />
              <p className="text-xs text-slate-400 mt-1">📲 Booking notifications for your venue are sent here.</p>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
              <input type="password" className="portal-input" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Confirm Password</label>
              <input type="password" className="portal-input" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Repeat password" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="portal-btn-primary w-full py-3 mt-2 text-base justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating…</> : <><UserPlus className="w-4 h-4" /> Create Account</>}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6">
            Already have an account? <Link href="/venues/login" className="text-green-600 font-medium">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
