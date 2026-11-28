'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';

/** Thin lime bar that sweeps across the top when the route changes. Hidden for reduced motion via CSS. */
export function NavProgress() {
  const path = usePathname();
  const [key, setKey] = useState(0);
  useEffect(() => {
    setKey((k) => k + 1);
  }, [path]);
  if (key === 0) return null;
  return <div key={key} aria-hidden className="nav-progress" />;
}
