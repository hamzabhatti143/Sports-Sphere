'use client';

import Link from 'next/link';
import { MapPin, Trash2 } from 'lucide-react';
import { getSportName, SPORT_BADGE_VARIANT } from '@/lib/constants';
import { timeAgo } from '@/lib/format';
import { getInitials } from '@/lib/utils';
import WhatsAppContactButton from '@/components/WhatsAppContactButton';

export interface OpponentPost {
  id: number;
  user_id: number;
  player_id?: number | null;
  player_name: string;
  player_city?: string | null;
  sport_id: number;
  positions: string[];
  description: string;
  whatsapp: string;
  skill_level?: string | null;
  when_where?: string | null;
  city?: string | null;
  created_at?: string | null;
  responses?: number;
}

const badgeColor: Record<string, string> = {
  success: 'bg-green-100 text-green-700',
  info: 'bg-blue-100 text-blue-700',
  warning: 'bg-orange-100 text-orange-700',
  default: 'bg-slate-100 text-slate-700',
};

export default function OpponentCard({ post, canDelete, onDelete }: { post: OpponentPost; canDelete?: boolean; onDelete?: (id: number) => void }) {
  const sport = getSportName(post.sport_id);
  const color = badgeColor[SPORT_BADGE_VARIANT[post.sport_id] ?? 'default'];

  return (
    <div className="bg-white rounded-xl border border-slate-100 p-5 flex flex-col">
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase ${color}`}>{sport}</span>
        <span className="text-xs text-slate-400">{timeAgo(post.created_at)}</span>
      </div>

      <div className="flex items-center gap-2.5 mt-3">
        <span className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(post.player_name)}</span>
        <div>
          {post.player_id ? (
            <Link href={`/players/${post.player_id}`} className="text-sm font-semibold text-slate-800 hover:text-green-600">{post.player_name}</Link>
          ) : (
            <p className="text-sm font-semibold text-slate-800">{post.player_name}</p>
          )}
          {post.player_city && <p className="text-xs text-slate-400 flex items-center gap-0.5"><MapPin className="w-3 h-3" /> {post.player_city}</p>}
        </div>
      </div>

      {post.positions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {post.positions.map((p) => (
            <span key={p} className="text-[11px] font-medium bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{p}</span>
          ))}
        </div>
      )}

      <p className="text-sm text-slate-600 mt-3 line-clamp-2 flex-1">{post.description}</p>
      <Link href={`/opponents/${post.id}`} className="text-xs text-green-600 font-medium mt-1">Read more →</Link>

      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-3">
        <WhatsAppContactButton number={post.whatsapp} name={post.player_name} context="opponent" sport={sport} fullWidth={!canDelete} />
        {canDelete && onDelete && (
          <button onClick={() => onDelete(post.id)} className="ml-auto inline-flex items-center gap-1 text-sm text-red-500 hover:text-red-600">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        )}
      </div>
    </div>
  );
}
