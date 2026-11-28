'use client';
import { useScroll, useTransform, useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

/** Slides its content down slowly as the page scrolls, so the hero art lags behind the text. Off for reduced motion. */
export function ParallaxLayer({ children, className, distance = 48 }: { children: ReactNode; className?: string; distance?: number }) {
  const reduce = useReducedMotion();
  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 600], [0, distance]);
  return (
    <m.div className={className} style={reduce ? undefined : { y, willChange: 'transform' }}>
      {children}
    </m.div>
  );
}
