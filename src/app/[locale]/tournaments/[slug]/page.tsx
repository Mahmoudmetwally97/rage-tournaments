import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getTournamentBySlug } from '@/lib/data/tournament-repo';
import type { Metadata } from 'next';
import { buildMeta } from '@/lib/seo';
import { TournamentDetailClient } from '@/components/tournaments/TournamentDetailClient';

export async function generateMetadata({ params }: { params: Promise<{ locale: string; slug: string }> }): Promise<Metadata> {
  const { locale, slug } = await params;
  const { item: t } = await getTournamentBySlug(slug);
  if (!t) return {};
  const ar = locale === 'ar';
  const title = ar ? t.titleAr : t.titleEn;
  const prize = ar ? t.prizeConfirmedAr : t.prizeConfirmedEn;
  const game = ar ? t.gameAr : t.gameEn;
  const description = [
    ar ? `بطولة ${game}` : `${game} tournament`,
    prize,
    ar ? `${t.registeredCount}/${t.maxParticipants} لاعب مسجل` : `${t.registeredCount}/${t.maxParticipants} players registered`
  ].filter(Boolean).join(' · ');
  return buildMeta({ title, description, path: `/${locale}/tournaments/${slug}`, image: t.coverUrl, locale });
}

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
