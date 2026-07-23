'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import toast from 'react-hot-toast';
import { Search, Users } from 'lucide-react';
import { api } from '@/lib/api';
import { getInitials, formatPKR } from '@/lib/utils';
import PortalLayout from '@/components/venue/PortalLayout';

interface Booking { booked_by_name: string; booked_by_phone: string; booking_date: string; price: number | string; status: string; }
interface Customer { name: string; phone: string; lastBooking: string; count: number; spent: number; }

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    try {
      // Only CONFIRMED orders count — for both the booking count and revenue.
      const bookings = ((await api.bookings.owner()) as Booking[]).filter((b) => b.status === 'confirmed');
      const map = new Map<string, Customer>();
      for (const b of bookings) {
        const key = b.booked_by_phone || b.booked_by_name;
        const price = typeof b.price === 'string' ? parseFloat(b.price) : b.price;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
          existing.spent += price || 0;
          if (b.booking_date > existing.lastBooking) existing.lastBooking = b.booking_date;
        } else {
          map.set(key, { name: b.booked_by_name, phone: b.booked_by_phone, lastBooking: b.booking_date, count: 1, spent: price || 0 });
        }
      }
      setCustomers([...map.values()].sort((a, b) => b.count - a.count));
    } catch (e) {
      toast.error((e as Error).message);
    }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => customers.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase()) || c.phone.includes(query)
  ), [customers, query]);

  return (
    <PortalLayout pageTitle="Customers">
      <div className="mb-6 max-w-sm relative">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input className="portal-input pl-9" placeholder="Search by name or phone…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>

      <div className="portal-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-base font-semibold text-slate-500 mt-3">No customers yet</p>
            <p className="text-sm text-slate-400">Customers appear here once players book your slots.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50">
                <tr>
                  {['#', 'Customer Name', 'Phone', 'Last Booking', 'Total Bookings', 'Total Spent'].map((h) => (
                    <th key={h} className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-4 py-3 text-left border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => (
                  <tr key={c.phone + i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-400">{i + 1}</td>
                    <td className="text-sm px-4 py-3.5 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-green-100 text-green-700 font-semibold text-sm flex items-center justify-center">{getInitials(c.name)}</span>
                        <span className="font-medium text-slate-800">{c.name}</span>
                      </div>
                    </td>
                    <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-mono text-slate-500">{c.phone}</td>
                    <td className="text-sm px-4 py-3.5 border-b border-slate-100 text-slate-600">{c.lastBooking}</td>
                    <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-semibold text-slate-800">{c.count}</td>
                    <td className="text-sm px-4 py-3.5 border-b border-slate-100 font-semibold text-slate-800">{formatPKR(c.spent)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </PortalLayout>
  );
}
