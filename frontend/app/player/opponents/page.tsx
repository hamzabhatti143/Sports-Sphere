'use client';

import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Megaphone } from 'lucide-react';
import { api } from '@/lib/api';
import PlayerLayout from '@/components/player/PlayerLayout';
import OpponentCard, { OpponentPost } from '@/components/opponents/OpponentCard';
import CreateOpponentModal from '@/components/opponents/CreateOpponentModal';

export default function PlayerOpponentsPage() {
  const [tab, setTab] = useState<'mine' | 'all'>('mine');
  const [mine, setMine] = useState<OpponentPost[]>([]);
  const [all, setAll] = useState<OpponentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [myId, setMyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [m, a, me] = await Promise.all([
        api.opponents.mine(), api.opponents.list({}), api.auth.me(),
      ]);
      setMine(m as OpponentPost[]);
      setAll(a as OpponentPost[]);
      setMyId((me as any)?.id ?? null);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => {
    try { await api.opponents.remove(id); toast.success('Post deleted'); load(); }
    catch (e) { toast.error((e as Error).message); }
  };

  const rows = tab === 'mine' ? mine : all;

  return (
    <PlayerLayout pageTitle="Opponent Needed">
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-2">
          {(['mine', 'all'] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium transition ${tab === t ? 'bg-green-600 text-white' : 'bg-white border border-slate-200 text-slate-600'}`}>
              {t === 'mine' ? 'My Posts' : 'All Posts'}
            </button>
          ))}
        </div>
        <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-green-700">
          <Plus className="w-4 h-4" /> Create New Post
        </button>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-48 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-slate-100">
          <Megaphone className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-base font-semibold text-slate-500 mt-3">No posts yet</p>
          <p className="text-sm text-slate-400">Create a post to find opponents.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {rows.map((p) => (
            <OpponentCard key={p.id} post={p} canDelete={myId !== null && p.user_id === myId} onDelete={del} />
          ))}
        </div>
      )}

      <CreateOpponentModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </PlayerLayout>
  );
}
