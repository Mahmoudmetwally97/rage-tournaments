import type { DemoMatchItem } from '@/lib/data/demo-tournaments';
import type { Locale } from '@/lib/i18n/dictionaries';
import { StatusBadge } from '@/components/ui/StatusBadge';

interface MatchCardProps {
  match: DemoMatchItem;
  locale: Locale;
}

export function MatchCard({ match, locale }: MatchCardProps) {
  const title = locale === 'ar' ? match.titleAr : match.titleEn;
  const stageLabel = locale === 'ar' ? match.stageLabelAr : match.stageLabelEn;
  const timeLabel = locale === 'ar' ? match.timeLabelAr : match.timeLabelEn;
  const variant = match.status === 'live' ? 'live' : match.status === 'completed' ? 'open' : 'neutral';
  const statusText =
    match.status === 'live'
      ? locale === 'ar'
        ? 'مباشر'
        : 'Live'
      : match.status === 'completed'
      ? locale === 'ar'
        ? 'مكتملة'
        : 'Completed'
      : locale === 'ar'
      ? 'مجدولة'
      : 'Scheduled';

  return (
    <div className="flex flex-col justify-between gap-2 rounded-xl border border-[#27272C] bg-[#171719] p-4 transition-colors hover:border-[#3A3A42]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#7A7874]">{stageLabel}</span>
        <StatusBadge variant={variant} pulse={match.status === 'live'}>
          {statusText}
        </StatusBadge>
      </div>
      <div className="text-sm font-bold text-[#F2EFE9]">{title}</div>
      <div className="flex items-center justify-between text-xs text-[#B5B2AC]">
        <span>{timeLabel}</span>
        {match.scoreLabel && (
          <span className="font-bold text-[#FFB938] ltr-isolate">{match.scoreLabel}</span>
        )}
      </div>
    </div>
  );
}
