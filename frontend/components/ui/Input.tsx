'use client';

import { InputHTMLAttributes, ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

export default function Input({
  label,
  error,
  icon,
  name,
  required,
  className = '',
  ...rest
}: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label htmlFor={name} className="block text-sm font-semibold text-ink mb-1.5">
          {label}
          {required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted">{icon}</span>
        )}
        <input
          id={name}
          name={name}
          required={required}
          className={`input-field ${icon ? 'pl-10' : ''} ${
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
          } ${className}`}
          {...rest}
        />
      </div>
      {error && <p className="mt-1.5 text-sm text-danger">{error}</p>}
    </div>
  );
}
