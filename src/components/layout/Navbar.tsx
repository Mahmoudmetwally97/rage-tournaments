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
  const [menuOpen, setMenuOpen] = useState(false);
  const [prof, setProf] = useState<{ username: string; avatar_url: string | null } | null>(null);

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
        setProf(null);
        setIsOrganizer(false);
        return;
      }
      const { data: pr } = await supabase.from('player_profiles').select('username,avatar_url').eq('id', userId).maybeSingle();
      setProf(pr ?? null);
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
    { href: `/${locale}/teams`, label: locale === 'ar' ? 'التيمات' : 'Teams' },
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
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  aria-expanded={menuOpen}
                  aria-haspopup="menu"
                  className="inline-flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-none border border-[#2b2d30] bg-[#151619] px-3 py-1.5 text-sm font-bold text-[#e5ed43] ltr-isolate hover:border-[#3a3d40]"
                >
                  {(prof?.avatar_url || (demoUser.avatar && /^https:\/\//.test(demoUser.avatar))) && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={prof?.avatar_url || demoUser.avatar} alt="" width={22} height={22} referrerPolicy="no-referrer" className="h-[22px] w-[22px] rounded-full object-cover" />
                  )}
                  {prof?.username || demoUser.username}
                  <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor"><path d="M5 7l5 6 5-6H5z" /></svg>
                </button>
                {menuOpen && (
                  <>
                    <button type="button" aria-label="close" className="fixed inset-0 z-40 cursor-default" onClick={() => setMenuOpen(false)} />
                    <div role="menu" className="absolute end-0 top-full z-50 mt-2 w-60 border border-[#2b2d30] bg-[#101113] p-2 shadow-xl">
                      <div className="border-b border-[#2b2d30] px-3 pb-2 pt-1 text-xs font-extrabold text-[#a4a6aa] ltr-isolate">{prof?.username || demoUser.username}</div>
                      {[
                        { href: `/${locale}/u/${prof?.username || demoUser.username}`, label: locale === 'ar' ? 'البروفايل' : 'Profile' },
                        { href: `/${locale}/settings`, label: locale === 'ar' ? 'إعدادات الحساب' : 'Account settings' },
                        { href: `/${locale}/teams`, label: locale === 'ar' ? 'تيماتي' : 'My teams' },
                        { href: `/${locale}/dashboard`, label: locale === 'ar' ? 'بطولاتي' : 'My tournaments' },
                        ...(isOrganizer ? [{ href: `/${locale}/admin`, label: locale === 'ar' ? 'لوحة الإدارة' : 'Admin console' }] : [])
                      ].map((i) => (
                        <Link key={i.href} href={i.href} role="menuitem" onClick={() => setMenuOpen(false)} className="block px-3 py-2 text-sm font-bold text-[#d6d7d2] hover:bg-[#1b1d20] hover:text-[#e5ed43]">{i.label}</Link>
                      ))}
                      <button type="button" role="menuitem" onClick={() => { setMenuOpen(false); void handleLogout(); }} className="mt-1 block w-full cursor-pointer border-t border-[#2b2d30] px-3 py-2 text-start text-sm font-bold text-[#FCA5A5] hover:bg-[#EF4444]/10">{dict.nav.logout}</button>
                    </div>
                  </>
                )}
              </div>
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
        demoUser={prof ? { username: prof.username } : demoUser}
        isOrganizer={isOrganizer}
        onLogout={handleLogout}
      />
    </header>
  );
}
