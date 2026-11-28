'use client';
import { AnimatePresence } from 'motion/react';
import * as m from 'motion/react-m';
import type { ReactNode } from 'react';

/** Grid whose items fade/scale in and out and glide to new spots when a filter changes. */
export function AnimatedGrid({ items, className }: { items: { key: string; node: ReactNode }[]; className?: string }) {
  return (
    <m.div layout className={className}>
      <AnimatePresence mode="popLayout" initial={false}>
        {items.map((it) => (
          <m.div
            key={it.key}
            layout="position"
            initial={{ opacity: 0, scale: 0.94 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.94 }}
            transition={{ duration: 0.28, ease: [0.2, 0.7, 0.2, 1] }}
          >
            {it.node}
          </m.div>
        ))}
      </AnimatePresence>
    </m.div>
  );
}
