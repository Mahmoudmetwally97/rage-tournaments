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
    <div className="flex flex-col justify-between gap-2 rounded-none border border-[#2b2d30] bg-[#151619] p-4 transition-colors hover:border-[#3a3d40]">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-[#6f7276]">{stageLabel}</span>
        <StatusBadge variant={variant} pulse={match.status === 'live'}>
          {statusText}
        </StatusBadge>
      </div>
      <div className="text-sm font-bold text-[#f4f4ed]">{title}</div>
      <div className="flex items-center justify-between text-xs text-[#a4a6aa]">
        <span>{timeLabel}</span>
        {match.scoreLabel && (
          <span className="font-bold text-[#FFB938] ltr-isolate">{match.scoreLabel}</span>
        )}
      </div>
    </div>
  );
}
