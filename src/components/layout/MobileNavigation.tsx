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
    <div className="md:hidden border-t border-[#2b2d30] bg-[#151619] px-4 py-4 space-y-3">
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
              className={`rounded-none px-3.5 py-2.5 text-sm font-bold transition-colors ${
                isActive
                  ? 'bg-[#e5ed43]/15 text-[#e5ed43] border border-[#e5ed43]/30'
                  : 'text-[#a4a6aa] hover:bg-[#1b1d20] hover:text-[#f4f4ed]'
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-wrap items-center gap-2 border-t border-[#2b2d30] pt-3">
        <Link
          href={`/${otherLocale}`}
          onClick={onClose}
          className="rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3 py-2 text-xs font-bold text-[#f4f4ed]"
        >
          {dict.nav.langSwitch}
        </Link>
        {demoUser ? (
          <>
            <span className="text-xs font-bold text-[#e5ed43] ltr-isolate">{demoUser.username}</span>
            <button
              type="button"
              onClick={() => {
                onLogout();
                onClose();
              }}
              className="rounded-none border border-[#EF4444]/35 bg-[#EF4444]/15 px-3 py-2 text-xs font-bold text-[#FCA5A5] cursor-pointer"
            >
              {dict.nav.logout}
            </button>
          </>
        ) : (
          <>
            <Link
              href={`/${locale}/login`}
              onClick={onClose}
              className="flex-1 rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3 py-2 text-center text-xs font-bold text-[#f4f4ed]"
            >
              {dict.nav.login}
            </Link>
            <Link
              href={`/${locale}/register`}
              onClick={onClose}
              className="flex-1 rounded-none bg-[#e5ed43] px-3 py-2 text-center text-xs font-bold text-[#0d0e10]"
            >
              {dict.nav.signup}
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
