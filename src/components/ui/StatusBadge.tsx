import React from 'react';

export type StatusVariant = 'open' | 'warning' | 'live' | 'neutral' | 'danger' | 'reward';

interface StatusBadgeProps {
  variant?: StatusVariant;
  pulse?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function StatusBadge({
  variant = 'neutral',
  pulse = false,
  children,
  className = ''
}: StatusBadgeProps) {
  const styles: Record<StatusVariant, string> = {
    open: 'bg-[#10B981]/12 text-[#6EE7B7] border-[#10B981]/30',
    warning: 'bg-[#F59E0B]/12 text-[#FCD34D] border-[#F59E0B]/30',
    live: 'bg-[#e5ed43]/15 text-[#FF8C4D] border-[#e5ed43]/35',
    neutral: 'bg-[#1b1d20] text-[#a4a6aa] border-[#2b2d30]',
    danger: 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/30',
    reward: 'bg-[#FFB938]/12 text-[#FFB938] border-[#FFB938]/35'
  };

  const dotColors: Record<StatusVariant, string> = {
    open: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    live: 'bg-[#e5ed43]',
    neutral: 'bg-[#6f7276]',
    danger: 'bg-[#EF4444]',
    reward: 'bg-[#FFB938]'
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${styles[variant]} ${className}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${dotColors[variant]} ${pulse ? 'animate-pulse' : ''}`} />
      {children}
    </span>
  );
}
