'use client';

import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

interface MobileNavigationProps {
  open: boolean;
  onClose: () => void;
  locale: Locale;
  otherLocale: Locale;
  pathname: string;
  dict: Dictionary;
  demoUser: { username: string } | null;
  onLogout: () => void;
}

export function MobileNavigation({
  open,
  onClose,
  locale,
  otherLocale,
  pathname,
  dict,
  demoUser,
  onLogout
}: MobileNavigationProps) {
  if (!open) return null;

  const links = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/tournaments`, label: dict.nav.tournaments },
    { href: `/${locale}/leaderboards`, label: dict.nav.leaderboards },
    { href: `/${locale}/dashboard`, label: dict.nav.dashboard }
  ];

  return (
    <div className="md:hidden border-t border-[#27272C] bg-[#171719] px-4 py-4 space-y-3">
      <nav className="flex flex-col gap-1.5">
        {links.map((item) => {
          const isActive =
            item.href === `/${locale}`
              ? pathname === `/${locale}`
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={`rounded-lg px-3.5 py-2.5 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-[#FF6A1A]/15 text-[#FF6A1A] border border-[#FF6A1A]/30'
                  : 'text-[#B5B2AC] hover:bg-[#202024] hover:text-[#F2EFE9]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#27272C] pt-3">
        <Link
          href={`/${otherLocale}`}
          onClick={onClose}
          className="rounded-lg border border-[#27272C] bg-[#0B0B0C] px-3 py-2 text-xs font-bold text-[#F2EFE9]"
        >
          {dict.nav.langSwitch}
        </Link>
        {demoUser ? (
          <>
            <span className="text-xs font-bold text-[#FF6A1A] ltr-isolate">{demoUser.username}</span>
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="rounded-lg border border-[#EF4444]/35 bg-[#EF4444]/15 px-3 py-2 text-xs font-bold text-[#FCA5A5] cursor-pointer"
            >
              {dict.nav.logout}
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/${locale}/login`}
              onClick={onClose}
              className="flex-1 rounded-lg border border-[#27272C] bg-[#0B0B0C] px-3 py-2 text-center text-xs font-bold text-[#F2EFE9]"
            >
              {dict.nav.login}
            </Link>
            <Link
              href={`/${locale}/register`}
              onClick={onClose}
              className="flex-1 rounded-lg bg-[#FF6A1A] px-3 py-2 text-center text-xs font-bold text-[#0B0B0C]"
            >
              {dict.nav.signup}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
