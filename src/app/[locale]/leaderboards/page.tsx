import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_TOURNAMENTS } from '@/lib/data/demo-tournaments';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { LeaderboardTable } from '@/components/tournaments/LeaderboardTable';

export default async function LeaderboardsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];
  const sample = DEMO_TOURNAMENTS[0]?.sampleParticipants ?? [];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SectionHeader title={dict.nav.leaderboards} subtitle={dict.demoBanner} />
      <LeaderboardTable rows={sample} dict={dict} locale={locale} />
    </div>
  );
}
