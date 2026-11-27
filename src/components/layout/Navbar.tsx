'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';

interface NavbarProps {
  locale: Locale;
  dict: Dictionary;
}

export function Navbar({ locale, dict }: NavbarProps) {
  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar';
  const [demoUser, setDemoUser] = useState<{ username: string } | null>(null);

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

  return (
    <header className="sticky top-0 z-40 border-b border-[#27272C] bg-[#0B0B0C]/95 backdrop-blur">
      <div className="bg-[#171719] border-b border-[#27272C] px-4 py-1.5 text-center text-xs text-[#B5B2AC]">
        {dict.demoBanner}
      </div>
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href={`/${locale}`} className="flex items-center gap-3">
          <img src="/brand/logo-rage-fire.png" alt="RAGE" className="h-8 w-auto" />
          <span className="font-bold tracking-wide text-[#F2EFE9] hidden sm:inline">
            {dict.brand}
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 text-sm font-semibold text-[#B5B2AC]">
          <Link href={`/${locale}`} className="hover:text-[#F2EFE9] transition-colors">
            {dict.nav.home}
          </Link>
          <Link href={`/${locale}/tournaments`} className="hover:text-[#F2EFE9] transition-colors">
            {dict.nav.tournaments}
          </Link>
          <Link href={`/${locale}/leaderboards`} className="hover:text-[#F2EFE9] transition-colors">
            {dict.nav.leaderboards}
          </Link>
          <Link href={`/${locale}/dashboard`} className="hover:text-[#F2EFE9] transition-colors">
            {dict.nav.dashboard}
          </Link>
        </nav>

        <div className="flex items-center gap-2.5">
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
                {locale === 'ar' ? 'خروج' : 'Logout'}
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
                className="rounded-lg bg-[#FF6A1A] px-3.5 py-1.5 text-sm font-bold text-[#0B0B0C] hover:bg-[#FF7E38]"
              >
                {dict.nav.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
