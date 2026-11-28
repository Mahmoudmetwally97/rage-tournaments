'use client';
import { useEffect, useState } from 'react';

export function Countdown({ iso, live, ar }: { iso: string; live: boolean; ar: boolean }) {
  const target = iso ? new Date(iso).getTime() : 0;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  if (live) return <div className="flex items-center gap-2 text-2xl font-black text-[#e5ed43] sm:text-3xl"><span className="live-dot" />{ar ? 'مباشر الآن' : 'LIVE NOW'}</div>;
  if (!target) return <div className="text-lg font-extrabold text-[#a4a6aa]">{ar ? 'الموعد قيد التحديد' : 'Date TBD'}</div>;
  if (now === null) return <div className="h-[52px]" />;
  const d = Math.max(0, target - now);
  if (d === 0) return <div className="text-2xl font-black text-[#e5ed43]">{ar ? 'بدأت' : 'STARTED'}</div>;
  const parts: [number, string, string][] = [[Math.floor(d / 86400000), 'D', 'يوم'], [Math.floor(d / 3600000) % 24, 'H', 'س'], [Math.floor(d / 60000) % 60, 'M', 'د'], [Math.floor(d / 1000) % 60, 'S', 'ث']];
  return (
    <div className="flex gap-2 ltr-isolate" dir="ltr">
      {parts.map(([v, l, la]) => (
        <div key={l} className="min-w-[3.2rem] border border-[#2b2d30] bg-[#0d0e10]/80 px-2 py-1.5 text-center">
          <div className="display-type text-2xl font-black leading-none text-[#f4f4ed] tabular-nums sm:text-3xl">{String(v).padStart(2, '0')}</div>
          <div className="mt-1 text-[9px] font-bold tracking-widest text-[#6f7276]">{ar ? la : l}</div>
        </div>
      ))}
    </div>
  );
}
