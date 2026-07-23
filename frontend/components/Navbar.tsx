'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Zap, Menu, X, LayoutDashboard, LogOut, Ticket } from 'lucide-react';
import { getCurrentUser, removeToken, dashboardPathForRole } from '@/lib/auth';

const NAV = [
  { href: '/', label: 'Home' },
  { href: '/#available-slots', label: 'Venues' },
  { href: '/players', label: 'Players' },
  { href: '/opponents', label: 'Find Opponents' },
  { href: '/#popular-sports', label: 'How it Works' },
];

export default function Navbar() {
  const [user, setUser] = useState<{ userId: number; role: string; name?: string } | null>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setUser(getCurrentUser());
    setMounted(true);
    setOpen(false);
  }, [pathname]);

  const isAuthed = mounted && !!user;
  const dashHref = user ? dashboardPathForRole(user.role) : '/';
  const showDashLink = isAuthed; // owner/player → portal, general → account
  const handleLogout = () => { removeToken(); setUser(null); router.push('/'); };

  const Logo = () => (
    <Link href="/" className="flex items-center gap-2">
      <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
        <Zap className="w-4 h-4 text-white" />
      </span>
      <span className="font-bold text-xl text-slate-900">Play<span className="text-green-600">Zone</span></span>
    </Link>
  );

  return (
    <header className="sticky top-0 z-50 bg-white border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-7">
          {NAV.map((l) => (
            <Link key={l.label} href={l.href} className="text-sm font-medium text-slate-600 hover:text-green-600 transition-colors">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {isAuthed ? (
            <>
              {showDashLink && (
                <Link href={dashHref} className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-green-600">
                  <LayoutDashboard className="w-4 h-4" /> Dashboard
                </Link>
              )}
              <Link href="/bookings" className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-green-600">
                <Ticket className="w-4 h-4" /> My Bookings
              </Link>
              {user?.name && <span className="text-sm font-medium text-slate-700">Hi, {user.name.split(' ')[0]}</span>}
              <button onClick={handleLogout} className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-red-500">
                <LogOut className="w-4 h-4" /> Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-green-600">Login</Link>
              <Link href="/register" className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2 rounded-full transition-colors">Sign Up</Link>
            </>
          )}
        </div>

        <button className="md:hidden text-slate-600" onClick={() => setOpen((v) => !v)} aria-label="Menu">
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-4 space-y-1">
          {NAV.map((l) => (
            <Link key={l.label} href={l.href} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
              {l.label}
            </Link>
          ))}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            {isAuthed ? (
              <>
                {showDashLink && (
                  <Link href={dashHref} className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Dashboard</Link>
                )}
                <Link href="/bookings" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">My Bookings</Link>
                <button onClick={handleLogout} className="block w-full text-left px-3 py-2 rounded-lg text-sm text-red-500 hover:bg-red-50">Logout</button>
              </>
            ) : (
              <>
                <Link href="/login" className="block px-3 py-2 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">Login</Link>
                <Link href="/register" className="block text-center bg-green-600 text-white text-sm font-semibold px-5 py-2.5 rounded-full">Sign Up</Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
