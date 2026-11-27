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
    live: 'bg-[#FF6A1A]/15 text-[#FF8C4D] border-[#FF6A1A]/35',
    neutral: 'bg-[#202024] text-[#B5B2AC] border-[#27272C]',
    danger: 'bg-[#EF4444]/12 text-[#FCA5A5] border-[#EF4444]/30',
    reward: 'bg-[#FFB938]/12 text-[#FFB938] border-[#FFB938]/35'
  };

  const dotColors: Record<StatusVariant, string> = {
    open: 'bg-[#10B981]',
    warning: 'bg-[#F59E0B]',
    live: 'bg-[#FF6A1A]',
    neutral: 'bg-[#7A7874]',
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
