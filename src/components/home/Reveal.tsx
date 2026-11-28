'use client';
import { useEffect, useRef, type ReactNode, type CSSProperties } from 'react';

/** Adds data-in once the block scrolls into view. All visuals live in CSS (.rv), transform and opacity only. */
export function Reveal({ children, className = '', delay = 0, as: Tag = 'div' }: { children: ReactNode; className?: string; delay?: number; as?: 'div' | 'section' | 'li' }) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') { el.setAttribute('data-in', ''); return; }
    const io = new IntersectionObserver(([e]) => {
      if (e?.isIntersecting) { el.setAttribute('data-in', ''); io.disconnect(); }
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const style = { ['--d' as string]: `${delay}ms` } as CSSProperties;
  const T = Tag as 'div';
  return <T ref={ref as React.RefObject<HTMLDivElement>} style={style} className={`rv ${className}`}>{children}</T>;
}
