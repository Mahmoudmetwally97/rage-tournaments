import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import {
  DEMO_RECENT_RESULTS,
  DEMO_TOURNAMENTS,
  DEMO_UPCOMING_MATCHES
} from '@/lib/data/demo-tournaments';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { MatchCard } from '@/components/tournaments/MatchCard';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function PlayerDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  const user = await getCurrentUser();
  const supabase = await getSupabaseServerClient();
  let profile: { username: string; display_name: string | null } | null = null;
  let isOrganizer = false;

  if (user && supabase) {
    const { data } = await supabase
      .from('player_profiles')
      .select('username,display_name')
      .eq('id', user.id)
      .maybeSingle();
    profile = data ?? null;

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    isOrganizer = (roles ?? []).some((r) => r.role === 'super_admin' || r.role === 'moderator');
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Player Summary Header */}
      <section className="flex flex-col justify-between gap-4 rounded-none border border-[#2b2d30] bg-[#151619] p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#f4f4ed] sm:text-3xl">
            {profile ? (locale === 'ar' ? `أهلاً ${profile.username}` : `Welcome ${profile.username}`) : dict.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-[#a4a6aa]">
            {user
              ? isOrganizer
                ? locale === 'ar'
                  ? 'حسابك مُسجَّل كمنظِّم للبطولات.'
                  : 'Your account is registered as a tournament organizer.'
                : dict.dashboard.subtitle
              : locale === 'ar'
                ? 'سجّل الدخول لعرض بطولاتك ونتائجك.'
                : 'Sign in to see your tournaments and results.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOrganizer && (
            <Link
              href={`/${locale}/admin`}
              className="rounded-none border border-[#e5ed43] px-5 py-2.5 text-center text-sm font-extrabold text-[#e5ed43] hover:bg-[#e5ed43]/10"
            >
              {locale === 'ar' ? 'لوحة الإدارة' : 'Admin console'}
            </Link>
          )}
          <Link
            href={`/${locale}/tournaments`}
            className="rounded-none bg-[#e5ed43] px-5 py-2.5 text-center text-sm font-extrabold text-[#0d0e10] hover:bg-[#eef46b]"
          >
            {dict.dashboard.browseAction}
          </Link>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-8 lg:col-span-2">
          {/* Registered Tournaments */}
          <section>
            <SectionHeader title={dict.dashboard.myTournaments} />
            <div className="space-y-3">
              {DEMO_TOURNAMENTS.slice(0, 2).map((t, idx) => (
                <div
                  key={t.slug}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-none border border-[#2b2d30] bg-[#151619] p-4"
                >
                  <div>
                    <div className="font-extrabold text-[#f4f4ed]">
                      {locale === 'ar' ? t.titleAr : t.titleEn}
                    </div>
                    <div className="mt-1 text-xs text-[#6f7276] ltr-isolate">{t.formatLabel}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge variant={idx === 0 ? 'open' : 'warning'}>
                      {idx === 0 ? dict.dashboard.checkInReady : dict.dashboard.checkInPending}
                    </StatusBadge>
                    <Link
                      href={`/${locale}/tournaments/${t.slug}`}
                      className="rounded-none border border-[#2b2d30] bg-[#1b1d20] px-3 py-1.5 text-xs font-bold text-[#f4f4ed] hover:border-[#3a3d40]"
                    >
                      {dict.tournament.viewDetails}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Upcoming Matches */}
          <section>
            <SectionHeader title={dict.dashboard.myMatches} />
            <div className="grid gap-3.5 sm:grid-cols-2">
              {DEMO_UPCOMING_MATCHES.map((m) => (
                <MatchCard key={m.id} match={m} locale={locale} />
              ))}
            </div>
          </section>
        </div>

        {/* Sidebar: Recent Results & RAGE Link Status */}
        <aside className="space-y-6">
          <section className="rounded-none border border-[#2b2d30] bg-[#151619] p-5">
            <h2 className="mb-3 text-base font-extrabold text-[#f4f4ed]">{dict.dashboard.recentResults}</h2>
            <div className="space-y-3">
              {DEMO_RECENT_RESULTS.map((m) => (
                <MatchCard key={m.id} match={m} locale={locale} />
              ))}
            </div>
          </section>

          <section className="rounded-none border border-[#2b2d30] bg-[#151619] p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[#f4f4ed]">{dict.dashboard.rageLinkTitle}</h2>
              <StatusBadge variant="warning">
                {locale === 'ar' ? 'قيد التحقق' : 'Pending'}
              </StatusBadge>
            </div>
            <p className="text-xs leading-relaxed text-[#a4a6aa]">{dict.dashboard.rageLinkDesc}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
