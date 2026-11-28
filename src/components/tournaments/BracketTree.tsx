import { formatLabel, qualifiesLabel } from '@/lib/format';
type S = { order: number; nameAr: string; nameEn: string; format: string; qualifies: string };

export function BracketTree({ stages, locale }: { stages: S[]; locale: 'ar' | 'en' | string }) {
  const ar = locale === 'ar';
  if (!stages.length) return null;
  return (
    <div data-testid="bracket-tree" className="overflow-x-auto pb-2">
      <div className="flex min-w-max items-center gap-0">
        {stages.map((st, i) => {
          const last = i === stages.length - 1;
          return (
            <div key={st.order} style={{ ["--i" as string]: i } as React.CSSProperties} className="flex items-center">
              <div className={`bracket-node clip-card relative w-[210px] border p-4 ${last ? 'border-[#e5ed43] bg-[#e5ed43]/10' : 'border-[#2b2d30] bg-[#101113]'}`}>
                <div className="text-[10px] font-extrabold tracking-widest text-[#e5ed43]">{ar ? 'مرحلة' : 'STAGE'} <span className="ltr-isolate">{st.order}</span></div>
                <div className="mt-1 text-base font-extrabold leading-snug text-[#f4f4ed]">{ar ? st.nameAr : st.nameEn}</div>
                <div className="mt-2 text-[11px] font-semibold text-[#a4a6aa]">{formatLabel(st.format, ar)}</div>
                {last && <div className="mt-2 text-xs font-extrabold text-[#e5ed43]">{ar ? 'النهائي' : 'FINAL'} 🏆</div>}
              </div>
              {!last && (
                <svg width="96" height="64" viewBox="0 0 96 64" className={`bracket-line shrink-0 ${ar ? '-scale-x-100' : ''}`} aria-hidden>
                  <path d="M0 32 H28 M28 10 V54 M28 10 H52 M28 54 H52 M52 10 V32 M52 54 V32 M52 32 H88" stroke="#e5ed43" strokeWidth="2" fill="none" opacity="0.7" />
                  <path d="M82 26 L92 32 L82 38 Z" fill="#e5ed43" />
                </svg>
              )}
              {!last && (
                <span className="sr-only">{st.qualifies}</span>
              )}
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-2 text-[11px] font-bold text-[#a4a6aa]">
        {stages.slice(0, -1).map((st) => (
          <span key={st.order} className="clip-card border border-[#2b2d30] bg-[#0d0e10] px-2 py-1 ltr-isolate">S{st.order} → S{st.order + 1}: {qualifiesLabel(st.qualifies, ar)}</span>
        ))}
      </div>
    </div>
  );
}
