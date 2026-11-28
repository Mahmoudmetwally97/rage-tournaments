import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { saveSettings, setTournamentStatus } from '../actions';

const FLOW: [string, string, string][] = [
  ['registration_open', 'فتح التسجيل', 'Open registration'],
  ['registration_closed', 'قفل التسجيل', 'Close registration'],
  ['check_in', 'فتح التشيك إن', 'Open check-in'],
  ['live', 'بدء البطولة', 'Go live'],
  ['completed', 'إنهاء البطولة', 'Finish']
];

const local = (v?: string | null) => (v ? new Date(v).toISOString().slice(0, 16) : '');

export default async function AdminOverview({
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

  const [{ data: regs }, { data: pools }, { data: rule }, { data: matches }, { data: stages }] = await Promise.all([
    supabase.from('registrations').select('status').eq('tournament_id', tid),
    supabase.from('prize_pools').select('id').eq('tournament_id', tid),
    supabase.from('tournament_scoring_rules').select('placement_points').eq('tournament_id', tid).eq('is_active', true).maybeSingle(),
    supabase.from('matches').select('status,stage_id'),
    supabase.from('stages').select('id').eq('tournament_id', tid)
  ]);
  const count = (st: string) => (regs ?? []).filter((r) => r.status === st).length;
  const stageIds = new Set((stages ?? []).map((s) => s.id));
  const ms = (matches ?? []).filter((m) => stageIds.has(m.stage_id));
  const doneMs = ms.filter((m) => m.status === 'completed').length;

  const checklist: [string, boolean][] = [
    [tr(locale, 'إعدادات البطولة (عدد اللاعبين، حجم الغرفة)', 'Settings (capacity, room size)'), (t!.max_participants ?? 0) > 0],
    [tr(locale, 'التاريخ محدد', 'Date set'), Boolean(t!.starts_at)],
    [tr(locale, 'نقاط المركز والكيلز', 'Placement and kill points'), Object.keys(rule?.placement_points ?? {}).length > 0],
    [tr(locale, 'الجوائز', 'Prizes'), (pools ?? []).length > 0],
    [tr(locale, 'القواعد', 'Rules sections'), (t!.rules_sections ?? []).length > 0],
    [tr(locale, 'لاعبين مقبولين', 'Accepted players'), count('confirmed') + count('checked_in') > 0],
    [tr(locale, 'لاعبين عملوا تشيك إن', 'Players checked in'), count('checked_in') > 0],
    [tr(locale, 'الماتشات متولدة', 'Rooms and matches seeded'), ms.length > 0],
    [tr(locale, 'كل النتائج مدخلة', 'All results entered'), ms.length > 0 && doneMs === ms.length]
  ];

  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <div className="grid gap-6 lg:grid-cols-2">
        <Card title={tr(locale, 'قايمة التقدم', 'Progress checklist')} right={<Pill on>{t!.status}</Pill>}>
          <ul className="space-y-2 text-sm">
            {checklist.map(([label, ok]) => (
              <li key={label} className="flex items-center gap-2">
                <span className={ok ? 'text-[#e5ed43]' : 'text-[#6f7276]'}>{ok ? '✓' : '○'}</span>
                <span className={ok ? 'text-[#f4f4ed]' : 'text-[#a4a6aa]'}>{label}</span>
              </li>
            ))}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-2 text-xs text-[#a4a6aa]">
            <span>{tr(locale, 'معلق', 'Pending')}: {count('pending')}</span>
            <span>{tr(locale, 'مقبول', 'Accepted')}: {count('confirmed')}</span>
            <span>{tr(locale, 'تشيك إن', 'Checked in')}: {count('checked_in')}</span>
            <span>{tr(locale, 'ماتشات', 'Matches')}: {doneMs}/{ms.length}</span>
          </div>
        </Card>

        <Card title={tr(locale, 'مراحل البطولة', 'Tournament flow')}>
          <div className="flex flex-wrap gap-2">
            {FLOW.map(([st, ar, en]) => (
              <form key={st} action={setTournamentStatus}>
                <Hidden values={{ locale, slug, tid, status: st }} />
                <Btn tone={t!.status === st ? 'primary' : 'default'}>{tr(locale, ar, en)}</Btn>
              </form>
            ))}
            <form action={setTournamentStatus}>
              <Hidden values={{ locale, slug, tid, status: 'published' }} />
              <Btn tone="danger">{tr(locale, 'رجوع لمنشور', 'Back to published')}</Btn>
            </form>
          </div>
          <p className="mt-3 text-xs text-[#6f7276]">
            {tr(locale, 'التشيك إن يفتح للاعبين المقبولين فقط. توليد الغرف من تبويب الماتشات.', 'Check-in is open to accepted players only. Seed rooms from the Matches tab.')}
          </p>
        </Card>
      </div>

      <Card title={tr(locale, 'الإعدادات', 'Settings')}>
        <form action={saveSettings} className="grid gap-3 sm:grid-cols-2">
          <Hidden values={{ locale, slug, tid }} />
          <label className="text-xs text-[#a4a6aa]">العنوان AR<input name="title_ar" defaultValue={t!.title_ar} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">Title EN<input name="title_en" defaultValue={t!.title_en} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'أقصى عدد لاعبين (0 = مفتوح)', 'Max players (0 = open)')}<input name="max_participants" type="number" min={0} defaultValue={t!.max_participants} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'لاعبين في الغرفة', 'Players per room')}<input name="room_size" type="number" min={2} defaultValue={t!.room_size} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'موعد البداية (فارغ = لم يحدد)', 'Start (empty = TBD)')}<input name="starts_at" type="datetime-local" defaultValue={local(t!.starts_at)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'فتح التشيك إن', 'Check-in opens')}<input name="checkin_opens_at" type="datetime-local" defaultValue={local(t!.checkin_opens_at)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'قفل التشيك إن', 'Check-in closes')}<input name="checkin_closes_at" type="datetime-local" defaultValue={local(t!.checkin_closes_at)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'رابط التواصل (ديسكورد)', 'Contact link (Discord)')}<input name="contact_url" defaultValue={t!.contact_url ?? ''} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'اسم زر التواصل', 'Contact label')}<input name="contact_label" defaultValue={t!.contact_label ?? ''} className={inputCls} /></label>
          <label className="flex items-center gap-2 text-sm text-[#f4f4ed]">
            <input name="requires_approval" type="checkbox" defaultChecked={t!.requires_approval} />
            {tr(locale, 'التسجيل بموافقة المنظم', 'Registration needs approval')}
          </label>
          <div className="sm:col-span-2"><Btn tone="primary">{tr(locale, 'حفظ', 'Save')}</Btn></div>
        </form>
      </Card>
    </div>
  );
}
