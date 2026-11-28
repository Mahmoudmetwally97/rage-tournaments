import { label } from '@/lib/labels';
import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { saveMatch, seedStage, createStage, advanceStage, seedBracket, saveTeamMatch, reopenMatch, updateStage, deleteStage } from '../../actions';
import { DeleteStageForm } from '@/components/admin/DeleteStageForm';
import { loadBracket } from '@/lib/bracket';
import { TeamBracket } from '@/components/tournaments/TeamBracket';
import { RoomBoard } from '@/components/admin/RoomBoard';
import { StageBracket } from '@/components/admin/StageBracket';

export default async function MatchesPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string; stage?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  const { locale, supabase, tournament: t } = await requireOrganizer(l, slug);
  const tid = t!.id as string;

  if (t!.competition_type === 'team') {
    const { rounds } = await loadBracket(supabase, tid);
    const ar = locale === 'ar';
    return (
      <div className="space-y-4">
        <Flash ok={sp.ok} err={sp.err} />
        <Card
          title={tr(locale, 'براكت الخروج المباشر', 'Single-elimination bracket')}
          right={
            <form action={seedBracket}>
              <Hidden values={{ locale, slug, tid }} />
              <Btn tone="primary">{tr(locale, 'توليد البراكت من التيمات اللي عملت تشيك إن', 'Generate bracket from checked-in teams')}</Btn>
            </form>
          }
        >
          <p className="mb-3 text-xs text-[#a4a6aa]">
            {tr(locale, 'التيم الأعلى ترتيباً بيعدي لو العدد فردي (bye). إعادة التوليد مسموحة طالما مفيش نتايج.', 'Top seeds get a bye when the count is not a power of 2. Regenerating is allowed until results exist.')}
          </p>
          <TeamBracket
            rounds={rounds}
            ar={ar}
            renderAction={(m) =>
              m.a && m.b ? (
                <form action={saveTeamMatch} className="flex items-center gap-1 border-t border-[#2b2d30] p-2">
                  <Hidden values={{ locale, slug, tid, match_id: m.id }} />
                  <input name="score_a" type="number" min={0} required defaultValue={m.scoreA ?? ''} dir="ltr" className={`${inputCls} w-12 !py-1 text-center`} aria-label="A" />
                  <span className="text-[#6f7276]">-</span>
                  <input name="score_b" type="number" min={0} required defaultValue={m.scoreB ?? ''} dir="ltr" className={`${inputCls} w-12 !py-1 text-center`} aria-label="B" />
                  <Btn tone="primary">{tr(locale, 'حفظ', 'Save')}</Btn>
                </form>
              ) : null
            }
          />
        </Card>
      </div>
    );
  }

  const { data: stageRows } = await supabase.from('stages').select('id,stage_order,name_ar,name_en,status,qualify_count,advance_rule').eq('tournament_id', tid).order('stage_order');
  const stages = stageRows ?? [];
  const selOrder = Number(sp.stage) || stages.find((x) => x.status === 'active')?.stage_order || stages[0]?.stage_order || 1;
  const sel = stages.find((x) => x.stage_order === selOrder);
  const allIds = stages.map((x) => x.id);
  const { data: allMatches } = await supabase.from('matches').select('id,stage_id,group_id,status').in('stage_id', allIds.length ? allIds : ['00000000-0000-0000-0000-000000000000']);
  const { data: allGroups } = await supabase.from('group_participants').select('group_id,registration_id,groups(stage_id)');
  const bracket = stages.map((x) => {
    const ms = (allMatches ?? []).filter((m) => m.stage_id === x.id);
    const rooms = new Set(ms.map((m) => m.group_id)).size;
    const players = (allGroups ?? []).filter((g) => {
      const gg = g.groups as unknown as { stage_id: string } | { stage_id: string }[] | null;
      return (Array.isArray(gg) ? gg[0]?.stage_id : gg?.stage_id) === x.id;
    }).length;
    return { order: x.stage_order, name: locale === 'ar' ? x.name_ar : x.name_en, status: x.status, rooms, players, qualify: x.qualify_count, rule: x.advance_rule, scored: ms.filter((m) => m.status === 'completed').length, total: ms.length };
  });
  const { data: matches } = await supabase
    .from('matches')
    .select('id,status,round_number,match_number,group_id,groups(name)')
    .eq('stage_id', sel?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('match_number')
    .order('round_number');
  const { data: gps } = await supabase
    .from('group_participants')
    .select('group_id,registration_id,seed_in_group,registrations(ign_snapshot),groups!inner(id,name,group_order,stage_id)')
    .eq('groups.stage_id', sel?.id ?? '00000000-0000-0000-0000-000000000000')
    .order('seed_in_group');
  const lockedGroups = new Set((matches ?? []).filter((m) => m.status === 'completed').map((m) => m.group_id));
  const roomMap = new Map<string, { id: string; name: string; order: number; locked: boolean; players: { id: string; ign: string }[] }>();
  for (const g of gps ?? []) {
    const gr = g.groups as unknown as { id: string; name: string; group_order: number } | { id: string; name: string; group_order: number }[];
    const grp = Array.isArray(gr) ? gr[0]! : gr;
    const rg = g.registrations as unknown as { ign_snapshot: string } | { ign_snapshot: string }[] | null;
    const ign = (Array.isArray(rg) ? rg[0]?.ign_snapshot : rg?.ign_snapshot) ?? '';
    if (!roomMap.has(grp.id)) roomMap.set(grp.id, { id: grp.id, name: grp.name, order: grp.group_order, locked: lockedGroups.has(grp.id), players: [] });
    roomMap.get(grp.id)!.players.push({ id: g.registration_id, ign });
  }
  const boardRooms = [...roomMap.values()].sort((x, y) => x.order - y.order);
  const { count: stageResultCount } = await supabase.from('match_results').select('id', { count: 'exact', head: true }).in('match_id', (matches ?? []).length ? (matches ?? []).map((m) => m.id) : ['00000000-0000-0000-0000-000000000000']);
  const nextExists = stages.some((x) => x.stage_order === selOrder + 1);
  const allDone = (matches ?? []).length > 0 && (matches ?? []).every((m) => m.status === 'completed');
  const ids = (matches ?? []).map((m) => m.id);
  const safe = ids.length ? ids : ['00000000-0000-0000-0000-000000000000'];
  const [{ data: parts }, { data: results }] = await Promise.all([
    supabase.from('match_participants').select('match_id,registration_id,slot_number,registrations(ign_snapshot)').in('match_id', safe).order('slot_number'),
    supabase.from('match_results').select('match_id,registration_id,placement,kills,points_awarded').in('match_id', safe).eq('is_current', true)
  ]);

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} err={sp.err} />
      <Card title={tr(locale, 'المراحل والبراكت', 'Stages and bracket')}>
        {stages.length > 0 && <StageBracket stages={bracket} selected={selOrder} base={`/${locale}/admin/${slug}/matches`} ar={locale === 'ar'} statusLabel={(x) => label(locale, x)} />}
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <form action={createStage} className="space-y-2">
            <Hidden values={{ locale, slug, tid }} />
            <p className="text-xs font-bold text-[#a4a6aa]">{tr(locale, 'إضافة مرحلة جديدة', 'Add a stage')}</p>
            <input name="name_ar" required placeholder={tr(locale, 'الاسم بالعربي (مثال: النهائي)', 'Arabic name')} className={inputCls} />
            <input name="name_en" required placeholder={tr(locale, 'الاسم بالإنجليزي (مثال: Final)', 'English name (e.g. Final)')} className={inputCls} />
            <Btn>{tr(locale, 'إضافة مرحلة', 'Add stage')}</Btn>
          </form>
          {nextExists && (
            <form action={advanceStage} className="space-y-2">
              <Hidden values={{ locale, slug, tid, from: String(selOrder) }} />
              <p className="text-xs font-bold text-[#a4a6aa]">{tr(locale, `ترقية أفضل اللاعبين من مرحلة ${selOrder} للمرحلة التالية`, `Advance the top players from stage ${selOrder}`)}</p>
              <input name="top_n" type="number" min={1} defaultValue={sel?.qualify_count ?? 1} className={inputCls} aria-label="Top N" />
              <select name="advance_rule" defaultValue={sel?.advance_rule ?? 'top_n_overall'} className={inputCls} aria-label="Advance mode">
                <option value="top_n_overall">{tr(locale, 'أفضل N في المرحلة كلها', 'Top N overall (all rooms together)')}</option>
                <option value="top_n_per_group">{tr(locale, 'أفضل N من كل روم', 'Top N per room')}</option>
                <option value="top_n_total">{tr(locale, 'إجمالي N متأهل موزعين على المجموعات (والباقي أحسن النتائج)', 'Total N across groups (rest filled by best overall)')}</option>
              </select>
              <Btn tone="primary">{tr(locale, 'ترقية وتوليد الغرف', 'Advance and seed rooms')}</Btn>
              {!allDone && <p className="text-[11px] text-[#6f7276]">{tr(locale, 'لازم كل ماتشات المرحلة تكون مكتملة.', 'All matches of the stage must be scored first.')}</p>}
            </form>
          )}
        </div>
      </Card>

      {sel && (
        <Card title={tr(locale, `تعديل المرحلة ${selOrder}`, `Edit stage ${selOrder}`)}>
          <div className="grid gap-4 md:grid-cols-2">
            <form action={updateStage} className="space-y-2">
              <Hidden values={{ locale, slug, stage_id: sel.id, order: String(selOrder) }} />
              <input name="name_ar" required defaultValue={sel.name_ar} placeholder={tr(locale, 'الاسم بالعربي', 'Arabic name')} className={inputCls} />
              <input name="name_en" required defaultValue={sel.name_en} placeholder={tr(locale, 'الاسم بالإنجليزي', 'English name')} className={inputCls} />
              <label className="block text-[11px] font-bold text-[#a4a6aa]">{tr(locale, 'عدد المتأهلين للمرحلة التالية', 'Players who advance')}</label>
              <input name="qualify" type="number" min={1} defaultValue={sel.qualify_count ?? 1} className={inputCls} />
              <label className="block text-[11px] font-bold text-[#a4a6aa]">{tr(locale, 'طريقة الترقية', 'Advance mode')}</label>
              <select name="advance_rule" defaultValue={sel.advance_rule ?? 'top_n_overall'} className={inputCls} aria-label="Advance mode">
                <option value="top_n_overall">{tr(locale, 'أفضل N في المرحلة كلها', 'Top N overall (all rooms together)')}</option>
                <option value="top_n_per_group">{tr(locale, 'أفضل N من كل روم', 'Top N per room')}</option>
                <option value="top_n_total">{tr(locale, 'إجمالي N متأهل موزعين على المجموعات (والباقي أحسن النتائج)', 'Total N across groups (rest filled by best overall)')}</option>
              </select>
              <Btn tone="primary">{tr(locale, 'حفظ التعديل', 'Save changes')}</Btn>
            </form>
            <div className="space-y-2">
              <p className="text-xs text-[#a4a6aa]">{tr(locale, 'الحذف بيمسح الغرف والماتشات بتاعة المرحلة، وبيرقّم المراحل اللي بعدها من جديد. لو فيها نتائج بيطلب تأكيد صريح، وكل حاجة بتتسجل في السجل.', 'Deleting removes this stage\'s rooms and matches and renumbers the later stages. If it has results you must confirm explicitly. Everything is audit-logged.')}</p>
              <DeleteStageForm action={deleteStage} hidden={{ locale, slug, stage_id: sel.id, order: String(selOrder) }} ar={locale === 'ar'} name={locale === 'ar' ? sel.name_ar : sel.name_en} rooms={boardRooms.length || new Set((matches ?? []).map((m) => m.group_id)).size} matches={(matches ?? []).length} results={stageResultCount ?? 0} />
            </div>
          </div>
        </Card>
      )}

      {boardRooms.length > 0 && (
        <Card title={tr(locale, 'توزيع اللاعبين على الغرف', 'Player rooms')}>
          <RoomBoard rooms={boardRooms} roomSize={t!.room_size as number} slug={slug} locale={locale} />
        </Card>
      )}

      <Card
        title={tr(locale, 'الغرف والماتشات', 'Rooms and matches')}
        right={
          <form action={seedStage} className="flex flex-wrap items-center gap-2">
            <Hidden values={{ locale, slug, tid, order: String(selOrder) }} />
            <input name="groups" type="number" min={1} placeholder={tr(locale, 'عدد المجموعات (فاضي = تلقائي)', 'Groups (empty = auto)')} className={inputCls + ' !w-44'} aria-label="Groups" />
            <select name="mode" className={inputCls + ' !w-40'} aria-label="Split">
              <option value="balanced">{tr(locale, 'توزيع متوازن بالسييد', 'Balanced by seed')}</option>
              <option value="random">{tr(locale, 'عشوائي', 'Random')}</option>
            </select>
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
        const locked = m.status === 'completed';
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
              <fieldset disabled={locked} className="space-y-2 border-0 p-0 disabled:opacity-70">
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
              </fieldset>
              {!locked && <div className="mt-4"><Btn tone="primary">{tr(locale, 'حفظ النتائج', 'Save results')}</Btn></div>}
            </form>
            {locked && (
              <form action={reopenMatch} className="mt-4 flex flex-wrap items-center gap-2 border-t border-[#2b2d30] pt-4">
                <Hidden values={{ locale, slug, match_id: m.id }} />
                <input name="reason" placeholder={tr(locale, 'سبب إعادة الفتح (اختياري)', 'Reason for reopening (optional)')} className={inputCls} />
                <Btn>{tr(locale, 'إعادة فتح النتائج للتعديل', 'Reopen results')}</Btn>
                <p className="w-full text-[11px] text-[#6f7276]">{tr(locale, 'بعد الحفظ تاني الترتيب والنتايج النهائية بيتحدثوا لوحدهم. النسخة القديمة بتفضل في السجل.', 'After you save again, standings and Final Results update automatically. The old version stays in history.')}</p>
              </form>
            )}
          </Card>
        );
      })}
    </div>
  );
}
