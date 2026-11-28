import Link from 'next/link';
import { formatStartDate } from '@/lib/format';
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

  const formattedDate = formatStartDate(tournament.startsAtIso, locale);

  return (
    <article className="clip-card card-surface card-hover group flex flex-col justify-between rounded-none border-t-2 border-t-[#e5ed43]/70 p-5">
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
          <span className="text-xs font-semibold text-[#6f7276] ltr-isolate">{tournament.formatLabel}</span>
        </div>

        <p className="mb-1 text-xs font-bold text-[#e5ed43]">{game}</p>
        <h3 className="mb-4 text-lg font-extrabold text-[#f4f4ed] leading-snug group-hover:text-white">
          {title}
        </h3>

        <div className="mb-5 grid grid-cols-2 gap-3 rounded-none border border-[#2b2d30] bg-[#0d0e10] p-3.5 text-xs">
          <div>
            <div className="text-[#6f7276]">{dict.tournament.slots}</div>
            <div className="mt-0.5 font-bold text-[#f4f4ed] ltr-isolate">{capacityText}</div>
          </div>
          <div>
            <div className="text-[#6f7276]">{dict.tournament.startsAt}</div>
            <div className="mt-0.5 font-bold text-[#f4f4ed]">{formattedDate}</div>
          </div>
          {prize && (
            <div className="col-span-2 border-t border-[#2b2d30] pt-2">
              <span className="text-[#6f7276]">{dict.tournament.prize}: </span>
              <span className="font-bold text-[#FFB938]">{prize}</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href={`/${locale}/tournaments/${tournament.slug}`}
          className="flex-1 rounded-none bg-[#e5ed43] px-4 py-2.5 text-center text-sm font-extrabold text-[#0d0e10] transition-colors hover:bg-[#eef46b]"
        >
          {dict.tournament.registerNow}
        </Link>
        <Link
          href={`/${locale}/tournaments/${tournament.slug}`}
          className="rounded-none border border-[#2b2d30] bg-[#1b1d20] px-4 py-2.5 text-sm font-bold text-[#f4f4ed] transition-colors hover:border-[#3a3d40]"
        >
          {dict.tournament.viewDetails}
        </Link>
      </div>
    </article>
  );
}
