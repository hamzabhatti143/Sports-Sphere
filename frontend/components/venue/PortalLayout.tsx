'use client';

import { ReactNode, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import {
  Zap, LayoutDashboard, Layers, BookOpen, Users, BarChart2, UserCircle,
  LogOut, Bell, Menu, X,
} from 'lucide-react';
import { getCurrentUser, removeToken } from '@/lib/auth';
import { getInitials } from '@/lib/utils';

interface PortalLayoutProps {
  children: ReactNode;
  /** Optional override; by default the active item is derived from the route. */
  activeTab?: string;
  pageTitle: string;
}

const NAV = [
  { key: 'dashboard', label: 'Dashboard', href: '/venues/dashboard', Icon: LayoutDashboard },
  { key: 'slots', label: 'Manage Slots', href: '/venues/slots', Icon: Layers },
  { key: 'bookings', label: 'Bookings', href: '/venues/bookings', Icon: BookOpen },
  { key: 'customers', label: 'Customers', href: '/venues/customers', Icon: Users },
  { key: 'reports', label: 'Reports', href: '/venues/reports', Icon: BarChart2 },
  { key: 'profile', label: 'Profile', href: '/venues/profile', Icon: UserCircle },
];

// Single source of truth for which nav item is active, derived from the route.
function activeKeyFromPath(pathname: string): string {
  const match = NAV.find((n) => pathname === n.href || pathname.startsWith(n.href + '/'));
  if (match) return match.key;
  // Create/Edit venue live under the Dashboard section.
  if (pathname.startsWith('/venues/create') || /^\/venues\/[^/]+\/edit/.test(pathname)) {
    return 'dashboard';
  }
  return 'dashboard';
}

export default function PortalLayout({ children, activeTab, pageTitle }: PortalLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [ownerName, setOwnerName] = useState('VO');

  // Route-driven active nav (an explicit activeTab prop still overrides if passed).
  const activeKey = activeTab ?? activeKeyFromPath(pathname);

  // Auth guard — keep existing auth (token key). Redirect if not a venue owner.
  useEffect(() => {
    const user = getCurrentUser();
    if (!user || user.role !== 'venue_owner') {
      router.replace('/venues/login');
      return;
    }
    if (typeof window !== 'undefined') {
      setOwnerName(localStorage.getItem('ownerName') || 'Venue Owner');
    }
  }, [router]);

  const handleLogout = () => {
    removeToken();
    router.push('/venues/login');
  };

  const Sidebar = () => (
    <aside className="w-[220px] shrink-0 h-full bg-[#1a2e22] flex flex-col relative">
      <div className="p-4 border-b border-[#243d2e]">
        <div className="flex items-center">
          <span className="w-7 h-7 rounded-full bg-[#16a34a] flex items-center justify-center">
            <Zap className="w-4 h-4 text-white" />
          </span>
          <span className="text-white font-bold text-base ml-2">SportSpot</span>
        </div>
        <p className="mt-1 text-xs font-medium text-green-400 uppercase tracking-wider">Venue Portal</p>
      </div>

      <nav className="p-3 flex flex-col gap-0.5">
        {NAV.map(({ key, label, href, Icon }) => (
          <Link
            key={key}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={activeKey === key ? 'portal-sidebar-link-active' : 'portal-sidebar-link'}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="absolute bottom-0 left-0 right-0 p-3 border-t border-[#243d2e]">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-400 hover:text-red-400 transition-colors w-full"
        >
          <LogOut className="w-4 h-4" /> Logout
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#f0f4f2]">
      {/* Desktop sidebar */}
      <div className="hidden lg:block h-full">
        <Sidebar />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 h-full">
            <Sidebar />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-slate-500" onClick={() => setMobileOpen(true)} aria-label="Open menu">
              <Menu className="w-5 h-5" />
            </button>
            <span className="text-base font-semibold text-slate-800">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-slate-500 cursor-pointer" />
            <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">
              {getInitials(ownerName)}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
