'use client';

import { MessageSquare } from 'lucide-react';
import PlayerLayout from '@/components/player/PlayerLayout';

export default function PlayerMessagesPage() {
  return (
    <PlayerLayout pageTitle="Messages">
      <div className="text-center py-20 bg-white rounded-xl border border-slate-100">
        <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
        <p className="text-base font-semibold text-slate-500 mt-3">Messages coming soon</p>
        <p className="text-sm text-slate-400 mt-1">For now, players connect directly on WhatsApp.</p>
      </div>
    </PlayerLayout>
  );
}
