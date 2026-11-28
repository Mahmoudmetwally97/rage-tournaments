import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getTournamentBySlug } from '@/lib/data/tournament-repo';
import type { Metadata } from 'next';
import { buildMeta } from '@/lib/seo';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { loadBracket } from '@/lib/bracket';
import { TeamBracket } from '@/components/tournaments/TeamBracket';
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

  const sb = await getSupabaseServerClient();
  const { data: trow } = sb ? await sb.from('tournaments').select('id,competition_type').eq('slug', slug).maybeSingle() : { data: null };
  const bracket = sb && trow?.competition_type === 'team' ? await loadBracket(sb, trow.id as string) : null;

  return (
    <>
      <TournamentDetailClient tournament={tournament} locale={locale} dict={dictionaries[locale]} />
      {bracket && bracket.rounds.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 pb-12 sm:px-6">
          <h2 className="mb-3 text-lg font-extrabold text-[#f4f4ed]">{locale === 'ar' ? 'البراكت' : 'Bracket'}</h2>
          <TeamBracket rounds={bracket.rounds} ar={locale === 'ar'} />
        </section>
      )}
    </>
  );
}
