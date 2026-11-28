import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getTournamentBySlug } from '@/lib/data/tournament-repo';
import { TournamentDetailClient } from '@/components/tournaments/TournamentDetailClient';

export default async function TournamentDetailPage({
  params
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isValidLocale(locale)) notFound();
  const { item: tournament } = await getTournamentBySlug(slug);
  if (!tournament) notFound();

  return (
    <TournamentDetailClient
      tournament={tournament}
      locale={locale}
      dict={dictionaries[locale]}
    />
  );
}
