import { label } from '@/lib/labels';
import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { saveMatch, seedStage } from '../../actions';

export default async function MatchesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  const { locale, supabase, tournament: t } = await requireOrganizer(l, slug);
  const tid = t!.id as string;

  const { data: stages } = await supabase.from('stages').select('id').eq('tournament_id', tid);
  const stageIds = (stages ?? []).map((s) => s.id);
  const { data: matches } = await supabase
    .from('matches')
    .select('id,status,round_number,match_number,group_id,groups(name)')
    .in('stage_id', stageIds.length ? stageIds : ['00000000-0000-0000-0000-000000000000'])
    .order('match_number')
    .order('round_number');
  const ids = (matches ?? []).map((m) => m.id);
  const safe = ids.length ? ids : ['00000000-0000-0000-0000-000000000000'];
  const [{ data: parts }, { data: results }] = await Promise.all([
    supabase.from('match_participants').select('match_id,registration_id,slot_number,registrations(ign_snapshot)').in('match_id', safe).order('slot_number'),
    supabase.from('match_results').select('match_id,registration_id,placement,kills,points_awarded').in('match_id', safe).eq('is_current', true)
  ]);

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} err={sp.err} />
      <Card
        title={tr(locale, 'الغرف والماتشات', 'Rooms and matches')}
        right={
          <form action={seedStage}>
            <Hidden values={{ locale, slug, tid }} />
            <Btn tone="primary">{tr(locale, 'توليد الغرف من اللاعبين اللي عملوا تشيك إن', 'Seed rooms from checked-in players')}</Btn>
          </form>
        }
      >
        <p className="text-xs text-[#a4a6aa]">
          {tr(locale, `حجم الغرفة ${t!.room_size}. إعادة التوليد مسموحة طالما لا توجد نتائج.`, `Room size ${t!.room_size}. Re-seeding is allowed until results exist.`)}
        </p>
      </Card>

      {(matches ?? []).length === 0 && (
        <p className="text-sm text-[#a4a6aa]">{tr(locale, 'لم يتم توليد ماتشات بعد.', 'No matches seeded yet.')}</p>
      )}

      {(matches ?? []).map((m) => {
        const mp = (parts ?? []).filter((p) => p.match_id === m.id);
        const res = new Map((results ?? []).filter((r) => r.match_id === m.id).map((r) => [r.registration_id, r]));
        const g = m.groups as unknown as { name: string } | { name: string }[] | null;
        const gname = Array.isArray(g) ? g[0]?.name : g?.name;
        return (
          <Card
            key={m.id}
            title={`${gname ?? ''} • ${tr(locale, 'راوند', 'Round')} ${m.round_number}`}
            right={<Pill on={m.status === 'completed'}>{label(locale, m.status)}</Pill>}
          >
            <form action={saveMatch}>
              <Hidden values={{ locale, slug, match_id: m.id }} />
              <div className="mb-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-[#a4a6aa]">
                  <span>{tr(locale, 'اللاعبين في الغرفة', 'Players in room')} <span className="ltr-isolate text-[#f4f4ed]">{mp.length}</span></span>
                  <span>{tr(locale, 'تم التسجيل', 'Scored')} <span className="ltr-isolate text-[#e5ed43]">{res.size}/{mp.length}</span></span>
                </div>
                <div className="grid grid-cols-[repeat(auto-fill,minmax(26px,1fr))] gap-1">
                  {mp.map((p, i) => {
                    const done = res.has(p.registration_id);
                    return <span key={p.registration_id} className={`clip-chip flex h-7 items-center justify-center text-[10px] font-extrabold ${done ? 'bg-[#e5ed43] text-[#121408]' : 'border border-[#2b2d30] bg-[#0d0e10] text-[#6f7276]'}`}>{i + 1}</span>;
                  })}
                </div>
              </div>
              <div className="mb-2 grid grid-cols-[1fr_64px_64px_40px] sm:grid-cols-[1fr_90px_90px_70px] gap-2 text-[11px] font-bold text-[#6f7276]">
                <span>{tr(locale, 'اللاعب', 'Player')}</span>
                <span>{tr(locale, 'الترتيب', 'Rank')}</span>
                <span>{tr(locale, 'كيلز', 'Kills')}</span>
                <span>{tr(locale, 'نقاط', 'Pts')}</span>
              </div>
              <div className="space-y-2">
                {mp.map((p) => {
                  const r = res.get(p.registration_id);
                  const reg = p.registrations as unknown as { ign_snapshot: string } | { ign_snapshot: string }[] | null;
                  const ign = Array.isArray(reg) ? reg[0]?.ign_snapshot : reg?.ign_snapshot;
                  return (
                    <div key={p.registration_id} className="grid grid-cols-[1fr_64px_64px_40px] sm:grid-cols-[1fr_90px_90px_70px] items-center gap-2">
                      <span className="truncate text-sm font-bold text-[#f4f4ed]">{ign}</span>
                      <input name={`rank_${p.registration_id}`} type="number" min={1} defaultValue={r?.placement ?? ''} className={inputCls} />
                      <input name={`kills_${p.registration_id}`} type="number" min={0} defaultValue={r?.kills ?? 0} className={inputCls} />
                      <span className="text-sm text-[#e5ed43] ltr-isolate">{r ? Number(r.points_awarded) : '-'}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4"><Btn tone="primary">{tr(locale, 'حفظ النتائج', 'Save results')}</Btn></div>
            </form>
          </Card>
        );
      })}
    </div>
  );
}
