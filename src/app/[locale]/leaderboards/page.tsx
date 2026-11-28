import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { SectionHeader } from '@/components/ui/SectionHeader';

export const dynamic = 'force-dynamic';

export default async function LeaderboardsPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const ar = locale === 'ar';
  const supabase = await getSupabaseServerClient();
  const { data: t } = supabase ? await supabase.from('tournaments').select('id,title_ar,title_en,slug').eq('slug', 'rage-cup').maybeSingle() : { data: null };
  const { data: rows } = supabase && t
    ? await supabase.from('tournament_standings').select('rank,ign,total_points,total_kills,matches_played').eq('tournament_id', t.id).order('rank').limit(100)
    : { data: [] };
  const list = rows ?? [];
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <SectionHeader title={ar ? 'التصنيف' : 'Leaderboard'} subtitle={t ? (ar ? t.title_ar : t.title_en) : ''} />
      {list.length === 0 ? (
        <div className="clip-card card-surface border border-[#2b2d30] p-6 text-sm text-[#a4a6aa]">
          {ar ? 'مفيش نتايج لسه. الترتيب هيظهر هنا بعد أول ماتش.' : 'No results yet. Standings appear here after the first match.'}
        </div>
      ) : (
        <div className="overflow-x-auto border border-[#2b2d30]">
          <table className="w-full min-w-[420px] text-sm">
            <thead className="bg-[#151619] text-[11px] font-bold text-[#a4a6aa]">
              <tr>
                <th className="p-3 text-start">#</th>
                <th className="p-3 text-start">{ar ? 'اللاعب' : 'Player'}</th>
                <th className="p-3 text-start">{ar ? 'نقاط' : 'Points'}</th>
                <th className="p-3 text-start">{ar ? 'كيلز' : 'Kills'}</th>
                <th className="p-3 text-start">{ar ? 'ماتشات' : 'Matches'}</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.rank} className={`border-t border-[#2b2d30] ${r.rank <= 3 ? `row-top${r.rank}` : ''}`}>
                  <td className="p-3 font-extrabold text-[#e5ed43]">{r.rank}</td>
                  <td className="p-3 font-bold text-[#f4f4ed]">{r.ign}</td>
                  <td className="p-3 font-extrabold text-[#e5ed43]">{Number(r.total_points)}</td>
                  <td className="p-3">{r.total_kills}</td>
                  <td className="p-3">{r.matches_played}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
