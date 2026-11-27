import Link from 'next/link';
import type { DemoTournament } from '@/lib/data/demo-tournaments';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface TournamentCardProps {
  tournament: DemoTournament;
  locale: Locale;
  dict: Dictionary;
}

export function TournamentCard({ tournament, locale, dict }: TournamentCardProps) {
  const title = locale === 'ar' ? tournament.titleAr : tournament.titleEn;
  const game = locale === 'ar' ? tournament.gameAr : tournament.gameEn;
  const prize = locale === 'ar' ? tournament.prizeConfirmedAr : tournament.prizeConfirmedEn;
  const capacityText =
    tournament.maxParticipants > 0
      ? `${tournament.registeredCount} / ${tournament.maxParticipants}`
      : `${tournament.registeredCount} / ${dict.tournament.unlimited}`;

  const statusVariant =
    tournament.status === 'registration_open'
      ? 'open'
      : tournament.status === 'check_in'
      ? 'warning'
      : tournament.status === 'live'
      ? 'live'
      : 'neutral';

  const statusText =
    tournament.status === 'registration_open'
      ? dict.tournament.open
      : tournament.status === 'check_in'
      ? dict.tournament.checkIn
      : tournament.status === 'live'
      ? dict.tournament.live
      : dict.tournament.completed;

  const formattedDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(tournament.startsAtIso));

  return (
    <article className="group flex flex-col justify-between rounded-xl border border-[#27272C] bg-[#171719] p-5 transition-all hover:border-[#3A3A42] hover:bg-[#1C1C20]">
      <div>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusBadge variant={statusVariant} pulse={tournament.status === 'live'}>
              {statusText}
            </StatusBadge>
            <StatusBadge>
              {tournament.competitionType === 'solo' ? dict.tournament.solo : dict.tournament.team}
            </StatusBadge>
          </div>
          <span className="text-xs font-semibold text-[#7A7874] ltr-isolate">{tournament.formatLabel}</span>
        </div>

        <p className="mb-1 text-xs font-bold text-[#FF6A1A]">{game}</p>
        <h3 className="mb-4 text-lg font-extrabold text-[#F2EFE9] leading-snug group-hover:text-white">
          {title}
        </h3>

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-lg border border-[#27272C] bg-[#0B0B0C] p-3.5 text-xs">
          <div>
            <div className="text-[#7A7874]">{dict.tournament.slots}</div>
            <div className="mt-0.5 font-bold text-[#F2EFE9] ltr-isolate">{capacityText}</div>
          </div>
          <div>
            <div className="text-[#7A7874]">{dict.tournament.startsAt}</div>
            <div className="mt-0.5 font-bold text-[#F2EFE9]">{formattedDate}</div>
          </div>
          {prize && (
            <div className="col-span-2 border-t border-[#27272C] pt-2">
              <span className="text-[#7A7874]">{dict.tournament.prize}: </span>
              <span className="font-bold text-[#FFB938]">{prize}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href={`/${locale}/tournaments/${tournament.slug}`}
          className="flex-1 rounded-lg bg-[#FF6A1A] px-4 py-2.5 text-center text-sm font-extrabold text-[#0B0B0C] transition-colors hover:bg-[#FF7E38]"
        >
          {dict.tournament.registerNow}
        </Link>
        <Link
          href={`/${locale}/tournaments/${tournament.slug}`}
          className="rounded-lg border border-[#27272C] bg-[#202024] px-4 py-2.5 text-sm font-bold text-[#F2EFE9] transition-colors hover:border-[#3A3A42]"
        >
          {dict.tournament.viewDetails}
        </Link>
      </div>
    </article>
  );
}
