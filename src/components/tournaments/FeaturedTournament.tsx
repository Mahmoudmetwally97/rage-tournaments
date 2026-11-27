import Link from 'next/link';
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

  const formattedDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(tournament.startsAtIso));

  return (
    <section className="relative overflow-hidden rounded-2xl border border-[#27272C] bg-[#171719] tactical-grid-bg">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#FF6A1A]" />
      <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-12 lg:items-center">
        <div className="lg:col-span-8">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <StatusBadge variant="live" pulse>
              {dict.home.featuredLabel}
            </StatusBadge>
            <StatusBadge variant="open">{dict.tournament.open}</StatusBadge>
            <StatusBadge>
              {tournament.competitionType === 'solo' ? dict.tournament.solo : dict.tournament.team}
            </StatusBadge>
            <StatusBadge>{dict.tournament.free}</StatusBadge>
          </div>

          <p className="mb-1.5 text-xs font-bold tracking-wider text-[#FF6A1A] uppercase">{game}</p>
          <h2 className="mb-3 text-2xl font-extrabold tracking-tight text-[#F2EFE9] sm:text-3xl">
            {title}
          </h2>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-[#27272C] bg-[#0B0B0C]/90 p-3.5">
              <div className="text-xs text-[#7A7874]">{dict.tournament.format}</div>
              <div className="mt-1 text-sm font-bold text-[#F2EFE9] ltr-isolate">{tournament.formatLabel}</div>
            </div>
            <div className="rounded-xl border border-[#27272C] bg-[#0B0B0C]/90 p-3.5">
              <div className="text-xs text-[#7A7874]">{dict.tournament.slots}</div>
              <div className="mt-1 text-sm font-bold text-[#F2EFE9] ltr-isolate">{capacityText}</div>
            </div>
            <div className="col-span-2 sm:col-span-1 rounded-xl border border-[#27272C] bg-[#0B0B0C]/90 p-3.5">
              <div className="text-xs text-[#7A7874]">{dict.tournament.startsAt}</div>
              <div className="mt-1 text-sm font-bold text-[#F2EFE9]">{formattedDate}</div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col justify-between gap-5 rounded-xl border border-[#27272C] bg-[#202024] p-5">
          <div className="flex items-center justify-between border-b border-[#27272C] pb-4">
            <Image
              src="/brand/logo-rage-fire.png"
              alt="RAGE"
              width={110}
              height={32}
              className="h-7 w-auto"
            />
            <span className="text-xs font-bold text-[#B5B2AC] ltr-isolate">
              {tournament.stages.length} {locale === 'ar' ? 'مراحل' : 'Stages'}
            </span>
          </div>

          <div className="space-y-2 text-xs text-[#B5B2AC]">
            {tournament.stages.map((st) => (
              <div key={st.order} className="flex items-center justify-between">
                <span className="font-semibold text-[#F2EFE9]">
                  {locale === 'ar' ? st.nameAr : st.nameEn}
                </span>
                <span className="text-[#FF6A1A] font-bold ltr-isolate">{st.qualifies}</span>
              </div>
            ))}
          </div>

          <Link
            href={`/${locale}/tournaments/${tournament.slug}`}
            className="w-full rounded-lg bg-[#FF6A1A] px-5 py-3 text-center text-sm font-extrabold text-[#0B0B0C] transition-colors hover:bg-[#FF7E38]"
          >
            {dict.tournament.registerNow}
          </Link>
        </div>
      </div>
    </section>
  );
}
