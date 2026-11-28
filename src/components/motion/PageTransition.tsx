'use client';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

/** Soft fade-and-rise when moving between pages. Transform/opacity only. */
export function PageTransition({ children }: { children: ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: [0.2, 0.7, 0.2, 1] }}>
      {children}
    </m.div>
  );
}
