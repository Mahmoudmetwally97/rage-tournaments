import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DEMO_TOURNAMENTS } from '@/lib/data/demo-tournaments';

export default async function LeaderboardsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];
  const sample = DEMO_TOURNAMENTS[0]?.sampleParticipants ?? [];

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#F2EFE9] sm:text-3xl">{dict.nav.leaderboards}</h1>
        <p className="mt-1 text-sm text-[#B5B2AC]">{dict.demoBanner}</p>
      </div>

      <div className="rounded-xl border border-[#27272C] bg-[#171719] p-5 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[#27272C] text-xs text-[#7A7874]">
              <th className="py-2.5 px-3 text-start">#</th>
              <th className="py-2.5 px-3 text-start">IGN</th>
              <th className="py-2.5 px-3 text-start">Points</th>
              <th className="py-2.5 px-3 text-start">Kills</th>
            </tr>
          </thead>
          <tbody>
            {sample.map((p, idx) => (
              <tr key={p.code} className="border-b border-[#27272C]/60">
                <td className="py-3 px-3 font-extrabold text-[#FFB938] ltr-isolate">#{idx + 1}</td>
                <td className="py-3 px-3 font-bold ltr-isolate">{p.ign}</td>
                <td className="py-3 px-3 ltr-isolate">{p.points}</td>
                <td className="py-3 px-3 ltr-isolate">{p.kills}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
