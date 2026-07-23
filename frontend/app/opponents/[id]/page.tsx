'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, CalendarDays, Star } from 'lucide-react';
import { api } from '@/lib/api';
import { getSportName, SPORT_BADGE_VARIANT } from '@/lib/constants';
import { timeAgo } from '@/lib/format';
import { getInitials } from '@/lib/utils';
import WhatsAppContactButton from '@/components/WhatsAppContactButton';
import OpponentCard, { OpponentPost } from '@/components/opponents/OpponentCard';

const badgeColor: Record<string, string> = {
  success: 'bg-green-100 text-green-700', info: 'bg-blue-100 text-blue-700',
  warning: 'bg-orange-100 text-orange-700', default: 'bg-slate-100 text-slate-700',
};

interface Player {
  id: number; full_name: string; city: string; bio?: string; experience_level?: string;
  avail_weekdays: boolean; avail_weekends: boolean; avail_evenings: boolean;
  positions: { position_name: string }[]; created_at?: string;
}

export default function OpponentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [post, setPost] = useState<OpponentPost | null>(null);
  const [player, setPlayer] = useState<Player | null>(null);
  const [similar, setSimilar] = useState<OpponentPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.opponents.get(Number(id))
      .then(async (p: any) => {
        setPost(p);
        if (p.player_id) api.players.get(p.player_id).then((pl: any) => setPlayer(pl)).catch(() => {});
        const sim = (await api.opponents.list({ sport: p.sport_id })) as OpponentPost[];
        setSimilar(sim.filter((s) => s.id !== p.id).slice(0, 3));
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-10 w-full"><div className="h-96 rounded-2xl bg-slate-100 animate-pulse" /></div>;

  if (notFound || !post) {
    return (
      <div className="max-w-lg mx-auto px-4 py-24 w-full text-center">
        <p className="text-2xl font-bold text-slate-800">Yeh post nahi mila 😕</p>
        <Link href="/opponents" className="inline-block mt-5 bg-green-600 text-white font-semibold px-5 py-2.5 rounded-full">Back to Opponents</Link>
      </div>
    );
  }

  const sport = getSportName(post.sport_id);
  const color = badgeColor[SPORT_BADGE_VARIANT[post.sport_id] ?? 'default'];
  const availTags = player
    ? [player.avail_weekdays && 'Weekdays', player.avail_weekends && 'Weekends', player.avail_evenings && 'Evenings'].filter(Boolean) as string[]
    : [];

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <Link href="/opponents" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-green-600 mb-6"><ArrowLeft className="w-4 h-4" /> Back to Opponents</Link>

      <div className="bg-white rounded-2xl border border-slate-100 p-6 sm:p-8">
        <div className="flex items-center justify-between">
          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase ${color}`}>{sport}</span>
          <span className="text-sm text-slate-400">{timeAgo(post.created_at)}</span>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mt-4">{sport} — Opponent Needed</h1>
        <div className="flex items-center gap-2.5 mt-3">
          <span className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white text-sm font-bold">{getInitials(post.player_name)}</span>
          <div>
            <p className="text-sm font-semibold text-slate-800">{post.player_name}</p>
            {post.player_city && <p className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {post.player_city}</p>}
          </div>
        </div>

        {post.positions.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 mb-2">Looking for:</p>
            <div className="flex flex-wrap gap-2">
              {post.positions.map((p) => <span key={p} className="text-xs font-semibold bg-green-50 text-green-700 px-2.5 py-1 rounded-full">{p}</span>)}
            </div>
          </div>
        )}

        <div className="mt-6">
          <p className="text-sm font-semibold text-slate-700 mb-1">Description</p>
          <p className="text-slate-600 leading-relaxed whitespace-pre-line">{post.description}</p>
        </div>

        {post.when_where && (
          <div className="mt-6">
            <p className="text-sm font-semibold text-slate-700 mb-1 flex items-center gap-1.5"><CalendarDays className="w-4 h-4" /> When &amp; Where</p>
            <p className="text-slate-600">{post.when_where}</p>
          </div>
        )}

        {post.skill_level && (
          <div className="mt-6">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium bg-slate-100 text-slate-700 px-3 py-1 rounded-full"><Star className="w-3.5 h-3.5" /> {post.skill_level} level</span>
          </div>
        )}

        <div className="mt-8">
          <WhatsAppContactButton number={post.whatsapp} name={post.player_name} context="opponent" sport={sport} fullWidth size="lg" />
        </div>
      </div>

      {/* Poster profile */}
      {player && (
        <div className="bg-white rounded-2xl border border-slate-100 p-6 mt-6">
          <p className="text-sm font-semibold text-slate-700 mb-3">About the poster</p>
          <div className="flex items-center gap-3">
            <span className="w-14 h-14 rounded-full bg-green-600 flex items-center justify-center text-white text-lg font-bold">{getInitials(player.full_name)}</span>
            <div>
              <Link href={`/players/${player.id}`} className="font-bold text-slate-900 hover:text-green-600">{player.full_name}</Link>
              <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3 h-3" /> Member since {player.created_at?.slice(0, 10) ?? '—'}</p>
            </div>
          </div>
          {player.positions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {player.positions.map((p, i) => <span key={i} className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p.position_name}</span>)}
            </div>
          )}
          {availTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {availTags.map((t) => <span key={t} className="text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{t}</span>)}
            </div>
          )}
        </div>
      )}

      {/* Similar */}
      {similar.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Similar Requests</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {similar.map((s) => <OpponentCard key={s.id} post={s} />)}
          </div>
        </div>
      )}
    </div>
  );
}
