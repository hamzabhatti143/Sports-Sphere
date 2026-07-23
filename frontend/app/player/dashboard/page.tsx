'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Ticket, CalendarClock, Megaphone, Eye, ArrowRight, LayoutGrid, Users2, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { getStoredName } from '@/lib/auth';
import { getSportName } from '@/lib/constants';
import { formatTime, formatPrice } from '@/lib/format';
import PlayerLayout from '@/components/player/PlayerLayout';
import CreateOpponentModal from '@/components/opponents/CreateOpponentModal';

interface Stats { total_bookings: number; upcoming_bookings: number; posts_created: number; profile_views: number; }
interface Booking { id: number; venue_name: string; sport_id: number; booking_date: string; start_time: string; end_time: string; status: string; amount: string | number; }
interface Post { id: number; sport_id: number; description: string; created_at: string; responses: number; }

const statusStyle = (s: string) =>
  s === 'confirmed' ? 'bg-green-100 text-green-700' : s === 'cancelled' ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-700';

export default function PlayerDashboard() {
  const [stats, setStats] = useState<Stats>({ total_bookings: 0, upcoming_bookings: 0, posts_created: 0, profile_views: 0 });
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [name, setName] = useState('Player');
  const [showCreate, setShowCreate] = useState(false);
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    setName((getStoredName() || 'Player').split(' ')[0]);
    api.players.stats().then((s: any) => setStats(s)).catch(() => {});
    api.bookings.getMine().then((b: any) => setBookings(b)).catch(() => {});
    api.opponents.mine().then((p: any) => setPosts(p)).catch(() => {});
  }, []);

  const upcoming = bookings.filter((b) => b.booking_date >= today && b.status !== 'cancelled').slice(0, 3);
  const dateStr = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const statCards = [
    { label: 'Total Bookings', value: stats.total_bookings, Icon: Ticket },
    { label: 'Upcoming', value: stats.upcoming_bookings, Icon: CalendarClock },
    { label: 'Posts Created', value: stats.posts_created, Icon: Megaphone },
    { label: 'Profile Views', value: stats.profile_views, Icon: Eye },
  ];

  return (
    <PlayerLayout pageTitle="Dashboard" bookingsBadge={stats.upcoming_bookings}>
      {/* Welcome */}
      <div className="bg-[#1a2e22] rounded-2xl p-6 text-white mb-6">
        <h1 className="text-2xl font-bold">Welcome back, {name} 👋</h1>
        <p className="text-green-300 text-sm mt-1">{dateStr}</p>
      </div>

      {/* Primary action cards */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
          <span className="w-11 h-11 rounded-xl bg-green-50 text-green-600 flex items-center justify-center"><LayoutGrid className="w-6 h-6" /></span>
          <h2 className="font-bold text-slate-900 mt-3">Book a Slot</h2>
          <p className="text-sm text-slate-500 mt-1 flex-1">Find and book available courts near you.</p>
          <Link href="/" className="mt-4 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
            Browse Slots <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 p-6 flex flex-col">
          <span className="w-11 h-11 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center"><Users2 className="w-6 h-6" /></span>
          <h2 className="font-bold text-slate-900 mt-3">Opponent Needed</h2>
          <p className="text-sm text-slate-500 mt-1 flex-1">Post a request or find players for your team.</p>
          <div className="mt-4 flex gap-2">
            <Link href="/player/opponents" className="flex-1 inline-flex items-center justify-center gap-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-semibold px-4 py-2.5 rounded-lg">
              View Posts
            </Link>
            <button onClick={() => setShowCreate(true)} className="flex-1 inline-flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg">
              <Plus className="w-4 h-4" /> Create Post
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map(({ label, value, Icon }) => (
          <div key={label} className="bg-white rounded-xl border border-slate-100 p-4">
            <Icon className="w-5 h-5 text-green-600" />
            <p className="text-2xl font-bold text-slate-900 mt-2">{value}</p>
            <p className="text-xs text-slate-500">{label}</p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upcoming bookings */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">Upcoming Bookings</h2>
            <Link href="/player/bookings" className="text-sm text-green-600 font-medium inline-flex items-center gap-1">View All <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">No upcoming bookings.</p>
          ) : (
            <div className="space-y-3">
              {upcoming.map((b) => (
                <div key={b.id} className="flex items-center justify-between border border-slate-100 rounded-lg p-3">
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{b.venue_name}</p>
                    <p className="text-xs text-slate-500">{b.booking_date} · {formatTime(b.start_time)}–{formatTime(b.end_time)} · {getSportName(b.sport_id)}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold capitalize ${statusStyle(b.status)}`}>{b.status}</span>
                    <p className="text-sm font-bold text-slate-900 mt-1">{formatPrice(b.amount)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent posts */}
        <div className="bg-white rounded-xl border border-slate-100 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-slate-900">My Opponent Posts</h2>
            <Link href="/player/opponents" className="text-sm text-green-600 font-medium inline-flex items-center gap-1">Create New <ArrowRight className="w-3.5 h-3.5" /></Link>
          </div>
          {posts.length === 0 ? (
            <p className="text-sm text-slate-400 py-6 text-center">You haven&apos;t posted any opponent requests yet.</p>
          ) : (
            <div className="space-y-3">
              {posts.slice(0, 3).map((p) => (
                <Link key={p.id} href={`/opponents/${p.id}`} className="block border border-slate-100 rounded-lg p-3 hover:border-green-200">
                  <div className="flex items-center gap-2">
                    <span className="bg-green-50 text-green-700 text-[10px] px-2 py-0.5 rounded-full font-semibold">{getSportName(p.sport_id)}</span>
                    <span className="text-xs text-slate-400">{p.responses} views</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-1 line-clamp-1">{p.description}</p>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      <CreateOpponentModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={() => { setShowCreate(false); api.opponents.mine().then((p: any) => setPosts(p)).catch(() => {}); }} />
    </PlayerLayout>
  );
}
