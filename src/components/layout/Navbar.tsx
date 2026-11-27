'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { MobileNavigation } from './MobileNavigation';

interface NavbarProps {
  locale: Locale;
  dict: Dictionary;
}

export function Navbar({ locale, dict }: NavbarProps) {
  const pathname = usePathname() || `/${locale}`;
  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar';
  const [demoUser, setDemoUser] = useState<{ username: string } | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const sync = () => {
      try {
        const raw = localStorage.getItem('rage_demo_user');
        setDemoUser(raw ? JSON.parse(raw) : null);
      } catch {
        setDemoUser(null);
      }
    };
    sync();
    window.addEventListener('rage-demo-auth-change', sync);
    return () => window.removeEventListener('rage-demo-auth-change', sync);
  }, []);

  function handleLogout() {
    localStorage.removeItem('rage_demo_user');
    setDemoUser(null);
    window.dispatchEvent(new Event('rage-demo-auth-change'));
  }

  const navItems = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/tournaments`, label: dict.nav.tournaments },
    { href: `/${locale}/leaderboards`, label: dict.nav.leaderboards },
    { href: `/${locale}/dashboard`, label: dict.nav.dashboard }
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-[#27272C] bg-[#0B0B0C]/95 backdrop-blur">
      <div className="border-b border-[#27272C] bg-[#171719] px-4 py-1.5 text-center text-xs text-[#B5B2AC]">
        {dict.demoBanner}
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <Image
            src="/brand/logo-rage-fire.png"
            alt="RAGE"
            width={115}
            height={32}
            className="h-7 w-auto"
            priority
          />
          <span className="hidden text-sm font-extrabold tracking-wide text-[#F2EFE9] sm:inline">
            {dict.brand}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-1.5 text-sm font-bold">
          {navItems.map((item) => {
            const isActive =
              item.href === `/${locale}`
                ? pathname === `/${locale}`
                : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-lg px-3.5 py-2 transition-colors ${
                  isActive
                    ? 'bg-[#202024] text-[#FF6A1A]'
                    : 'text-[#B5B2AC] hover:bg-[#171719] hover:text-[#F2EFE9]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden md:flex items-center gap-2.5">
          <Link
            href={`/${otherLocale}`}
            className="rounded-lg border border-[#27272C] bg-[#171719] px-3 py-1.5 text-xs font-bold text-[#F2EFE9] hover:border-[#3A3A42]"
          >
            {dict.nav.langSwitch}
          </Link>
          {demoUser ? (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="rounded-lg border border-[#27272C] bg-[#171719] px-3.5 py-1.5 text-sm font-bold text-[#FF6A1A] ltr-isolate"
              >
                {demoUser.username}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-lg border border-[#EF4444]/35 bg-[#EF4444]/15 px-3 py-1.5 text-xs font-bold text-[#FCA5A5] cursor-pointer"
              >
                {dict.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/login`}
                className="rounded-lg border border-[#27272C] bg-[#171719] px-3.5 py-1.5 text-sm font-bold text-[#F2EFE9] hover:border-[#3A3A42]"
              >
                {dict.nav.login}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-lg bg-[#FF6A1A] px-4 py-1.5 text-sm font-extrabold text-[#0B0B0C] hover:bg-[#FF7E38]"
              >
                {dict.nav.signup}
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((prev) => !prev)}
          aria-expanded={mobileOpen}
          aria-label={mobileOpen ? dict.nav.menuClose : dict.nav.menuOpen}
          className="md:hidden rounded-lg border border-[#27272C] bg-[#171719] p-2 text-[#F2EFE9] hover:border-[#3A3A42] cursor-pointer"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            {mobileOpen ? (
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            ) : (
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            )}
          </svg>
        </button>
      </div>

      <MobileNavigation
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
        locale={locale}
        otherLocale={otherLocale}
        pathname={pathname}
        dict={dict}
        demoUser={demoUser}
        onLogout={handleLogout}
      />
    </header>
  );
}
