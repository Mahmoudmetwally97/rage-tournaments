import React from 'react';
import Link from 'next/link';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionHref?: string;
}

export function SectionHeader({ title, subtitle, actionLabel, actionHref }: SectionHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-[#27272C] pb-4">
      <div>
        <h2 className="text-xl font-extrabold tracking-tight text-[#F2EFE9] sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-[#B5B2AC]">{subtitle}</p>}
      </div>
      {actionLabel && actionHref && (
        <Link
          href={actionHref}
          className="inline-flex items-center gap-1.5 text-sm font-bold text-[#FF6A1A] hover:text-[#FF7E38] transition-colors"
        >
          <span>{actionLabel}</span>
          <span aria-hidden="true">→</span>
        </Link>
      )}
    </div>
  );
}
