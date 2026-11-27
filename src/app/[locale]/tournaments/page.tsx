import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_TOURNAMENTS } from '@/lib/data/demo-tournaments';
import { TournamentCard } from '@/components/tournaments/TournamentCard';

export default async function TournamentsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#F2EFE9] sm:text-3xl">{dict.nav.tournaments}</h1>
        <p className="mt-1 text-sm text-[#B5B2AC]">{dict.demoBanner}</p>
      </div>
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {DEMO_TOURNAMENTS.map((t) => (
          <TournamentCard key={t.slug} tournament={t} locale={locale} dict={dict} />
        ))}
      </div>
    </div>
  );
}
