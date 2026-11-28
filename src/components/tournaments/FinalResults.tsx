import React from 'react';
import type { DemoTournament } from '@/lib/data/demo-tournaments';
import type { Locale } from '@/lib/i18n/dictionaries';

type Row = DemoTournament['sampleParticipants'][number];

const MEDAL = [
  { ring: 'border-[#FFB938]/60', bg: 'bg-[#FFB938]/10', text: 'text-[#FFB938]' },
  { ring: 'border-[#D6D9E0]/50', bg: 'bg-[#D6D9E0]/10', text: 'text-[#D6D9E0]' },
  { ring: 'border-[#CD7F32]/55', bg: 'bg-[#CD7F32]/10', text: 'text-[#E5A970]' }
];

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="text-center">
      <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f7276]">{label}</div>
      <div className="mt-0.5 text-base font-extrabold text-[#f4f4ed] ltr-isolate">{value}</div>
    </div>
  );
}

export function FinalResults({ rows, locale }: { rows: Row[]; locale: Locale }) {
  const ar = locale === 'ar';
  const L = {
    title: ar ? 'النتائج النهائية' : 'FINAL RESULTS',
    champion: ar ? 'البطل' : 'CHAMPION',
    pts: ar ? 'النقاط' : 'Points',
    kills: ar ? 'القتلات' : 'Kills',
    place: ar ? 'أفضل مركز' : 'Best place',
    rank: ar ? 'الترتيب' : 'Rank'
  };
  const winner = rows[0];
  if (!winner) return null;
  const podium = rows.slice(0, 3);
  const rest = rows.slice(3);
  return (
    <section aria-label={L.title} className="space-y-4">
      <div className="text-xs font-extrabold tracking-widest text-[#e5ed43]">{L.title}</div>

      <div className="clip-card row-in relative overflow-hidden border border-[#e5ed43]/40 bg-gradient-to-br from-[#e5ed43]/10 to-[#0d0e10] p-5 sm:p-7" style={{ ['--i' as string]: 0 } as React.CSSProperties}>
        <div className="text-[11px] font-extrabold tracking-[0.25em] text-[#FFB938]">🏆 {L.champion}</div>
        <div className="mt-2 break-words text-3xl font-black text-[#f4f4ed] sm:text-5xl ltr-isolate">{winner.ign}</div>
        <div className="mt-4 grid max-w-sm grid-cols-3 gap-3">
          <Stat label={L.pts} value={winner.points} />
          <Stat label={L.kills} value={winner.kills} />
          <Stat label={L.place} value={winner.bestPlacement ?? '-'} />
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {podium.map((r, i) => {
          const m = MEDAL[i] ?? MEDAL[2]!;
          return (
          <div key={r.code + i} style={{ ['--i' as string]: i + 1 } as React.CSSProperties} className={`row-in flex items-center gap-3 border ${m.ring} ${m.bg} p-4 sm:flex-col sm:items-start`}>
            <span className={`text-3xl font-black ltr-isolate ${m.text}`}>#{i + 1}</span>
            <div className="min-w-0 flex-1 sm:w-full">
              <div className="truncate font-extrabold text-[#f4f4ed] ltr-isolate">{r.ign}</div>
              <div className="mt-1 flex gap-3 text-xs font-semibold text-[#a4a6aa]">
                <span className="ltr-isolate">{r.points} {L.pts}</span>
                <span className="ltr-isolate">{r.kills} {L.kills}</span>
              </div>
            </div>
          </div>
          );
        })}
      </div>

      {rest.length > 0 && (
        <div className="divide-y divide-[#2b2d30] border border-[#2b2d30] bg-[#0d0e10]">
          <div className="grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem] items-center gap-2 bg-[#1b1d20] px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-[#6f7276]">
            <span>{L.rank}</span><span /><span className="text-center">{L.pts}</span><span className="text-center">{L.kills}</span><span className="text-center">{L.place}</span>
          </div>
          {rest.map((r, i) => (
            <div key={r.code + i} style={{ ['--i' as string]: i + 4 } as React.CSSProperties} className="row-in grid grid-cols-[2.5rem_1fr_3rem_3rem_3rem] items-center gap-2 px-3 py-3 text-sm">
              <span className="font-extrabold text-[#a4a6aa] ltr-isolate">#{i + 4}</span>
              <span className="truncate font-bold text-[#f4f4ed] ltr-isolate">{r.ign}</span>
              <span className="text-center font-extrabold text-[#e5ed43] ltr-isolate">{r.points}</span>
              <span className="text-center font-semibold text-[#a4a6aa] ltr-isolate">{r.kills}</span>
              <span className="text-center font-semibold text-[#a4a6aa] ltr-isolate">{r.bestPlacement ?? '-'}</span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
