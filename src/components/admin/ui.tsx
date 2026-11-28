import type { ReactNode } from 'react';

export const inputCls =
  'w-full border border-[#2b2d30] bg-[#0d0e10] px-3 py-2 text-sm text-[#f4f4ed] placeholder:text-[#6f7276] focus:border-[#e5ed43] focus:outline-none';

export function Card({ title, children, right }: { title?: string; children: ReactNode; right?: ReactNode }) {
  return (
    <section className="border border-[#2b2d30] bg-[#151619] p-5">
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
    default: 'border-[#2b2d30] text-[#f4f4ed] hover:border-[#3a3d40]',
    primary: 'border-[#e5ed43] bg-[#e5ed43] text-[#0d0e10]',
    danger: 'border-[#ff5d5d]/50 text-[#ff8a8a] hover:bg-[#ff5d5d]/10'
  } as const;
  return (
    <button type="submit" className={`border px-3 py-1.5 text-xs font-bold cursor-pointer ${tones[tone]} ${className}`}>
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
      className={`inline-block border px-2 py-0.5 text-[11px] font-bold ${
        on ? 'border-[#e5ed43]/50 bg-[#e5ed43]/10 text-[#e5ed43]' : 'border-[#2b2d30] text-[#a4a6aa]'
      }`}
    >
      {children}
    </span>
  );
}
