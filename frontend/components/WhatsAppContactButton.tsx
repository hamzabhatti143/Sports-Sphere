'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MessageCircle, LogIn, UserPlus } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { waLink } from '@/lib/whatsapp';
import Modal from '@/components/ui/Modal';

type Context = 'opponent' | 'player' | 'venue';

interface Props {
  number: string;
  name?: string;
  context: Context;
  sport?: string;
  venueName?: string;
  reference?: string;
  label?: string;
  requireAuth?: boolean;  // default true — prompt login if signed out
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function buildMessage({ context, name, sport, venueName, reference }: Props): string {
  const who = name || 'there';
  switch (context) {
    case 'opponent':
      return `Hi ${who}, I saw your opponent request on PlayZone for ${sport || 'a match'}. I am interested!`;
    case 'player':
      return `Hi ${who}, I found your profile on PlayZone and would like to connect!`;
    case 'venue':
      return `Hi, I just booked a slot at ${venueName || 'your venue'} on PlayZone. Booking ref: #${reference || ''}`;
  }
}

const sizeCls = {
  sm: 'text-xs px-3 py-1.5',
  md: 'text-sm px-4 py-2',
  lg: 'text-base px-5 py-3',
};

export default function WhatsAppContactButton(props: Props) {
  const { number, label = 'Contact on WhatsApp', requireAuth = true, fullWidth, size = 'md', className = '' } = props;
  const [showLogin, setShowLogin] = useState(false);

  const handleClick = (e: React.MouseEvent) => {
    if (requireAuth && !getCurrentUser()) {
      e.preventDefault();
      setShowLogin(true);
    }
  };

  return (
    <>
      <a
        href={waLink(number, buildMessage(props))}
        target="_blank"
        rel="noopener noreferrer"
        onClick={handleClick}
        className={`inline-flex items-center justify-center gap-2 rounded-lg font-semibold text-white bg-[#25D366] hover:opacity-90 transition ${sizeCls[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      >
        <MessageCircle className="w-4 h-4" /> {label}
      </a>

      <Modal isOpen={showLogin} onClose={() => setShowLogin(false)} title="Login to contact">
        <div className="text-center py-3">
          <p className="text-muted text-sm mb-6">Login karein to contact karne ke liye.</p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="btn-primary"><LogIn className="w-4 h-4" /> Login</Link>
            <Link href="/register" className="btn-secondary"><UserPlus className="w-4 h-4" /> Register</Link>
          </div>
        </div>
      </Modal>
    </>
  );
}
