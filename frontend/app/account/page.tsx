'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Ticket, User, Save, ArrowRight } from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { CITIES } from '@/lib/constants';
import MyBookingsList from '@/components/booking/MyBookingsList';
import Button from '@/components/ui/Button';

export default function AccountPage() {
  const router = useRouter();
  const [form, setForm] = useState({ full_name: '', email: '', whatsapp: '', city: '', password: '' });
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState('');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user) { router.replace('/login'); return; }
    api.auth.me().then((me: any) => {
      setForm({ full_name: me.full_name || '', email: me.email || '', whatsapp: me.whatsapp || '', city: me.city || '', password: '' });
      setName((me.full_name || 'there').split(' ')[0]);
    }).catch(() => {});
  }, [router]);

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      await api.auth.updateMe({
        full_name: form.full_name,
        whatsapp: form.whatsapp,
        city: form.city,
        ...(form.password ? { password: form.password } : {}),
      });
      if (typeof window !== 'undefined') localStorage.setItem('userName', form.full_name);
      setForm((f) => ({ ...f, password: '' }));
      toast.success('Profile updated');
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="bg-[#1a2e22] rounded-2xl p-6 text-white mb-8">
        <h1 className="text-2xl font-bold">Welcome, {name} 👋</h1>
        <p className="text-green-300 text-sm mt-1">Manage your bookings and account here.</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Bookings */}
        <div className="lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <Ticket className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">My Bookings</h2>
          </div>
          <MyBookingsList />
        </div>

        {/* Edit profile */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-green-600" />
            <h2 className="text-lg font-bold text-slate-900">Edit Profile</h2>
          </div>
          <div className="bg-white rounded-xl border border-slate-100 p-5 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Name</label>
              <input className="input-field" value={form.full_name} onChange={(e) => set('full_name', e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Email</label>
              <input className="input-field bg-slate-50 text-slate-400" value={form.email} disabled />
            </div>
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
            <div>
              <label className="block text-sm font-semibold text-ink mb-1.5">Change Password</label>
              <input type="password" className="input-field" value={form.password} onChange={(e) => set('password', e.target.value)} placeholder="Leave blank to keep current" />
            </div>
            <Button onClick={save} loading={saving} fullWidth><Save className="w-4 h-4" /> Save Changes</Button>
          </div>

          <Link href="/" className="mt-4 flex items-center justify-center gap-1.5 text-sm font-medium text-green-600">
            Browse Available Slots <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
