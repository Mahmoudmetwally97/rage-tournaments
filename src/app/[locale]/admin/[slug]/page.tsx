import { redirect } from 'next/navigation';
import { isoToCairoLocal } from '@/lib/format';
import { label } from '@/lib/labels';
import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { removeCover, saveCover, saveSettings, setTournamentStatus, setTournamentRole } from '../actions';

const FLOW: [string, string, string][] = [
  ['registration_open', 'فتح التسجيل', 'Open registration'],
  ['registration_closed', 'قفل التسجيل', 'Close registration'],
  ['check_in', 'فتح التشيك إن', 'Open check-in'],
  ['live', 'بدء البطولة', 'Go live'],
  ['completed', 'إنهاء البطولة', 'Finish']
];

const local = isoToCairoLocal;

export default async function AdminOverview({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  const { locale, supabase, tournament: t, level, isSuper } = await requireOrganizer(l, slug);
  if (level === 'staff') redirect(`/${locale}/admin/${slug}/participants`);
  const tid = t!.id as string;
  const { data: team } = isSuper ? await supabase.rpc('admin_tournament_team', { p_tournament: tid }) : { data: [] as { user_id: string; username: string; level: string }[] };

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
        <Card title={tr(locale, 'قايمة التقدم', 'Progress checklist')} right={<Pill on>{label(locale, t!.status)}</Pill>}>
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

      <Card title={tr(locale, 'صورة الغلاف', 'Cover image')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="relative h-36 overflow-hidden border border-[#2b2d30] bg-[#0d0e10]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={t!.cover_image_url || '/brand/rage-characters.png'} alt="" className={`absolute inset-0 h-full w-full object-cover ${t!.cover_image_url ? 'object-center opacity-80' : 'object-[62%_18%] opacity-70'}`} />
            <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-[#0d0e10] via-[#0d0e10]/70 to-transparent" />
            <span className="absolute bottom-2 start-3 text-[10px] font-bold tracking-[0.16em] text-[#e5ed43]">
              {t!.cover_image_url ? tr(locale, 'صورة مخصصة', 'CUSTOM') : tr(locale, 'الصورة الافتراضية', 'DEFAULT ART')}
            </span>
          </div>
          <div className="space-y-3">
            <form action={saveCover} className="space-y-2">
              <Hidden values={{ locale, slug, tid }} />
              <input name="cover" type="file" required accept="image/jpeg,image/png,image/webp" className="block w-full text-xs text-[#a4a6aa] file:me-3 file:border-0 file:bg-[#23252a] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#f4f4ed]" />
              <Btn tone="primary">{tr(locale, 'رفع الصورة', 'Upload image')}</Btn>
            </form>
            {t!.cover_image_url && (
              <form action={removeCover}>
                <Hidden values={{ locale, slug, tid }} />
                <Btn tone="danger">{tr(locale, 'حذف والرجوع للافتراضي', 'Remove, use default art')}</Btn>
              </form>
            )}
            <p className="text-xs text-[#6f7276]">{tr(locale, 'JPG أو PNG أو WebP، حتى 3 ميجا. يفضل عريضة (مثلاً 1600×600). بيظهر في صفحة البطولة والكارت مع طبقة غامقة عشان الكلام يفضل مقروء.', 'JPG, PNG or WebP, up to 3 MB. Wide images work best (e.g. 1600x600). Shown on the tournament page and card under a dark overlay so text stays readable.')}</p>
          </div>
        </div>
      </Card>

      <Card title={tr(locale, 'الإعدادات', 'Settings')}>
        <form action={saveSettings} className="grid gap-3 sm:grid-cols-2">
          <Hidden values={{ locale, slug, tid }} />
          <label className="text-xs text-[#a4a6aa]">العنوان AR<input name="title_ar" defaultValue={t!.title_ar} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">Title EN<input name="title_en" defaultValue={t!.title_en} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'أقصى عدد لاعبين (0 = مفتوح)', 'Max players (0 = open)')}<input name="max_participants" type="number" min={0} defaultValue={t!.max_participants} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'لاعبين في الغرفة', 'Players per room')}<input name="room_size" type="number" min={2} defaultValue={t!.room_size} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'موعد البداية (توقيت القاهرة، فارغ = لم يحدد)', 'Start (Cairo time, empty = TBD)')}<input name="starts_at" type="datetime-local" lang="en-GB" dir="ltr" defaultValue={local(t!.starts_at)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'فتح التشيك إن', 'Check-in opens')}<input name="checkin_opens_at" type="datetime-local" lang="en-GB" dir="ltr" defaultValue={local(t!.checkin_opens_at)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'قفل التشيك إن', 'Check-in closes')}<input name="checkin_closes_at" type="datetime-local" lang="en-GB" dir="ltr" defaultValue={local(t!.checkin_closes_at)} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'رابط التواصل (ديسكورد)', 'Contact link (Discord)')}<input name="contact_url" defaultValue={t!.contact_url ?? ''} className={inputCls} /></label>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'اسم زر التواصل', 'Contact label')}<input name="contact_label" defaultValue={t!.contact_label ?? ''} className={inputCls} /></label>
          <label className="flex items-center gap-2 text-sm text-[#f4f4ed]">
            <input name="requires_approval" type="checkbox" defaultChecked={t!.requires_approval} />
            {tr(locale, 'التسجيل بموافقة المنظم', 'Registration needs approval')}
          </label>
          <label className="flex items-center gap-2 text-sm text-[#f4f4ed]">
            <input name="is_test" type="checkbox" defaultChecked={Boolean((t as { is_test?: boolean }).is_test)} />
            {tr(locale, 'بطولة تجريبية (مخفية من القائمة العامة والرئيسية)', 'Test tournament (hidden from the public list and home)')}
          </label>
          <div className="sm:col-span-2"><Btn tone="primary">{tr(locale, 'حفظ', 'Save')}</Btn></div>
        </form>
      </Card>

      {isSuper && (
        <Card title={tr(locale, 'فريق البطولة', 'Tournament team')}>
          <p className="mb-3 text-xs text-[#a4a6aa]">
            {tr(locale, 'أدمن البطولة: تحكم كامل في البطولة دي بس. مشرف البطولة: يدخل النتائج ويعمل تشيك إن ويقبل أو يرفض اللاعبين. الاتنين مايشوفوش باقي البطولات أو إعدادات الموقع أو الصلاحيات.', 'Tournament admin: full control of this tournament only. Tournament moderator: enters results, checks players in, approves or rejects players. Neither can see other tournaments, site settings or roles.')}
          </p>
          <div className="space-y-2">
            {(team ?? []).map((m: { user_id: string; username: string; level: string }) => (
              <div key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 border border-[#2b2d30] bg-[#0d0e10] px-3 py-2">
                <span className="text-sm text-[#f4f4ed] ltr-isolate">{m.username} <span className="ms-2 text-xs text-[#a4a6aa]">{m.level === 'admin' ? tr(locale, 'أدمن البطولة', 'Tournament admin') : tr(locale, 'مشرف البطولة', 'Tournament moderator')}</span></span>
                <form action={setTournamentRole}>
                  <Hidden values={{ locale, slug, tid, user: m.user_id, level: 'none' }} />
                  <Btn tone="danger">{tr(locale, 'شيل', 'Remove')}</Btn>
                </form>
              </div>
            ))}
            {(team ?? []).length === 0 && <p className="text-xs text-[#6f7276]">{tr(locale, 'مفيش حد لسه', 'Nobody yet')}</p>}
          </div>
          <form action={setTournamentRole} className="mt-4 flex flex-wrap items-end gap-2">
            <Hidden values={{ locale, slug, tid }} />
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'اسم المستخدم (لازم يكون مسجل)', 'Username (must have signed up)')}<input name="username" required className={inputCls} /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'الدور', 'Role')}
              <select name="level" className={inputCls}>
                <option value="moderator">{tr(locale, 'مشرف البطولة', 'Tournament moderator')}</option>
                <option value="admin">{tr(locale, 'أدمن البطولة', 'Tournament admin')}</option>
              </select>
            </label>
            <Btn tone="primary">{tr(locale, 'إضافة', 'Add')}</Btn>
          </form>
        </Card>
      )}
    </div>
  );
}
