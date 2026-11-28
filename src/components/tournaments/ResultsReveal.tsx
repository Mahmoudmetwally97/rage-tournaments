'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Broadcast-style reveal for Final Results. Server HTML is the full final state.
 * On the first visit (per browser, per results version) items come in from last place to first,
 * numbers count up, and the champion gets a flash. Skippable. Off for reduced motion.
 */
export function ResultsReveal({ children, storageKey, ar }: { children: ReactNode; storageKey: string; ar: boolean }) {
  const root = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const timers = useRef<number[]>([]);
  const finish = useRef<() => void>(() => {});

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const done = () => { el.classList.remove('fr-init', 'fr-play'); el.classList.add('fr-done'); el.querySelectorAll<HTMLElement>('.fr-num').forEach((n) => { if (n.dataset.val) n.textContent = n.dataset.val; }); };
    let seen = false;
    try { seen = localStorage.getItem(storageKey) === '1'; } catch { /* ignore */ }
    if (seen || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { done(); return; }

    const items = Array.from(el.querySelectorAll<HTMLElement>('.fr-item'));
    const finishNow = () => {
      timers.current.forEach((t) => clearTimeout(t)); timers.current = [];
      items.forEach((i) => i.classList.add('fr-on'));
      done(); setPlaying(false);
      try { localStorage.setItem(storageKey, '1'); } catch { /* ignore */ }
    };
    finish.current = finishNow;

    const count = (n: HTMLElement, ms: number) => {
      const target = Number(n.dataset.val ?? '0'); const t0 = performance.now();
      const step = (t: number) => {
        const k = Math.min(1, (t - t0) / ms);
        n.textContent = String(Math.round(target * (1 - Math.pow(1 - k, 3))));
        if (k < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };

    const run = () => {
      el.classList.add('fr-play'); setPlaying(true);
      el.querySelectorAll<HTMLElement>('.fr-num').forEach((n) => { n.textContent = '0'; });
      const ords = Array.from(new Set(items.map((i) => Number(i.dataset.ord)))).sort((a, b) => b - a);
      let t = 500;
      ords.forEach((o) => {
        const group = items.filter((i) => Number(i.dataset.ord) === o);
        timers.current.push(window.setTimeout(() => {
          group.forEach((g) => { g.classList.add('fr-on'); g.querySelectorAll<HTMLElement>('.fr-num').forEach((n) => count(n, 650)); });
          if (o === 0) el.classList.add('fr-flash');
        }, t));
        t += o > 3 ? 260 : o > 1 ? 650 : 800;
      });
      timers.current.push(window.setTimeout(finishNow, t + 900));
    };

    const io = new IntersectionObserver(([e]) => { if (e?.isIntersecting) { io.disconnect(); run(); } }, { threshold: 0.25 });
    io.observe(el);
    return () => { io.disconnect(); timers.current.forEach((x) => clearTimeout(x)); };
  }, [storageKey]);

  return (
    <div ref={root} className="fr-init relative">
      {playing && (
        <button type="button" onClick={() => finish.current()} className="absolute end-0 -top-1 z-10 border border-[#2b2d30] bg-[#0d0e10]/80 px-3 py-1 text-[11px] font-bold tracking-[0.2em] text-[#a4a6aa] hover:text-[#f4f4ed]">
          {ar ? 'تخطي ◂◂' : 'SKIP ▸▸'}
        </button>
      )}
      <div className="fr-flashlayer" aria-hidden />
      {children}
    </div>
  );
}
