'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, MapPin, Clock, LayoutGrid } from 'lucide-react';
import { DAYS, SPORT_BADGE_VARIANT } from '@/lib/constants';
import { formatTimeRange, formatPrice } from '@/lib/format';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/ui/EmptyState';
import BookingModal from '@/components/booking/BookingModal';

interface Slot {
  id: number;
  sport_id: number;
  day_of_week: number;
  slot_date?: string | null;
  start_time: string;
  end_time: string;
  price: number | string;
  is_recurring: boolean;
}
interface Court {
  sport_id: number;
  sport_name: string;
  slots: Slot[];
}
export interface VenuePublic {
  id: number;
  name: string;
  slug: string;
  city: string;
  area: string;
  address: string;
  description?: string | null;
  courts: Court[];
}

export default function VenueDetail({ venue }: { venue: VenuePublic }) {
  const [bookingSlot, setBookingSlot] = useState<{ slot: Slot; sport: string } | null>(null);

  const totalSlots = venue.courts.reduce((n, c) => n + c.slots.length, 0);

  const openBooking = (slot: Slot, sport: string) => setBookingSlot({ slot, sport });

  return (
    <div className="flex flex-col w-full">
      {/* Hero / banner */}
      <section className="bg-gradient-to-br from-primary-dark via-primary to-ink text-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
          <Link href="/" className="inline-flex items-center gap-2 text-white/80 hover:text-white transition mb-6 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to search
          </Link>
          <h1 className="text-3xl sm:text-5xl font-extrabold">{venue.name}</h1>
          <p className="flex items-center gap-1.5 text-white/75 mt-3 text-lg">
            <MapPin className="w-5 h-5" /> {venue.area}, {venue.city}
          </p>
          <div className="flex flex-wrap gap-2 mt-5">
            {venue.courts.map((c) => (
              <Badge key={c.sport_id} label={c.sport_name} variant={SPORT_BADGE_VARIANT[c.sport_id] ?? 'default'} />
            ))}
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* Venue info */}
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-4">Venue Information</h2>
            <dl className="space-y-3 text-sm">
              <div className="flex gap-2">
                <dt className="text-muted w-24 shrink-0">Address</dt>
                <dd className="font-medium text-ink">{venue.address}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted w-24 shrink-0">City / Area</dt>
                <dd className="font-medium text-ink">{venue.area}, {venue.city}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted w-24 shrink-0">Courts</dt>
                <dd className="font-medium text-ink">{venue.courts.length} ({venue.courts.map((c) => c.sport_name).join(', ')})</dd>
              </div>
            </dl>
            <h3 className="text-sm font-bold text-ink mt-6 mb-1">About</h3>
            <p className="text-muted text-sm">{venue.description || 'No additional description provided for this venue.'}</p>
          </Card>

          {/* Courts & slots */}
          <div>
            <h2 className="text-xl font-bold text-ink mb-4">Available Courts &amp; Slots</h2>
            {totalSlots === 0 ? (
              <Card>
                <EmptyState
                  icon={<LayoutGrid className="w-8 h-8" />}
                  title="No slots available yet"
                  description="This venue hasn't published any bookable slots. Check back soon."
                />
              </Card>
            ) : (
              <div className="space-y-6">
                {venue.courts.map((court) => (
                  <Card key={court.sport_id} className="overflow-hidden">
                    <div className="px-5 py-4 border-b border-line flex items-center justify-between bg-surface-muted">
                      <h3 className="font-bold text-ink">{court.sport_name} Court</h3>
                      <Badge label={`${court.slots.length} slot${court.slots.length === 1 ? '' : 's'}`} variant="default" />
                    </div>
                    {court.slots.length === 0 ? (
                      <p className="px-5 py-6 text-sm text-muted text-center">No slots for this court yet.</p>
                    ) : (
                      <ul className="divide-y divide-line">
                        {court.slots.map((slot) => (
                          <li key={slot.id} className="px-5 py-4 flex items-center justify-between gap-4">
                            <div>
                              <p className="font-semibold text-ink">
                                {DAYS[slot.day_of_week]}
                                {slot.slot_date ? <span className="text-muted font-normal"> · {slot.slot_date}</span> : null}
                              </p>
                              <p className="flex items-center gap-1.5 text-sm text-muted mt-0.5">
                                <Clock className="w-4 h-4" /> {formatTimeRange(slot.start_time, slot.end_time)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-ink mb-2">{formatPrice(slot.price)}</p>
                              <Button size="sm" onClick={() => openBooking(slot, court.sport_name)}>Book</Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Booking aside */}
        <aside className="lg:sticky lg:top-20 h-fit">
          <Card className="p-6">
            <h2 className="text-lg font-bold text-ink mb-2">Ready to play?</h2>
            <p className="text-muted text-sm mb-4">
              Pick a court and slot, then book in seconds — no account needed.
            </p>
            <div className="rounded-lg bg-surface-muted p-4 text-sm text-muted">
              {totalSlots} slot{totalSlots === 1 ? '' : 's'} across {venue.courts.length} court{venue.courts.length === 1 ? '' : 's'}.
            </div>
          </Card>
        </aside>
      </section>

      {/* Booking modal (shared, login-gated, multi-step) */}
      <BookingModal
        open={bookingSlot !== null}
        onClose={() => setBookingSlot(null)}
        slot={bookingSlot?.slot ?? null}
        venueName={venue.name}
        sportName={bookingSlot?.sport ?? ''}
      />
    </div>
  );
}
