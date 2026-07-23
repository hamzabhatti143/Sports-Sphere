'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { api } from '@/lib/api';
import { SPORTS, PLAYING_POSITIONS, EXPERIENCE_LEVELS } from '@/lib/constants';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';

export default function CreateOpponentModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated?: () => void }) {
  const [sportId, setSportId] = useState(SPORTS[0].id);
  const [positions, setPositions] = useState<string[]>([]);
  const [description, setDescription] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [skill, setSkill] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSportId(SPORTS[0].id); setPositions([]); setDescription(''); setSkill(''); setError('');
      api.auth.me().then((me: any) => setWhatsapp(me?.whatsapp || '')).catch(() => {});
    }
  }, [open]);

  const toggle = (p: string) => setPositions((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const submit = async () => {
    if (description.trim().length < 5) { setError('Please write a longer description'); return; }
    setLoading(true); setError('');
    try {
      await api.opponents.create({
        sport_id: sportId,
        positions,
        description: description.trim(),
        whatsapp: whatsapp.trim() || undefined,
        skill_level: skill || undefined,
      });
      toast.success('Opponent request posted!');
      onCreated?.();
      onClose();
    } catch (e) { setError((e as Error).message); }
    finally { setLoading(false); }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Post Opponent Request">
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Sport</label>
          <select className="input-field" value={sportId} onChange={(e) => setSportId(Number(e.target.value))}>
            {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Position(s) Needed</label>
          <div className="flex flex-wrap gap-2">
            {PLAYING_POSITIONS.map((p) => (
              <button key={p} type="button" onClick={() => toggle(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${positions.includes(p) ? 'bg-green-600 text-white border-green-600' : 'bg-white text-slate-600 border-slate-200'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Description</label>
          <textarea className="input-field min-h-[90px] resize-y" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe what you need, when, where..." />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Skill Level (optional)</label>
          <select className="input-field" value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">Any</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-1.5">Your WhatsApp</label>
          <input className="input-field" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="03XX XXXXXXX" />
        </div>
        {error && <p className="text-sm text-danger bg-danger/10 rounded-lg px-3 py-2">{error}</p>}
        <div className="flex justify-end gap-3 pt-1">
          <Button variant="secondary" onClick={onClose} className="rounded-full px-5">Cancel</Button>
          <Button onClick={submit} loading={loading} className="rounded-full px-5">Post</Button>
        </div>
      </div>
    </Modal>
  );
}
