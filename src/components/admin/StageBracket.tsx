export type BracketStage = { order: number; name: string; status: string; rooms: number; players: number; qualify: number; scored: number; total: number };

export function StageBracket({ stages, selected, base, ar, statusLabel }: { stages: BracketStage[]; selected?: number; base: string; ar: boolean; statusLabel: (s: string) => string }) {
  return (
    <div className="flex items-stretch gap-0 overflow-x-auto pb-2" data-testid="stage-bracket">
      {stages.map((s, i) => (
        <div key={s.order} className="flex items-center">
          <a
            href={`${base}?stage=${s.order}`}
            className={`clip-card block w-[200px] shrink-0 border p-3 transition-colors hover:border-[#e5ed43] ${selected === s.order ? 'border-[#e5ed43] bg-[#e5ed43]/10' : 'border-[#2b2d30] bg-[#101113]'}`}
          >
            <div className="flex items-center justify-between text-[10px] font-extrabold tracking-wide text-[#a4a6aa]">
              <span>{ar ? 'مرحلة' : 'STAGE'} {s.order}</span>
              <span className={s.status === 'completed' ? 'text-[#e5ed43]' : s.status === 'active' ? 'text-[#34d399]' : ''}>{statusLabel(s.status)}</span>
            </div>
            <div className="mt-1 truncate text-base font-extrabold text-[#f4f4ed]">{s.name}</div>
            <div className="mt-2 flex gap-3 text-[11px] text-[#a4a6aa]">
              <span>{ar ? 'غرف' : 'Rooms'} <b className="ltr-isolate text-[#f4f4ed]">{s.rooms}</b></span>
              <span>{ar ? 'لاعبين' : 'Players'} <b className="ltr-isolate text-[#f4f4ed]">{s.players}</b></span>
            </div>
            <div className="mt-2 h-1.5 w-full bg-[#23252a]"><div className="h-full bg-[#e5ed43]" style={{ width: `${s.total ? (100 * s.scored) / s.total : 0}%` }} /></div>
          </a>
          {i < stages.length - 1 && (
            <div className="flex w-16 shrink-0 flex-col items-center text-[10px] font-extrabold text-[#e5ed43]">
              <span className="ltr-isolate">TOP {s.qualify}</span>
              <span aria-hidden className="h-0.5 w-full bg-gradient-to-r from-[#e5ed43]/20 to-[#e5ed43]" />
              <span aria-hidden className="ltr-isolate text-lg leading-none">{ar ? '◀' : '▶'}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
