import Link from 'next/link';
import { Zap, ArrowRight } from 'lucide-react';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/#available-slots', label: 'Venues' },
  { href: '/players', label: 'Players' },
  { href: '/opponents', label: 'Find Opponents' },
  { href: '/#popular-sports', label: 'How it Works' },
  { href: '/#site-footer', label: 'Contact' },
];

export default function Footer() {
  return (
    <footer id="site-footer" className="bg-slate-900 text-slate-400 text-sm pt-12 pb-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-3 gap-8 pb-8 border-b border-slate-800">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center gap-2">
              <span className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center"><Zap className="w-4 h-4 text-white" /></span>
              <span className="font-bold text-xl text-white">Play<span className="text-green-500">Zone</span></span>
            </Link>
            <p className="mt-3 max-w-xs">Find, book &amp; play indoor sports. Discover venues, find opponents, and get on the court.</p>
            <div className="flex items-center gap-3 mt-4">
              {['f', 'ig', 'x'].map((s) => (
                <span key={s} className="w-8 h-8 rounded-full bg-slate-800 hover:bg-green-600 flex items-center justify-center cursor-pointer transition-colors text-white text-xs font-bold lowercase">{s}</span>
              ))}
            </div>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-3">Explore</h4>
            <ul className="grid grid-cols-2 gap-2">
              {LINKS.map((l) => (
                <li key={l.label}><Link href={l.href} className="hover:text-white transition-colors">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Venue CTA */}
          <div>
            <h4 className="text-white font-semibold mb-3">Are you a venue owner?</h4>
            <p className="mb-3">List your venue and start taking bookings today.</p>
            <Link href="/register" className="inline-flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-full transition-colors">
              List Your Venue <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        <p className="text-center text-slate-500 pt-6">© 2026 PlayZone. All rights reserved.</p>
      </div>
    </footer>
  );
}
