'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Navbar from './Navbar';
import Footer from './Footer';

// Venue portal + auth routes render their own full-screen layout (no public chrome).
// The public venue detail page (/venues/[slug]) keeps the public navbar/footer.
const PORTAL_PREFIXES = [
  '/login',
  '/register',
  '/player',
  '/venues/login',
  '/venues/register',
  '/venues/dashboard',
  '/venues/slots',
  '/venues/bookings',
  '/venues/customers',
  '/venues/reports',
  '/venues/profile',
  '/venues/create',
];

function isPortalPath(p: string): boolean {
  return (
    PORTAL_PREFIXES.some((x) => p === x || p.startsWith(x + '/')) ||
    /^\/venues\/[^/]+\/edit$/.test(p)
  );
}

export default function SiteChrome({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (isPortalPath(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex flex-col">{children}</main>
      <Footer />
    </div>
  );
}
