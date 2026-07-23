'use client';

import { ReactNode } from 'react';
import Button from './Button';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="w-16 h-16 rounded-2xl bg-surface-muted flex items-center justify-center text-muted mb-4">
          {icon}
        </div>
      )}
      <h3 className="text-lg font-bold text-ink mb-1">{title}</h3>
      {description && <p className="text-muted max-w-sm mb-6">{description}</p>}
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
