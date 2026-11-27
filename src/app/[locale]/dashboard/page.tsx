import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_TOURNAMENTS } from '@/lib/data/demo-tournaments';
import { Badge } from '@/components/ui/Badge';

export default async function PlayerDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#F2EFE9] sm:text-3xl">{dict.dashboard.title}</h1>
        <p className="mt-1 text-sm text-[#B5B2AC]">{dict.dashboard.subtitle}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <section className="rounded-xl border border-[#27272C] bg-[#171719] p-5">
            <h2 className="mb-4 text-base font-extrabold">{dict.dashboard.myTournaments}</h2>
            <div className="space-y-3">
              {DEMO_TOURNAMENTS.slice(0, 2).map((t) => (
                <div key={t.slug} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-[#27272C] bg-[#0B0B0C] p-4 text-sm">
                  <div>
                    <div className="font-bold text-[#F2EFE9]">{locale === 'ar' ? t.titleAr : t.titleEn}</div>
                    <div className="text-xs text-[#7A7874] ltr-isolate">{t.formatLabel}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="open">Confirmed</Badge>
                    <Link href={`/${locale}/tournaments/${t.slug}`} className="text-xs font-bold text-[#FF6A1A] hover:underline">
                      {dict.tournament.viewDetails}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-[#27272C] bg-[#171719] p-5">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-base font-extrabold">{dict.dashboard.rageLinkTitle}</h2>
              <Badge variant="warning">Pending Integration</Badge>
            </div>
            <p className="text-xs text-[#B5B2AC] leading-relaxed">{dict.dashboard.rageLinkDesc}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
