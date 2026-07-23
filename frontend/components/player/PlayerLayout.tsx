'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Zap, LayoutDashboard, UserCircle, Ticket, Flag, MessageSquare,
  LogOut, Bell, Menu, Star, Shirt, LayoutGrid,
} from 'lucide-react';
import { getCurrentUser, removeToken, getStoredName } from '@/lib/auth';
import { getInitials } from '@/lib/utils';

const NAV = [
  { key: 'dashboard', label: 'Dashboard', href: '/player/dashboard', Icon: LayoutDashboard },
  { key: 'book', label: 'Book a Slot', href: '/', Icon: LayoutGrid },
  { key: 'profile', label: 'My Profile', href: '/player/profile', Icon: UserCircle },
  { key: 'positions', label: 'My Positions', href: '/player/profile#positions', Icon: Shirt },
  { key: 'bookings', label: 'My Bookings', href: '/player/bookings', Icon: Ticket },
  { key: 'opponents', label: 'Opponent Needed', href: '/player/opponents', Icon: Flag },
  { key: 'messages', label: 'Messages', href: '/player/messages', Icon: MessageSquare },
];

function activeKey(pathname: string): string {
  const match = NAV.find((n) => n.href !== '/' && (pathname === n.href.split('#')[0] || pathname.startsWith(n.href.split('#')[0] + '/')));
  return match?.key ?? 'dashboard';
}

export default function PlayerLayout({ children, pageTitle, bookingsBadge }: { children: ReactNode; pageTitle: string; bookingsBadge?: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [name, setName] = useState('Player');

  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'player') {
      router.replace('/login');
      return;
    }
    setName(getStoredName() || 'Player');
  }, [router]);

  const key = activeKey(pathname);
  const logout = () => { removeToken(); router.push('/login'); };

  const Sidebar = () => (
    <aside className="w-[220px] shrink-0 h-full bg-[#1a2e22] flex flex-col relative">
      <div className="p-4 border-b border-[#243d2e]">
        <div className="flex items-center">
          <span className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></span>
          <span className="text-white font-bold text-base ml-2">PlayZone</span>
        </div>
        <div className="mt-3 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(name)}</span>
          <div>
            <p className="text-white text-sm font-semibold leading-tight">{name}</p>
            <p className="text-green-400 text-xs flex items-center gap-0.5"><Star className="w-3 h-3 fill-green-400" /> New player</p>
          </div>
        </div>
      </div>

      <nav className="p-3 flex flex-col gap-0.5">
        {NAV.map(({ key: k, label, href, Icon }) => (
          <Link key={k} href={href} onClick={() => setMobileOpen(false)}
            className={key === k ? 'portal-sidebar-link-active' : 'portal-sidebar-link'}>
            <Icon className="w-4 h-4" />
            <span className="flex-1">{label}</span>
            {k === 'bookings' && bookingsBadge ? (
              <span className="bg-green-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{bookingsBadge}</span>
            ) : null}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[#243d2e]">
        <button onClick={logout} className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 transition-colors w-full">
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4f2]">
      <div className="hidden lg:block h-full"><Sidebar /></div>
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full"><Sidebar /></div>
        </div>
      )}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500" onClick={() => setMobileOpen(true)} aria-label="Open menu"><Menu className="w-5 h-5" /></button>
            <span className="text-base font-semibold text-slate-800">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm text-slate-500 hover:text-green-600">Public site</Link>
            <Bell className="w-5 h-5 text-slate-500 cursor-pointer" />
            <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">{getInitials(name)}</span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
