'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Ticket } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import MyBookingsList from '@/components/booking/MyBookingsList';

export default function MyBookingsPage() {
  const router = useRouter();
  useEffect(() => {
    if (!getCurrentUser()) router.replace('/login');
  }, [router]);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
      <div className="flex items-center gap-3 mb-1">
        <Ticket className="w-6 h-6 text-green-600" />
        <h1 className="text-2xl font-bold text-slate-900">My Bookings</h1>
      </div>
      <p className="text-slate-500 text-sm mb-6">Track and manage your slot bookings.</p>
      <MyBookingsList />
    </div>
  );
}
