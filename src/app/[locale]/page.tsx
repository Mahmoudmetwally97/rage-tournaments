import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_TOURNAMENTS } from '@/lib/data/demo-tournaments';
import { TournamentCard } from '@/components/tournaments/TournamentCard';

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Hero Section */}
      <section className="mb-10 rounded-2xl border border-[#27272C] bg-[#171719] p-6 sm:p-10">
        <p className="mb-2 text-xs font-bold tracking-wider text-[#FF6A1A] uppercase">
          {dict.hero.eyebrow}
        </p>
        <h1 className="mb-4 max-w-3xl text-3xl font-extrabold leading-tight text-[#F2EFE9] sm:text-5xl">
          {dict.hero.title}
        </h1>
        <p className="mb-7 max-w-2xl text-sm text-[#B5B2AC] sm:text-base leading-relaxed">
          {dict.hero.subtitle}
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href={`/${locale}/tournaments`}
            className="rounded-lg bg-[#FF6A1A] px-6 py-3 text-sm font-bold text-[#0B0B0C] hover:bg-[#FF7E38]"
          >
            {dict.hero.ctaPrimary}
          </Link>
          <Link
            href={`/${locale}/register`}
            className="rounded-lg border border-[#27272C] bg-[#0B0B0C] px-6 py-3 text-sm font-bold text-[#F2EFE9] hover:border-[#3A3A42]"
          >
            {dict.hero.ctaSecondary}
          </Link>
        </div>
      </section>

      {/* Open Registration Tournaments */}
      <section className="mb-12">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-extrabold text-[#F2EFE9]">{dict.home.openTournaments}</h2>
          <Link href={`/${locale}/tournaments`} className="text-sm font-bold text-[#FF6A1A] hover:underline">
            {dict.home.viewAll}
          </Link>
        </div>
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {DEMO_TOURNAMENTS.map((t) => (
            <TournamentCard key={t.slug} tournament={t} locale={locale} dict={dict} />
          ))}
        </div>
      </section>

      {/* Upcoming Matches & Leaderboard Preview */}
      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-[#27272C] bg-[#171719] p-5">
          <h3 className="mb-4 text-base font-extrabold text-[#F2EFE9]">{dict.home.upcomingMatches}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-[#27272C] bg-[#0B0B0C] p-3">
              <span>[DEMO] FFA Qualifiers — Room 1</span>
              <span className="text-xs font-bold text-[#FF6A1A] ltr-isolate">Fri 21:00 UTC+2</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#27272C] bg-[#0B0B0C] p-3">
              <span>[DEMO] Team_Pharaohs vs Delta_Squad</span>
              <span className="text-xs font-bold text-[#B5B2AC] ltr-isolate">Sat 22:00 UTC+2</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-[#27272C] bg-[#171719] p-5">
          <h3 className="mb-4 text-base font-extrabold text-[#F2EFE9]">{dict.home.leaderboardPreview}</h3>
          <div className="space-y-3 text-sm">
            <div className="flex items-center justify-between rounded-lg border border-[#27272C] bg-[#0B0B0C] p-3">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-[#FFB938] ltr-isolate">#1</span>
                <span className="font-bold ltr-isolate">[EG]ProSniper</span>
              </div>
              <span className="font-bold text-[#F2EFE9] ltr-isolate">42 pts</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-[#27272C] bg-[#0B0B0C] p-3">
              <div className="flex items-center gap-3">
                <span className="font-extrabold text-[#B5B2AC] ltr-isolate">#2</span>
                <span className="font-bold ltr-isolate">Viper_CF</span>
              </div>
              <span className="font-bold text-[#F2EFE9] ltr-isolate">38 pts</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
