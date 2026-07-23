'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Megaphone, X } from 'lucide-react';
import { api } from '@/lib/api';
import { getCurrentUser } from '@/lib/auth';
import { SPORTS, CITIES, PLAYING_POSITIONS } from '@/lib/constants';
import OpponentCard, { OpponentPost } from '@/components/opponents/OpponentCard';
import CreateOpponentModal from '@/components/opponents/CreateOpponentModal';

export default function FindOpponentsPage() {
  const [posts, setPosts] = useState<OpponentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [sport, setSport] = useState('');
  const [city, setCity] = useState('');
  const [position, setPosition] = useState('');
  const [q, setQ] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.opponents.list({
        sport: sport ? Number(sport) : undefined,
        city: city || undefined,
        position: position || undefined,
      });
      setPosts(res as OpponentPost[]);
    } catch (e) { toast.error((e as Error).message); }
    finally { setLoading(false); }
  }, [sport, city, position]);

  useEffect(() => { setLoggedIn(!!getCurrentUser()); load(); }, [load]);

  // Live client-side text filter on top of server filters.
  const visible = useMemo(() => {
    if (q.trim().length < 2) return posts;
    const t = q.trim().toLowerCase();
    return posts.filter((p) =>
      [p.player_name, p.description, p.positions.join(' '), String(p.sport_id)].some((f) => (f || '').toLowerCase().includes(t))
    );
  }, [posts, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Find Opponents</h1>
          <p className="text-slate-500 mt-1">Looking for players to complete your team?</p>
        </div>
        {loggedIn && (
          <button onClick={() => setShowCreate(true)} className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-full">
            <Plus className="w-4 h-4" /> Post Opponent Request
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by sport, position, or player name..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
          {q && <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"><X className="w-4 h-4" /></button>}
        </div>
        <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={sport} onChange={(e) => setSport(e.target.value)}>
          <option value="">All Sports</option>
          {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={city} onChange={(e) => setCity(e.target.value)}>
          <option value="">All Cities</option>
          {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm" value={position} onChange={(e) => setPosition(e.target.value)}>
          <option value="">All Positions</option>
          {PLAYING_POSITIONS.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-52 rounded-xl bg-slate-100 animate-pulse" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Megaphone className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-lg font-bold text-slate-600 mt-4">No opponent requests found</p>
          <p className="text-slate-400 text-sm mt-1">Be the first to post one.</p>
          {loggedIn && <button onClick={() => setShowCreate(true)} className="mt-4 bg-green-600 text-white text-sm font-semibold px-5 py-2 rounded-full">Post a request</button>}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {visible.map((p) => <OpponentCard key={p.id} post={p} />)}
        </div>
      )}

      <CreateOpponentModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={load} />
    </div>
  );
}
