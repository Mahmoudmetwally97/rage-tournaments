import type { ReactNode } from 'react';

export const inputCls =
  'w-full border border-[#2b2d30] bg-[#0d0e10] px-3 py-2 text-sm text-[#f4f4ed] placeholder:text-[#6f7276] focus:border-[#e5ed43] focus:outline-none';

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="clip-card card-surface border-t-2 border-t-[#e5ed43]/70 p-4 sm:p-5">
      {(title || right) && (
        <div className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-extrabold text-[#f4f4ed]">{title}</h2>}
          {right}
        </div>
      )}
      {children}
    </section>
  );
}

export function Btn({
  children,
  tone = 'default',
  className = ''
}: {
  children: ReactNode;
  tone?: 'default' | 'primary' | 'danger';
  className?: string;
}) {
  const tones = {
    default: 'bg-[#23252a] text-[#f4f4ed] hover:bg-[#2d3036]',
    primary: 'bg-[#e5ed43] text-[#0d0e10] hover:bg-[#eef46b]',
    danger: 'bg-[#ff5d5d]/15 text-[#ff8a8a] hover:bg-[#ff5d5d]/25'
  } as const;
  return (
    <button type="submit" className={`clip-btn btn-shine px-4 py-2 text-xs font-extrabold cursor-pointer transition-colors ${tones[tone]} ${className}`}>
      {children}
    </button>
  );
}

export function Flash({ ok, err }: { ok?: string; err?: string }) {
  if (err)
    return (
      <p role="alert" className="border border-[#ff5d5d]/50 bg-[#ff5d5d]/10 px-4 py-2 text-sm text-[#ff8a8a]">
        {err}
      </p>
    );
  if (ok)
    return (
      <p role="status" className="border border-[#e5ed43]/40 bg-[#e5ed43]/10 px-4 py-2 text-sm text-[#e5ed43]">
        ✓
      </p>
    );
  return null;
}

export function Hidden({ values }: { values: Record<string, string> }) {
  return (
    <>
      {Object.entries(values).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

export function Pill({ children, on }: { children: ReactNode; on?: boolean }) {
  return (
    <span
      className={`clip-chip inline-block border px-3 py-0.5 text-[11px] font-extrabold ${
        on ? 'border-[#e5ed43]/50 bg-[#e5ed43]/10 text-[#e5ed43]' : 'border-[#2b2d30] text-[#a4a6aa]'
      }`}
    >
      {children}
    </span>
  );
}

export function PageHero({
  eyebrow,
  title,
  children,
  compact
}: {
  eyebrow: string;
  title: string;
  children?: ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="clip-card hero-slash relative overflow-hidden bg-[#0d0e10]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/brand/rage-characters.png"
        alt=""
        className={`absolute inset-0 h-full w-full object-cover object-[62%_18%] ${compact ? 'opacity-40' : 'opacity-90'}`}
      />
      <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-[#0d0e10] via-[#0d0e10]/85 to-[#0d0e10]/10" />
      <div className={`relative ${compact ? 'p-5 sm:p-7' : 'p-6 sm:p-10'}`}>
        <p className="eyebrow mb-3">{eyebrow}</p>
        <h1 className={`font-extrabold leading-[0.95] tracking-tight text-[#f4f4ed] ${compact ? 'text-3xl sm:text-5xl' : 'text-5xl sm:text-7xl'}`}>
          {title}
        </h1>
        {children && <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-[#a4a6aa]">{children}</div>}
      </div>
    </section>
  );
}
