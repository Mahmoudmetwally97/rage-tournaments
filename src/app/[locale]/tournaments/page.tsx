import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getTournaments } from '@/lib/data/tournament-repo';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { TournamentsExplorer } from '@/components/tournaments/TournamentsExplorer';

export default async function TournamentsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];
  const { items: tournaments } = await getTournaments();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <SectionHeader
        title={dict.nav.tournaments}
        subtitle={dict.home.openTournamentsSub}
      />
      <TournamentsExplorer tournaments={tournaments} locale={locale} dict={dict} />
    </div>
  );
}
