import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_RECENT_RESULTS, DEMO_TOURNAMENTS, DEMO_UPCOMING_MATCHES } from '@/lib/data/demo-tournaments';
import { getTournaments } from '@/lib/data/tournament-repo';
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

  const { items: tournaments, source } = await getTournaments();
  const featured = tournaments.find((t) => t.featured) ?? tournaments[0];
  const topPlayers = DEMO_TOURNAMENTS[0]?.sampleParticipants ?? [];

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      {/* Brand hero: RAGE character art + condensed display type (design source: ragegames.net) */}
      <section className="clip-card hero-slash relative min-h-[420px] overflow-hidden border border-[#2b2d30] bg-[#0d0e10]">
        <Image
          src="/brand/rage-characters.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[62%_18%] opacity-95"
        />
        <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-[#0d0e10] via-[#0d0e10]/85 to-[#0d0e10]/10" />
        <div className="relative p-6 sm:p-12 lg:p-16">
          <div className="max-w-2xl">
            <p className="eyebrow mb-5">
              {dict.hero.eyebrow}
              <span className="ml-3 border border-[#2b2d30] px-2 py-0.5 text-[10px] font-bold tracking-[0.16em] text-[#a4a6aa]">
                {source === 'db' ? 'SUPABASE • LIVE' : 'DEMO DATA'}
              </span>
            </p>
            <h1 className="mb-5 text-4xl font-extrabold leading-[0.95] tracking-tight text-[#f4f4ed] sm:text-6xl lg:text-7xl">
              {dict.hero.title}
            </h1>
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-[#a4a6aa] sm:text-base">
              {dict.hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/tournaments`}
                className="clip-btn btn-shine bg-[#e5ed43] px-8 py-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#121408] transition-colors hover:bg-[#eef46b]"
              >
                {dict.hero.ctaPrimary}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="clip-btn border border-[#8a8b7b] bg-[#141618]/60 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#f4f4ed] transition-colors hover:border-[#a4a6aa]"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>
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
          {tournaments.map((t) => (
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
        <LeaderboardTable rows={topPlayers} dict={dict} locale={locale} />
      </section>
    </div>
  );
}
