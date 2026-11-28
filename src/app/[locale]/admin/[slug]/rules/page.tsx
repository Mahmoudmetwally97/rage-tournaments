import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, inputCls } from '@/components/admin/ui';
import { saveRules, saveScoring } from '../../actions';

export default async function RulesPage({
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
  const { data: rule } = await supabase
    .from('tournament_scoring_rules')
    .select('placement_points,kill_points,round_count')
    .eq('tournament_id', tid)
    .eq('is_active', true)
    .maybeSingle();
  const placement = Object.entries((rule?.placement_points ?? {}) as Record<string, number>)
    .filter(([r]) => /^\d+$/.test(r))
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([r, p]) => `${r}:${p}`)
    .join(', ');
  const sections = (t!.rules_sections ?? []) as { title_ar: string; title_en: string; body_ar: string; body_en: string }[];
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <Card title={tr(locale, 'نظام النقاط (قيم مؤقتة، المنظم يحددها)', 'Scoring (placeholder values, organizer decides)')}>
        <form action={saveScoring} className="grid gap-3 sm:grid-cols-3">
          <Hidden values={{ locale, slug, tid }} />
          <label className="text-xs text-[#a4a6aa] sm:col-span-3">
            {tr(locale, 'نقاط المركز (مركز:نقاط، مفصولة بفاصلة)', 'Placement points (rank:points, comma separated)')}
            <textarea name="placement" rows={2} defaultValue={placement} className={`${inputCls} ltr-isolate`} />
          </label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'نقاط الكيل', 'Points per kill')}<input name="kill" type="number" step="0.5" defaultValue={Number(rule?.kill_points ?? 1)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'عدد الراوندات', 'Rounds')}<input name="rounds" type="number" min={1} defaultValue={rule?.round_count ?? 1} className={inputCls} /></label>
          <div className="self-end"><Btn tone="primary">{tr(locale, 'حفظ النقاط', 'Save scoring')}</Btn></div>
        </form>
      </Card>

      <Card title={tr(locale, 'أقسام القواعد (عربي / English)', 'Rules sections (AR / EN)')}>
        <form action={saveRules} className="space-y-4">
          <Hidden values={{ locale, slug, tid, count: String(sections.length) }} />
          {sections.map((s, i) => (
            <div key={i} className="space-y-2 border border-[#2b2d30] p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <input name={`title_ar_${i}`} defaultValue={s.title_ar} placeholder="العنوان" className={inputCls} />
                <input name={`title_en_${i}`} defaultValue={s.title_en} placeholder="Title" className={inputCls} />
                <textarea name={`body_ar_${i}`} rows={Math.max(4, Math.ceil((s.body_ar||"").length/45))} defaultValue={s.body_ar} className={`${inputCls} [field-sizing:content]`} />
                <textarea name={`body_en_${i}`} rows={Math.max(4, Math.ceil((s.body_en||"").length/45))} defaultValue={s.body_en} className={`${inputCls} [field-sizing:content]`} />
              </div>
              <label className="flex items-center gap-2 text-xs text-[#ff8a8a]"><input type="checkbox" name={`del_${i}`} /> {tr(locale, 'حذف القسم', 'Delete section')}</label>
            </div>
          ))}
          <div className="flex gap-2">
            <Btn tone="primary">{tr(locale, 'حفظ القواعد', 'Save rules')}</Btn>
            <button type="submit" name="add" value="1" className="border border-[#2b2d30] px-3 py-1.5 text-xs font-bold text-[#f4f4ed] cursor-pointer">
              + {tr(locale, 'قسم جديد (يحفظ الباقي)', 'Add section (saves the rest)')}
            </button>
          </div>
        </form>
      </Card>
    </div>
  );
}
