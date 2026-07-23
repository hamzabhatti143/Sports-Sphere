'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { Pencil } from 'lucide-react';
import PortalLayout from '@/components/venue/PortalLayout';
import { api } from '@/lib/api';

interface OwnerInfo {
  fullName: string;
  email: string;
  whatsapp: string;
}

export default function ProfilePage() {
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [info, setInfo] = useState<OwnerInfo>({ fullName: '', email: '', whatsapp: '' });
  const [draft, setDraft] = useState<OwnerInfo>(info);
  const [pwd, setPwd] = useState({ current: '', next: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const me = (await api.auth.me()) as { full_name?: string; email?: string; whatsapp?: string };
        const loaded: OwnerInfo = {
          fullName: me.full_name || '',
          email: me.email || '',
          whatsapp: me.whatsapp || '',
        };
        setInfo(loaded);
        setDraft(loaded);
      } catch {
        toast.error('Could not load your profile');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const saveInfo = async () => {
    setSaving(true);
    try {
      const updated = (await api.auth.updateMe({
        full_name: draft.fullName,
        whatsapp: draft.whatsapp || null,
      })) as { full_name?: string; whatsapp?: string };
      const next: OwnerInfo = {
        fullName: updated.full_name || draft.fullName,
        email: info.email,
        whatsapp: updated.whatsapp || '',
      };
      setInfo(next);
      setDraft(next);
      if (typeof window !== 'undefined') localStorage.setItem('ownerName', next.fullName);
      setEditing(false);
      toast.success('Profile updated');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  const updatePassword = async () => {
    if (!pwd.next) return toast.error('Enter a new password');
    if (pwd.next !== pwd.confirm) return toast.error('New passwords do not match');
    setSavingPwd(true);
    try {
      await api.auth.updateMe({ password: pwd.next });
      setPwd({ current: '', next: '', confirm: '' });
      toast.success('Password updated successfully');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Password update failed');
    } finally {
      setSavingPwd(false);
    }
  };

  return (
    <PortalLayout pageTitle="Profile">
      <div className="max-w-2xl">
        {/* Account info */}
        <div className="portal-card p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-800">Account Information</h2>
            {editing ? (
              <div className="flex gap-2">
                <button onClick={() => { setDraft(info); setEditing(false); }} className="portal-btn-secondary px-4" disabled={saving}>Cancel</button>
                <button onClick={saveInfo} className="portal-btn-primary px-4" disabled={saving}>{saving ? 'Saving…' : 'Save'}</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="portal-btn-secondary px-4" disabled={loading}><Pencil className="w-4 h-4" /> Edit Profile</button>
            )}
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading…</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-500 block mb-1">Full Name</label>
                {editing ? (
                  <input className="portal-input" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
                ) : (
                  <p className="text-sm text-slate-800">{info.fullName || '—'}</p>
                )}
              </div>

              <div>
                <label className="text-xs text-slate-500 block mb-1">Email</label>
                <p className="text-sm text-slate-800">{info.email || '—'}</p>
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs text-slate-500 block mb-1">WhatsApp Number</label>
                {editing ? (
                  <>
                    <input
                      type="tel"
                      className="portal-input"
                      placeholder="03XXXXXXXXX"
                      value={draft.whatsapp}
                      onChange={(e) => setDraft({ ...draft, whatsapp: e.target.value })}
                    />
                    <p className="text-xs text-slate-400 mt-1">📲 New booking notifications for your venues are sent to this WhatsApp number.</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-800">{info.whatsapp || '—'}</p>
                    {!info.whatsapp && (
                      <p className="text-xs text-amber-600 mt-1">⚠️ Add a WhatsApp number to receive booking notifications.</p>
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Change password */}
        <div className="portal-card p-6">
          <h2 className="font-semibold text-slate-800 mb-4">Change Password</h2>
          <div className="flex flex-col gap-4 max-w-sm">
            <input type="password" className="portal-input" placeholder="New password" value={pwd.next} onChange={(e) => setPwd({ ...pwd, next: e.target.value })} />
            <input type="password" className="portal-input" placeholder="Confirm new password" value={pwd.confirm} onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })} />
            <button onClick={updatePassword} className="portal-btn-primary w-fit px-5" disabled={savingPwd}>{savingPwd ? 'Updating…' : 'Update Password'}</button>
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
