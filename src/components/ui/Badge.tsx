import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'open' | 'warning' | 'danger' | 'reward';
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = 'default', children, className = '' }: BadgeProps) {
  const styles: Record<NonNullable<BadgeProps['variant']>, string> = {
    default: 'bg-[#1F1F23] text-[#a4a6aa] border-[#2b2d30]',
    open: 'bg-[#10B981]/15 text-[#6EE7B7] border-[#10B981]/30',
    warning: 'bg-[#38bdf8]/15 text-[#7dd3fc] border-[#38bdf8]/30',
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
