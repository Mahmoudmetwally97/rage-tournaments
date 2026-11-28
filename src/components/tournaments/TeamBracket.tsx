import type { BMatch } from '@/lib/bracket';

function roundName(i: number, total: number, ar: boolean): string {
  const left = total - i;
  if (left === 1) return ar ? 'النهائي' : 'Final';
  if (left === 2) return ar ? 'نصف النهائي' : 'Semi-finals';
  if (left === 3) return ar ? 'ربع النهائي' : 'Quarter-finals';
  return ar ? `الدور ${i + 1}` : `Round ${i + 1}`;
}

export function TeamBracket({ rounds, ar, renderAction }: { rounds: BMatch[][]; ar: boolean; renderAction?: (m: BMatch) => React.ReactNode }) {
  if (!rounds.length) return <p className="text-sm text-[#a4a6aa]">{ar ? 'البراكت لسه ما اتولدش.' : 'The bracket has not been generated yet.'}</p>;
  const champ = rounds[rounds.length - 1]?.[0];
  const champName = champ?.winnerId ? (champ.winnerId === champ.a?.id ? champ.a?.name : champ.b?.name) : null;
  return (
    <div className="space-y-3">
      {champName && (
        <p className="text-sm font-extrabold text-[#e5ed43]">🏆 {ar ? 'البطل' : 'Champion'}: {champName}</p>
      )}
      <div className="overflow-x-auto pb-2" data-testid="team-bracket">
        <div className="flex min-w-max gap-6">
          {rounds.map((ms, i) => (
            <div key={i} className="flex w-[230px] shrink-0 flex-col justify-around gap-3">
              <p className="text-[11px] font-extrabold tracking-widest text-[#e5ed43]">{roundName(i, rounds.length, ar)}</p>
              {ms.map((m) => (
                <div key={m.id} className="clip-card border border-[#2b2d30] bg-[#101113] text-sm">
                  {([['a', m.a, m.scoreA], ['b', m.b, m.scoreB]] as const).map(([k, p, sc]) => (
                    <div key={k} className={`flex items-center justify-between gap-2 px-3 py-2 ${k === 'a' ? 'border-b border-[#2b2d30]' : ''} ${p && m.winnerId === p.id ? 'bg-[#e5ed43]/10 font-extrabold text-[#e5ed43]' : 'text-[#f4f4ed]'}`}>
                      <span className="truncate">{p ? p.name : <span className="text-[#6f7276]">{ar ? 'بانتظار الفريق' : 'TBD'}</span>}</span>
                      <span className="ltr-isolate text-xs">{sc ?? ''}</span>
                    </div>
                  ))}
                  {renderAction ? renderAction(m) : null}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
