export function TeamLogo({ src, tag, size = 28 }: { src?: string | null; tag?: string; size?: number }) {
  const st = { width: size, height: size };
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" loading="lazy" style={st} className="shrink-0 rounded-sm bg-[#16171a] object-cover" />
  ) : (
    <span style={{ ...st, fontSize: Math.max(9, size / 3) }} className="inline-flex shrink-0 items-center justify-center rounded-sm bg-[#16171a] font-extrabold text-[#6f7276]" aria-hidden>
      {(tag ?? '?').slice(0, 2).toUpperCase()}
    </span>
  );
}
