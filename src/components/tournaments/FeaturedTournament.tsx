import { ctaFor, ctaHref, statusBadge } from '@/lib/format';
import { qualifiesLabel } from '@/lib/format';
import Link from 'next/link';
import { formatStartDate } from '@/lib/format';
import Image from 'next/image';
import type { DemoTournament } from '@/lib/data/demo-tournaments';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface FeaturedTournamentProps {
  tournament: DemoTournament;
  locale: Locale;
  dict: Dictionary;
}

export function FeaturedTournament({ tournament, locale, dict }: FeaturedTournamentProps) {
  const title = locale === 'ar' ? tournament.titleAr : tournament.titleEn;
  const game = locale === 'ar' ? tournament.gameAr : tournament.gameEn;
  const capacityText =
    tournament.maxParticipants > 0
      ? `${tournament.registeredCount} / ${tournament.maxParticipants}`
      : `${tournament.registeredCount} / ${dict.tournament.unlimited}`;

  const formattedDate = formatStartDate(tournament.startsAtIso, locale);

  return (
    <section className="relative overflow-hidden rounded-none border border-[#2b2d30] bg-[#151619] tactical-grid-bg">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#e5ed43]" />
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge variant="live" pulse>
              {dict.home.featuredLabel}
            </StatusBadge>
            <StatusBadge variant={statusBadge(tournament.status, locale === 'ar').variant} pulse={tournament.status === 'live'}>{statusBadge(tournament.status, locale === 'ar').text}</StatusBadge>
            <StatusBadge>
              {tournament.competitionType === 'solo' ? dict.tournament.solo : dict.tournament.team}
            </StatusBadge>
            <StatusBadge>{dict.tournament.free}</StatusBadge>
          </div>

          <p className="mb-1.5 text-xs font-bold tracking-wider text-[#e5ed43] uppercase">{game}</p>
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-[#f4f4ed] sm:text-3xl">
            {title}
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-none border border-[#2b2d30] bg-[#0d0e10]/90 p-3.5">
              <div className="text-xs text-[#6f7276]">{dict.tournament.format}</div>
              <div className="mt-1 text-sm font-bold text-[#f4f4ed] ltr-isolate">{tournament.formatLabel}</div>
            </div>
            <div className="rounded-none border border-[#2b2d30] bg-[#0d0e10]/90 p-3.5">
              <div className="text-xs text-[#6f7276]">{dict.tournament.slots}</div>
              <div className="mt-1 text-sm font-bold text-[#f4f4ed] ltr-isolate">{capacityText}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-none border border-[#2b2d30] bg-[#0d0e10]/90 p-3.5">
              <div className="text-xs text-[#6f7276]">{dict.tournament.startsAt}</div>
              <div className="mt-1 text-sm font-bold text-[#f4f4ed]">{formattedDate}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-5 rounded-none border border-[#2b2d30] bg-[#1b1d20] p-5">
          <div className="flex items-center justify-between border-b border-[#2b2d30] pb-4">
            <Image
              src="/brand/logo-rage-fire.png"
              alt="RAGE"
              width={110}
              height={32}
              className="h-7 w-auto"
            />
            <span className="text-xs font-bold text-[#a4a6aa] ltr-isolate">
              {tournament.stages.length} {locale === 'ar' ? 'مراحل' : 'Stages'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-[#a4a6aa]">
            {tournament.stages.map((st) => (
              <div key={st.order} className="flex items-center justify-between">
                <span className="font-semibold text-[#f4f4ed]">
                  {locale === 'ar' ? st.nameAr : st.nameEn}
                </span>
                <span className="text-[#e5ed43] font-bold ltr-isolate">{qualifiesLabel(st.qualifies, locale === 'ar')}</span>
              </div>
            ))}
          </div>

          <Link
            href={ctaHref(tournament.status, locale, tournament.slug)}
            className="w-full rounded-none bg-[#e5ed43] px-5 py-3 text-center text-sm font-extrabold text-[#0d0e10] transition-colors hover:bg-[#eef46b]"
          >
            {ctaFor(tournament.status, locale === 'ar')}
          </Link>
        </div>
      </div>
    </section>
  );
}
