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

export default async function PlayerDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Player Summary Header */}
      <section className="flex flex-col justify-between gap-4 rounded-2xl border border-[#27272C] bg-[#171719] p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#F2EFE9] sm:text-3xl">{dict.dashboard.title}</h1>
          <p className="mt-1 text-sm text-[#B5B2AC]">{dict.dashboard.subtitle}</p>
        </div>
        <Link
          href={`/${locale}/tournaments`}
          className="rounded-lg bg-[#FF6A1A] px-5 py-2.5 text-center text-sm font-extrabold text-[#0B0B0C] hover:bg-[#FF7E38]"
        >
          {dict.dashboard.browseAction}
        </Link>
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
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#27272C] bg-[#171719] p-4"
                >
                  <div>
                    <div className="font-extrabold text-[#F2EFE9]">
                      {locale === 'ar' ? t.titleAr : t.titleEn}
                    </div>
                    <div className="mt-1 text-xs text-[#7A7874] ltr-isolate">{t.formatLabel}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge variant={idx === 0 ? 'open' : 'warning'}>
                      {idx === 0 ? dict.dashboard.checkInReady : dict.dashboard.checkInPending}
                    </StatusBadge>
                    <Link
                      href={`/${locale}/tournaments/${t.slug}`}
                      className="rounded-lg border border-[#27272C] bg-[#202024] px-3 py-1.5 text-xs font-bold text-[#F2EFE9] hover:border-[#3A3A42]"
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
          <section className="rounded-xl border border-[#27272C] bg-[#171719] p-5">
            <h2 className="mb-3 text-base font-extrabold text-[#F2EFE9]">{dict.dashboard.recentResults}</h2>
            <div className="space-y-3">
              {DEMO_RECENT_RESULTS.map((m) => (
                <MatchCard key={m.id} match={m} locale={locale} />
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-[#27272C] bg-[#171719] p-5">
            <div className="mb-2 flex items-center justify-between gap-2">
              <h2 className="text-base font-extrabold text-[#F2EFE9]">{dict.dashboard.rageLinkTitle}</h2>
              <StatusBadge variant="warning">
                {locale === 'ar' ? 'قيد التحقق' : 'Pending'}
              </StatusBadge>
            </div>
            <p className="text-xs leading-relaxed text-[#B5B2AC]">{dict.dashboard.rageLinkDesc}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
