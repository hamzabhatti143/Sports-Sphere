'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { MapPin, Users, Search, X, UserPlus } from 'lucide-react';
import { api } from '@/lib/api';
import { SPORTS, getSportName, SPORT_BADGE_VARIANT } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import WhatsAppContactButton from '@/components/WhatsAppContactButton';

interface Position {
  sport_id: number;
  position_name: string;
}
interface Player {
  id: number;
  full_name: string;
  city: string;
  phone: string;
  whatsapp?: string;
  bio?: string;
  positions: Position[];
}

// Sport-accent pill colours, matching the rest of the site (see OpponentCard).
const badgeColor: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-orange-100 text-orange-700',
  danger: 'bg-red-100 text-red-600',
  default: 'bg-slate-100 text-slate-700',
};

export default function PlayersPage() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [city, setCity] = useState('');
  const [sport, setSport] = useState('');
  const [q, setQ] = useState('');

  const loadPlayers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.players.list({
        city: city || undefined,
        sport: sport ? parseInt(sport) : undefined,
      });
      setPlayers(data as Player[]);
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setLoading(false);
    }
  }, [city, sport]);

  useEffect(() => {
    loadPlayers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Live text filter across name, positions, city and bio.
  const shown = useMemo(() => {
    if (q.trim().length < 2) return players;
    const t = q.trim().toLowerCase();
    return players.filter((p) =>
      [p.full_name, p.city, p.bio || '', p.positions.map((x) => x.position_name).join(' ')]
        .some((f) => (f || '').toLowerCase().includes(t))
    );
  }, [players, q]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900">Players Directory</h1>
          <p className="text-slate-500 mt-1">Find players to complete your team</p>
        </div>
        <Link
          href="/players/register"
          className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-5 py-2.5 rounded-full transition-colors"
        >
          <UserPlus className="w-4 h-4" /> Register as Player
        </Link>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-2xl border border-slate-100 p-4 mb-8 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative md:col-span-2">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by player name or position..."
            className="w-full border border-slate-200 rounded-xl pl-9 pr-8 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          />
          {q && (
            <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="City e.g. Karachi"
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
          value={sport}
          onChange={(e) => setSport(e.target.value)}
        >
          <option value="">All Sports</option>
          {SPORTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2"><div className="h-4 bg-slate-100 rounded w-2/3" /><div className="h-3 bg-slate-100 rounded w-1/3" /></div>
              </div>
              <div className="h-6 bg-slate-100 rounded-full w-1/2 mt-5" />
              <div className="h-9 bg-slate-100 rounded-xl mt-5" />
            </div>
          ))}
        </div>
      ) : shown.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
          <Users className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-lg font-bold text-slate-600 mt-4">{q ? `No players found for "${q}"` : 'No players found'}</p>
          <p className="text-slate-400 text-sm mt-1">Try changing your filters, or be the first to register.</p>
          <Link href="/players/register" className="inline-flex items-center gap-1.5 mt-4 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors">
            <UserPlus className="w-4 h-4" /> Register as Player
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {shown.map((player) => (
            <div key={player.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-6 flex flex-col">
              <Link href={`/players/${player.id}`} className="flex items-center gap-3 group">
                <span className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center text-lg font-bold flex-shrink-0">
                  {getInitials(player.full_name)}
                </span>
                <div className="min-w-0">
                  <h3 className="font-bold text-slate-900 group-hover:text-green-600 transition-colors truncate">{player.full_name}</h3>
                  <p className="flex items-center gap-1 text-sm text-slate-400"><MapPin className="w-3.5 h-3.5" /> {player.city}</p>
                </div>
              </Link>

              <div className="flex flex-wrap gap-1.5 mt-4 mb-5 min-h-[1.5rem] flex-1">
                {player.positions && player.positions.length > 0 ? (
                  player.positions.map((pos, i) => (
                    <span key={i} className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${badgeColor[SPORT_BADGE_VARIANT[pos.sport_id] ?? 'default']}`}>
                      {pos.position_name} · {getSportName(pos.sport_id)}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-slate-400">No positions listed</span>
                )}
              </div>

              <div className="flex gap-2 pt-4 border-t border-slate-100">
                <Link href={`/players/${player.id}`} className="flex-1 text-center border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold py-2 rounded-full transition-colors">
                  View Profile
                </Link>
                <WhatsAppContactButton number={player.whatsapp || player.phone} name={player.full_name} context="player" label="WhatsApp" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
