import { ReactNode } from 'react';

type Variant = 'success' | 'danger' | 'warning' | 'info' | 'default';

interface BadgeProps {
  label: ReactNode;
  variant?: Variant;
  className?: string;
}

const variantClass: Record<Variant, string> = {
  success: 'bg-primary/10 text-primary-dark',
  danger: 'bg-danger/10 text-danger',
  warning: 'bg-warning/10 text-warning',
  info: 'bg-info/10 text-info',
  default: 'bg-surface-muted text-muted',
};

export default function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${variantClass[variant]} ${className}`}
    >
      {label}
    </span>
  );
}
