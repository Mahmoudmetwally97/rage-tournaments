import './globals.css';
import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { siteUrl, DEFAULT_OG_IMAGE } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const h = await headers();
  const host = h.get('x-forwarded-host') || h.get('host');
  const base = host ? `${h.get('x-forwarded-proto') || 'https'}://${host}` : siteUrl();
  return { metadataBase: new URL(base), ...baseMeta };
}

const baseMeta: Metadata = {
  title: { default: 'RAGE TOURNAMENTS', template: '%s | RAGE TOURNAMENTS' },
  description: 'Independent Esports Tournament Management Platform for RAGE',
  openGraph: {
    type: 'website',
    siteName: 'RAGE TOURNAMENTS',
    title: 'RAGE TOURNAMENTS',
    description: 'Independent Esports Tournament Management Platform for RAGE',
    images: [{ url: DEFAULT_OG_IMAGE, width: 1200, height: 630, alt: 'RAGE TOURNAMENTS' }]
  },
  twitter: { card: 'summary_large_image', title: 'RAGE TOURNAMENTS', description: 'Independent Esports Tournament Management Platform for RAGE', images: [DEFAULT_OG_IMAGE] }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
