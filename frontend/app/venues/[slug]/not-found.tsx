import Link from 'next/link';
import { MapPinOff } from 'lucide-react';

export default function VenueNotFound() {
  return (
    <div className="flex-1 flex items-center justify-center py-20 px-4">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mx-auto mb-5">
          <MapPinOff className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-ink mb-2">Venue not found</h1>
        <p className="text-muted mb-6">
          We couldn&apos;t find a venue at this address. It may have been removed or the link is incorrect.
        </p>
        <Link href="/" className="btn-primary">Back to search</Link>
      </div>
    </div>
  );
}
