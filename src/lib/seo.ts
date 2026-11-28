import type { Metadata } from 'next';

export function siteUrl(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && !env.includes('localhost')) return env.replace(/\/$/, '');
  const host =
    process.env.VERCEL_ENV === 'production'
      ? process.env.VERCEL_PROJECT_PRODUCTION_URL
      : process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL;
  return host ? `https://${host}` : 'http://localhost:3000';
}

export const DEFAULT_OG_IMAGE = '/brand/og-default.jpg';

export function buildMeta(opts: {
  title: string;
  description: string;
  path: string;
  image?: string | null;
  locale: string;
}): Metadata {
  const image = opts.image || DEFAULT_OG_IMAGE;
  const images = [{ url: image, width: 1200, height: 630, alt: opts.title }];
  return {
    title: opts.title,
    description: opts.description,
    alternates: { canonical: opts.path },
    openGraph: {
      type: 'website',
      siteName: 'RAGE TOURNAMENTS',
      title: opts.title,
      description: opts.description,
      url: opts.path,
      locale: opts.locale === 'ar' ? 'ar_EG' : 'en_US',
      images
    },
    twitter: { card: 'summary_large_image', title: opts.title, description: opts.description, images: [image] }
  };
}
