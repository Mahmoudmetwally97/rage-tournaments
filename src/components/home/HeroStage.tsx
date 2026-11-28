'use client';
import { useEffect, useRef, type ReactNode } from 'react';

/** Pointer-driven depth for the hero (desktop with a fine pointer only). Moves layers by transform only. */
export function HeroStage({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(pointer: fine)').matches || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let raf = 0;
    const move = (e: PointerEvent) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--px', String(((e.clientX - r.left) / r.width - 0.5).toFixed(3)));
        el.style.setProperty('--py', String(((e.clientY - r.top) / r.height - 0.5).toFixed(3)));
      });
    };
    el.addEventListener('pointermove', move);
    return () => { el.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);
  return <div ref={ref} className={className}>{children}</div>;
}
