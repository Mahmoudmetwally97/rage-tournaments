'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
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
    <header className="sticky top-0 z-40 border-b border-[#2b2d30] bg-[#0d0e10]/95 backdrop-blur">
      <div className="border-b border-[#2b2d30] bg-[#151619] px-4 py-1.5 text-center text-xs text-[#a4a6aa]">
        {dict.demoBanner}
      </div>

      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="brand-lockup" aria-label="RAGE Tournaments">
          <span className="brand-wordmark">RAGE</span>
          <span className="brand-sublabel">{locale === 'ar' ? 'بطولات' : 'TOURNAMENTS'}</span>
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
                className={`rounded-none px-3.5 py-2 transition-colors ${
                  isActive
                    ? 'bg-[#1b1d20] text-[#e5ed43]'
                    : 'text-[#a4a6aa] hover:bg-[#151619] hover:text-[#f4f4ed]'
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
            className="rounded-none border border-[#2b2d30] bg-[#151619] px-3 py-1.5 text-xs font-bold text-[#f4f4ed] hover:border-[#3a3d40]"
          >
            {dict.nav.langSwitch}
          </Link>
          {demoUser ? (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="rounded-none border border-[#2b2d30] bg-[#151619] px-3.5 py-1.5 text-sm font-bold text-[#e5ed43] ltr-isolate"
              >
                {demoUser.username}
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-none border border-[#EF4444]/35 bg-[#EF4444]/15 px-3 py-1.5 text-xs font-bold text-[#FCA5A5] cursor-pointer"
              >
                {dict.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/login`}
                className="rounded-none border border-[#2b2d30] bg-[#151619] px-3.5 py-1.5 text-sm font-bold text-[#f4f4ed] hover:border-[#3a3d40]"
              >
                {dict.nav.login}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="rounded-none bg-[#e5ed43] px-4 py-1.5 text-sm font-extrabold text-[#0d0e10] hover:bg-[#eef46b]"
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
          className="md:hidden rounded-none border border-[#2b2d30] bg-[#151619] p-2 text-[#f4f4ed] hover:border-[#3a3d40] cursor-pointer"
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
