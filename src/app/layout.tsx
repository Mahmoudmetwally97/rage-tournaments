import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'RAGE TOURNAMENTS',
  description: 'Independent Esports Tournament Management Platform for RAGE'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
