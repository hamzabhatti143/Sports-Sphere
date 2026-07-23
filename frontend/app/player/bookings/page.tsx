'use client';

import PlayerLayout from '@/components/player/PlayerLayout';
import MyBookingsList from '@/components/booking/MyBookingsList';

export default function PlayerBookingsPage() {
  return (
    <PlayerLayout pageTitle="My Bookings">
      <MyBookingsList />
    </PlayerLayout>
  );
}
