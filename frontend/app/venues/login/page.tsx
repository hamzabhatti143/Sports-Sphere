'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Zap, CheckCircle, Mail, Lock, LogIn, Loader2, AlertCircle } from 'lucide-react';
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

export default function VenueLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { setError('Please enter your email and password'); return; }
    setLoading(true);
    setError('');
    try {
      const res: any = await api.auth.login(email, password);
      if (!res?.access_token) throw new Error('No access token returned');
      saveToken(res.access_token);
      localStorage.setItem('userRole', res.role);
      localStorage.setItem('ownerEmail', email);
      router.replace('/venues/dashboard');
    } catch {
      setError('Invalid email or password');
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen">
      <AuthLeftPanel />
      <div className="flex-1 bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <p className="text-green-600 font-bold text-sm mb-8">SportSpot</p>
          <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
          <p className="text-slate-500 text-sm mt-1">Sign in to your venue account</p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 mb-1 block">Email address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="email" className="portal-input pl-9" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-700 mb-1 block">Password</label>
                <span className="text-xs text-green-600 cursor-pointer">Forgot password?</span>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input type="password" className="portal-input pl-9" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-600 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="portal-btn-primary w-full py-3 mt-2 text-base justify-center">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in…</> : <><LogIn className="w-4 h-4" /> Sign In</>}
            </button>
          </form>

          <p className="text-sm text-slate-500 mt-6">
            Don&apos;t have an account? <Link href="/venues/register" className="text-green-600 font-medium">Register here</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
