import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { StatusBadge } from '@/components/ui/StatusBadge';

export interface LeaderboardRow {
  code: string;
  ign: string;
  status: string;
  points: number;
  kills: number;
}

interface LeaderboardTableProps {
  rows: readonly LeaderboardRow[];
  dict: Dictionary;
  locale: Locale;
}

export function LeaderboardTable({ rows, dict, locale }: LeaderboardTableProps) {
  const rankBadgeClass = (idx: number) => {
    if (idx === 0) return 'border-[#FFB938]/50 bg-[#FFB938]/15 text-[#FFB938]';
    if (idx === 1) return 'border-[#D6D9E0]/40 bg-[#D6D9E0]/10 text-[#f4f4ed]';
    if (idx === 2) return 'border-[#CD7F32]/45 bg-[#CD7F32]/15 text-[#E5A970]';
    return 'border-[#2b2d30] bg-[#1b1d20] text-[#a4a6aa]';
  };

  const formatStatus = (status: string) => {
    if (status === 'checked_in') return locale === 'ar' ? 'تم التحضير' : 'Checked In';
    if (status === 'confirmed') return locale === 'ar' ? 'مؤكد' : 'Confirmed';
    return status;
  };

  return (
    <div>
      {/* Mobile Card List (390px friendly, zero horizontal clipping) */}
      <div className="grid gap-3 md:hidden">
        {rows.map((row, idx) => (
          <div
            key={row.code}
            className="flex items-center justify-between gap-3 rounded-none border border-[#2b2d30] bg-[#151619] p-4"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-none border text-xs font-extrabold ltr-isolate ${rankBadgeClass(idx)}`}
              >
                #{idx + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate font-extrabold text-[#f4f4ed] ltr-isolate">{row.ign}</div>
                <div className="mt-0.5 flex items-center gap-2 text-xs">
                  <span className="font-mono font-bold text-[#FFB938] ltr-isolate">{row.code}</span>
                  <StatusBadge variant={row.status === 'checked_in' ? 'open' : 'neutral'}>
                    {formatStatus(row.status)}
                  </StatusBadge>
                </div>
              </div>
            </div>
            <div className="shrink-0 text-end">
              <div className="text-sm font-extrabold text-[#e5ed43] ltr-isolate">
                {row.points} {locale === 'ar' ? 'نقطة' : 'pts'}
              </div>
              <div className="text-xs text-[#a4a6aa] ltr-isolate">
                {row.kills} {locale === 'ar' ? 'قتلة' : 'kills'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop / Tablet Table */}
      <div className="hidden md:block overflow-hidden rounded-none border border-[#2b2d30] bg-[#151619]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#2b2d30] bg-[#1b1d20] text-xs font-bold text-[#a4a6aa]">
                <th className="py-3 px-4 text-start">{dict.leaderboard.rank}</th>
                <th className="py-3 px-4 text-start">{dict.leaderboard.code}</th>
                <th className="py-3 px-4 text-start">{dict.leaderboard.player}</th>
                <th className="py-3 px-4 text-start">{dict.leaderboard.points}</th>
                <th className="py-3 px-4 text-start">{dict.leaderboard.kills}</th>
                <th className="py-3 px-4 text-start">{dict.leaderboard.status}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#2b2d30]">
              {rows.map((row, idx) => (
                <tr key={row.code} className="transition-colors hover:bg-[#1b1d20]/60">
                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-flex h-7 w-7 items-center justify-center rounded-none border text-xs font-extrabold ltr-isolate ${rankBadgeClass(idx)}`}
                    >
                      #{idx + 1}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-mono text-xs font-bold text-[#FFB938] ltr-isolate">{row.code}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-[#f4f4ed] ltr-isolate">{row.ign}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-extrabold text-[#e5ed43] ltr-isolate">{row.points}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="font-semibold text-[#a4a6aa] ltr-isolate">{row.kills}</span>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge variant={row.status === 'checked_in' ? 'open' : 'neutral'}>
                      {formatStatus(row.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
