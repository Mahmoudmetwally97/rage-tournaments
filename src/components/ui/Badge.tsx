import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'open' | 'warning' | 'danger' | 'reward';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-[#1F1F23] text-[#B5B2AC] border-[#27272C]',
    open: 'bg-[#10B981]/15 text-[#6EE7B7] border-[#10B981]/30',
    warning: 'bg-[#F59E0B]/15 text-[#FCD34D] border-[#F59E0B]/30',
    danger: 'bg-[#EF4444]/15 text-[#FCA5A5] border-[#EF4444]/30',
    reward: 'bg-[#FFB938]/15 text-[#FFB938] border-[#FFB938]/35'
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
