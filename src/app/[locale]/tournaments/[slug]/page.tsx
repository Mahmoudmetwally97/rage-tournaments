import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_TOURNAMENTS } from '@/lib/data/demo-tournaments';
import { TournamentDetailClient } from '@/components/tournaments/TournamentDetailClient';

export default async function TournamentDetailPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  const tournament = DEMO_TOURNAMENTS.find((t) => t.slug === slug);
  if (!tournament) notFound();

  return (
    <TournamentDetailClient
      tournament={tournament}
      locale={locale}
      dict={dictionaries[locale]}
    />
  );
}
