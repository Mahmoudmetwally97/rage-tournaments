'use client';
import { useEffect, useRef, useState } from 'react';

/** Counts a number up once when it scrolls into view. Final value is rendered on the server and for reduced motion. */
export function CountUp({ value, className }: { value: number; className?: string }) {
  const [n, setN] = useState(value);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !ref.current) return;
    setN(0);
    const io = new IntersectionObserver(([e]) => {
      if (!e?.isIntersecting) return;
      io.disconnect();
      const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / 900);
        setN(Math.round(value * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [value]);
  return <span ref={ref} className={className}>{n}</span>;
}
