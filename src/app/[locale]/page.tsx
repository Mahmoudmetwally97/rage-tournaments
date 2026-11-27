import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import {
  DEMO_RECENT_RESULTS,
  DEMO_TOURNAMENTS,
  DEMO_UPCOMING_MATCHES
} from '@/lib/data/demo-tournaments';
import { FeaturedTournament } from '@/components/tournaments/FeaturedTournament';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { MatchCard } from '@/components/tournaments/MatchCard';
import { LeaderboardTable } from '@/components/tournaments/LeaderboardTable';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  const featured = DEMO_TOURNAMENTS.find((t) => t.featured) ?? DEMO_TOURNAMENTS[0];
  const topPlayers = DEMO_TOURNAMENTS[0]?.sampleParticipants ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      {/* Editorial Esports Hero */}
      <section className="relative overflow-hidden rounded-2xl border border-[#27272C] bg-[#171719] p-6 sm:p-12 tactical-grid-bg">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs font-extrabold tracking-widest text-[#FF6A1A] uppercase ltr-isolate">
            {dict.hero.eyebrow}
          </p>
          <h1 className="mb-4 text-3xl font-extrabold leading-tight tracking-tight text-[#F2EFE9] sm:text-5xl">
            {dict.hero.title}
          </h1>
          <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[#B5B2AC] sm:text-base">
            {dict.hero.subtitle}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/tournaments`}
              className="rounded-lg bg-[#FF6A1A] px-6 py-3 text-sm font-extrabold text-[#0B0B0C] transition-colors hover:bg-[#FF7E38]"
            >
              {dict.hero.ctaPrimary}
            </Link>
            <Link
              href={`/${locale}/register`}
              className="rounded-lg border border-[#27272C] bg-[#202024] px-6 py-3 text-sm font-bold text-[#F2EFE9] transition-colors hover:border-[#3A3A42]"
            >
              {dict.hero.ctaSecondary}
            </Link>
          </div>
        </div>
      </section>

      {/* Featured Tournament */}
      {featured && (
        <section>
          <FeaturedTournament tournament={featured} locale={locale} dict={dict} />
        </section>
      )}

      {/* Open & Upcoming Tournaments */}
      <section>
        <SectionHeader
          title={dict.home.openTournaments}
          subtitle={dict.home.openTournamentsSub}
          actionLabel={dict.home.viewAll}
          actionHref={`/${locale}/tournaments`}
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_TOURNAMENTS.map((t) => (
            <TournamentCard key={t.slug} tournament={t} locale={locale} dict={dict} />
          ))}
        </div>
      </section>

      {/* Live / Upcoming Matches & Recent Results */}
      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <SectionHeader title={dict.home.upcomingMatches} />
          <div className="grid gap-3.5">
            {DEMO_UPCOMING_MATCHES.map((m) => (
              <MatchCard key={m.id} match={m} locale={locale} />
            ))}
          </div>
        </div>

        <div>
          <SectionHeader title={dict.home.recentResults} />
          <div className="grid gap-3.5">
            {DEMO_RECENT_RESULTS.map((m) => (
              <MatchCard key={m.id} match={m} locale={locale} />
            ))}
          </div>
        </div>
      </section>

      {/* Leaderboard Preview */}
      <section>
        <SectionHeader
          title={dict.home.leaderboardPreview}
          actionLabel={dict.home.viewLeaderboard}
          actionHref={`/${locale}/leaderboards`}
        />
        <LeaderboardTable rows={topPlayers} dict={dict} />
      </section>
    </div>
  );
}
