'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, Star, Flag } from 'lucide-react';
import { api } from '@/lib/api';
import { getSportName } from '@/lib/constants';
import { getInitials } from '@/lib/utils';
import WhatsAppContactButton from '@/components/WhatsAppContactButton';
import { OpponentPost } from '@/components/opponents/OpponentCard';

interface Player {
  id: number; full_name: string; whatsapp?: string; city: string; bio?: string; experience_level?: string;
  avail_weekdays: boolean; avail_weekends: boolean; avail_evenings: boolean;
  positions: { sport_id: number; position_name: string }[]; created_at?: string;
}

export default function PlayerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [player, setPlayer] = useState<Player | null>(null);
  const [posts, setPosts] = useState<OpponentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.players.get(Number(id))
      .then((p: any) => {
        setPlayer(p);
        // Their opponent posts (match by name — public list has no user filter).
        api.opponents.list({}).then((all: any) => setPosts((all as OpponentPost[]).filter((o) => o.player_id === p.id))).catch(() => {});
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-10 w-full"><div className="h-96 rounded-2xl bg-slate-100 animate-pulse" /></div>;

  if (notFound || !player) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 w-full text-center">
        <p className="text-2xl font-bold text-slate-800">Yeh profile nahi mila 😕</p>
        <Link href="/players" className="inline-block mt-5 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-full">Back to Players</Link>
      </div>
    );
  }

  const avail = [
    { on: player.avail_weekdays, label: 'Weekdays' },
    { on: player.avail_weekends, label: 'Weekends' },
    { on: player.avail_evenings, label: 'Evenings' },
  ];
  const sports = [...new Set(player.positions.map((p) => p.sport_id))];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <Link href="/players" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Players</Link>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Left — profile */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-slate-100 p-6 text-center">
            <span className="w-28 h-28 rounded-full bg-green-600 flex items-center justify-center text-white text-3xl font-bold mx-auto">{getInitials(player.full_name)}</span>
            <h1 className="text-xl font-bold text-slate-900 mt-4">{player.full_name}</h1>
            <p className="text-sm text-slate-500 flex items-center justify-center gap-1 mt-1"><Star className="w-4 h-4 text-amber-400 fill-amber-400" /> New player</p>
            <p className="text-sm text-slate-400 flex items-center justify-center gap-1 mt-1"><MapPin className="w-3.5 h-3.5" /> {player.city}</p>
            <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1"><Clock className="w-3 h-3" /> Member since {player.created_at?.slice(0, 10) ?? '—'}</p>

            <div className="flex flex-wrap justify-center gap-1.5 mt-4">
              {avail.map((a) => (
                <span key={a.label} className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${a.on ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-400'}`}>{a.label}</span>
              ))}
            </div>
            {player.experience_level && (
              <div className="mt-3"><span className="text-xs font-semibold bg-slate-100 text-slate-700 px-3 py-1 rounded-full">{player.experience_level}</span></div>
            )}

            <div className="mt-5">
              <WhatsAppContactButton number={player.whatsapp || ''} name={player.full_name} context="player" fullWidth size="lg" />
            </div>
          </div>
        </div>

        {/* Right — details */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-slate-900 mb-2">About Me</h2>
            <p className="text-slate-600 leading-relaxed">{player.bio || 'This player hasn’t added a bio yet.'}</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 p-6">
            <h2 className="font-bold text-slate-900 mb-3">Can Play As:</h2>
            {player.positions.length === 0 ? (
              <p className="text-sm text-slate-400">No positions listed.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {player.positions.map((p, i) => (
                  <span key={i} className="text-xs font-semibold bg-green-50 text-green-700 px-3 py-1 rounded-full">{p.position_name}</span>
                ))}
              </div>
            )}
            {sports.length > 0 && (
              <>
                <h3 className="font-semibold text-slate-700 mt-4 mb-2 text-sm">Sports</h3>
                <div className="flex flex-wrap gap-2">
                  {sports.map((sid) => <span key={sid} className="text-xs font-medium bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">{getSportName(sid)}</span>)}
                </div>
              </>
            )}
          </div>

          {posts.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-100 p-6">
              <h2 className="font-bold text-slate-900 mb-3">Recent Activity</h2>
              <div className="space-y-2">
                {posts.map((p) => (
                  <Link key={p.id} href={`/opponents/${p.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-green-200">
                    <span className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">{getSportName(p.sport_id)}</span>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-1">{p.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <button className="text-xs text-slate-400 hover:text-red-500 inline-flex items-center gap-1"><Flag className="w-3 h-3" /> Report this profile</button>
        </div>
      </div>
    </div>
  );
}
