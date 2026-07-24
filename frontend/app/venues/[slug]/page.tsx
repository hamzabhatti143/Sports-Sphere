import { notFound } from 'next/navigation';
import VenueDetail, { VenuePublic } from './VenueDetail';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://hamzabhatti-bot.hf.space';

export default async function VenuePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  const res = await fetch(`${API_URL}/venues/slug/${slug}`, { cache: 'no-store' });
  if (!res.ok) notFound();

  const venue: VenuePublic = await res.json();
  return <VenueDetail venue={venue} />;
}
