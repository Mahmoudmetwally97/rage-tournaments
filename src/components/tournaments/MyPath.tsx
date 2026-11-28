import Link from 'next/link';
import { Reveal } from '@/components/home/Reveal';
import { Countdown } from '@/components/home/Countdown';

export interface PathStep { key: string; title: string; desc: string; state: 'done' | 'now' | 'todo' }

/** Personal route through a tournament. The line fills up to the player's current step. */
export function MyPath({ steps, startsAt, ar, action }: { steps: PathStep[]; startsAt?: string | null; ar: boolean; action?: { href: string; label: string } | null }) {
  const nowIdx = Math.max(0, steps.findIndex((s) => s.state === 'now'));
  const fill = steps.length > 1 ? Math.min(100, ((nowIdx === -1 ? steps.length - 1 : nowIdx) / (steps.length - 1)) * 100) : 0;
  const showCd = steps[nowIdx]?.state === 'now' && !!startsAt && new Date(startsAt).getTime() > Date.now() && ['room', 'checkin'].includes(steps[nowIdx]?.key ?? '');
  return (
    <Reveal as="section" className="tl border border-[#2b2d30] bg-[#151619] p-5 sm:p-6">
      <p className="eyebrow mb-4">{ar ? 'مساري' : 'MY PATH'}</p>
      <div className="relative ps-14">
        <span className="absolute inset-y-2 start-[19px] w-0.5 bg-[#2b2d30]" aria-hidden />
        <span className="tl-line" style={{ bottom: 'auto', height: `${fill}%`, boxShadow: '0 0 12px #e5ed43' }} aria-hidden />
        <div className="space-y-7">
          {steps.map((s, i) => (
            <div key={s.key} className="tl-step relative">
              <span
                className={`absolute -start-14 top-0 flex h-10 w-10 items-center justify-center text-sm font-black ltr-isolate ${s.state === 'todo' ? 'bg-[#1b1d20] text-[#6f7276]' : 'bg-[#e5ed43] text-[#121408]'}`}
                style={{ clipPath: 'polygon(20% 0, 100% 0, 80% 100%, 0 100%)', boxShadow: s.state === 'now' ? '0 0 0 6px rgba(229,237,67,.2)' : undefined }}
              >{s.state === 'done' ? '✓' : i + 1}</span>
              <h3 className={`text-lg font-extrabold sm:text-xl ${s.state === 'todo' ? 'text-[#6f7276]' : 'text-[#f4f4ed]'}`}>{s.title}</h3>
              <p className="mt-0.5 text-sm text-[#a4a6aa]">{s.desc}</p>
              {s.state === 'now' && (showCd || action) && (
                <div className="mt-3 space-y-3 border border-[#e5ed43]/60 bg-[#12140a] p-4">
                  {showCd && <Countdown iso={startsAt as string} live={false} ar={ar} />}
                  {action && <Link href={action.href} className="clip-btn inline-block bg-[#e5ed43] px-6 py-3 text-xs font-extrabold uppercase tracking-[0.12em] text-[#121408]">{action.label}</Link>}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Reveal>
  );
}
