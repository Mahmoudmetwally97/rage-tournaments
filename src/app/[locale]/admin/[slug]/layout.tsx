import Link from 'next/link';
import type { ReactNode } from 'react';
import { requireOrganizer, tr } from '@/lib/admin';

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
      <div>
        <Link href={`/${locale}/admin`} className="text-xs font-bold text-[#a4a6aa] hover:text-[#e5ed43]">
          ← {tr(locale, 'لوحة الإدارة', 'Admin')}
        </Link>
        <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl text-[#f4f4ed]">
          {locale === 'ar' ? tournament!.title_ar : tournament!.title_en}
        </h1>
      </div>
      <nav className="-mx-4 flex gap-2 overflow-x-auto border-b border-[#2b2d30] px-4 pb-3 sm:mx-0 sm:px-0">
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
