import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireOrganizer, tr } from '@/lib/admin';
import { label } from '@/lib/labels';
import { PageHero, Pill } from '@/components/admin/ui';

export default async function AdminTournamentLayout({
  children,
  params
}: {
  children: ReactNode;
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale: l, slug } = await params;
  const { locale, tournament } = await requireOrganizer(l, slug);
  const base = `/${locale}/admin/${slug}`;
  const tabs: [string, string][] = [
    [base, tr(locale, 'نظرة عامة', 'Overview')],
    [`${base}/participants`, tr(locale, 'اللاعبين', 'Participants')],
    [`${base}/matches`, tr(locale, 'الماتشات والنتائج', 'Matches & scores')],
    [`${base}/prizes`, tr(locale, 'الجوائز والمطالبات', 'Prizes & claims')],
    [`${base}/rules`, tr(locale, 'القواعد والنقاط', 'Rules & scoring')],
    [`${base}/support`, tr(locale, 'المشاكل', 'Issues')]
  ];
  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={`/${locale}/admin`} className="inline-block text-xs font-bold text-[#a4a6aa] hover:text-[#e5ed43]">
        ← {tr(locale, 'لوحة الإدارة', 'Admin')}
      </Link>
      <PageHero compact coverUrl={tournament!.cover_image_url} eyebrow={tr(locale, 'لوحة الإدارة', 'ADMIN CONSOLE')} title={locale === 'ar' ? tournament!.title_ar : tournament!.title_en}>
        <Pill on>{label(locale, tournament!.status)}</Pill>
        {(tournament as { is_test?: boolean }).is_test && <span className="ms-2 inline-block border border-[#FF8C4D]/50 bg-[#FF8C4D]/10 px-3 py-0.5 text-[11px] font-extrabold text-[#FF8C4D]">{tr(locale, 'مخفية عن الجمهور (تجريبية)', 'HIDDEN FROM PUBLIC (test)')}</span>}
      </PageHero>
      <nav className="-mx-4 flex gap-2 overflow-x-auto border-b border-[#2b2d30] px-4 pb-3 [mask-image:linear-gradient(to_right,black_88%,transparent)] rtl:[mask-image:linear-gradient(to_left,black_88%,transparent)] sm:mx-0 sm:px-0 sm:[mask-image:none]">
        {tabs.map(([href, label]) => (
          <Link
            key={href}
            href={href}
            className="shrink-0 whitespace-nowrap border border-[#2b2d30] bg-[#151619] px-4 py-2 text-sm font-bold text-[#a4a6aa] hover:bg-[#1b1d20] hover:text-[#f4f4ed]"
          >
            {label}
          </Link>
        ))}
      </nav>
      {children}
    </div>
  );
}
