'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { MobileNavigation } from './MobileNavigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface NavbarProps {
  locale: Locale;
  dict: Dictionary;
}

export function Navbar({ locale, dict }: NavbarProps) {
  const pathname = usePathname() || `/${locale}`;
  const router = useRouter();
  const otherLocale: Locale = locale === 'ar' ? 'en' : 'ar';
  const [demoUser, setDemoUser] = useState<{ username: string; avatar?: string } | null>(null);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const supabase = getSupabaseBrowserClient();

    const readDemo = () => {
      try {
        const raw = localStorage.getItem('rage_demo_user');
        setDemoUser(raw ? JSON.parse(raw) : null);
      } catch {
        setDemoUser(null);
      }
    };

    if (!supabase) {
      readDemo();
      window.addEventListener('rage-demo-auth-change', readDemo);
      return () => window.removeEventListener('rage-demo-auth-change', readDemo);
    }

    const nameOf = (user: { email?: string | null; user_metadata?: Record<string, unknown> } | null) => {
      if (!user) return null;
      const m = (user.user_metadata ?? {}) as Record<string, unknown>;
      const pick = (...ks: string[]) => ks.map((k) => m[k]).find((v) => typeof v === 'string' && v) as string | undefined;
      return {
        username: pick('username', 'user_name', 'preferred_username', 'full_name', 'name') || user.email?.split('@')[0] || 'Player',
        avatar: pick('avatar_url', 'picture')
      };
    };

    const loadRoles = async (userId: string | null) => {
      if (!userId) {
        setIsOrganizer(false);
        return;
      }
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', userId);
      setIsOrganizer((data ?? []).some((r) => r.role === 'super_admin' || r.role === 'moderator'));
    };

    supabase.auth.getSession().then(({ data }) => {
      const user = data.session?.user ?? null;
      setDemoUser(nameOf(user));
      void loadRoles(user?.id ?? null);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user ?? null;
      setDemoUser(nameOf(user));
      void loadRoles(user?.id ?? null);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleLogout() {
    const supabase = getSupabaseBrowserClient();
    if (supabase) await supabase.auth.signOut();
    localStorage.removeItem('rage_demo_user');
    setDemoUser(null);
    window.dispatchEvent(new Event('rage-demo-auth-change'));
    router.refresh();
  }

  const navItems = [
    { href: `/${locale}`, label: dict.nav.home },
    { href: `/${locale}/tournaments`, label: dict.nav.tournaments },
    { href: `/${locale}/leaderboards`, label: dict.nav.leaderboards },
    { href: `/${locale}/dashboard`, label: dict.nav.dashboard },
    ...(isOrganizer
      ? [{ href: `/${locale}/admin`, label: locale === 'ar' ? 'لوحة الإدارة' : 'Admin' }]
      : [])
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
                className={`clip-chip px-4 py-2 font-extrabold transition-colors ${
                  isActive
                    ? 'bg-[#e5ed43] text-[#0d0e10]'
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
            className="clip-btn rounded-none bg-[#23252a] px-3 py-2 text-xs font-extrabold text-[#f4f4ed] hover:bg-[#2d3036]"
          >
            {dict.nav.langSwitch}
          </Link>
          {demoUser ? (
            <>
              <Link
                href={`/${locale}/dashboard`}
                className="rounded-none border border-[#2b2d30] bg-[#151619] px-3.5 py-1.5 text-sm font-bold text-[#e5ed43] ltr-isolate"
              >
                <span className="inline-flex items-center gap-2">
                  {demoUser.avatar && /^https:\/\//.test(demoUser.avatar) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={demoUser.avatar} alt="" width={22} height={22} referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full object-cover" />
                  )}
                  {demoUser.username}
                </span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="clip-btn rounded-none bg-[#EF4444]/20 px-3 py-2 text-xs font-extrabold text-[#FCA5A5] cursor-pointer"
              >
                {dict.nav.logout}
              </button>
            </>
          ) : (
            <>
              <Link
                href={`/${locale}/login`}
                className="clip-btn rounded-none bg-[#23252a] px-4 py-2 text-sm font-extrabold text-[#f4f4ed] hover:bg-[#2d3036]"
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
        isOrganizer={isOrganizer}
        onLogout={handleLogout}
      />
    </header>
  );
}
