import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, inputCls } from '@/components/admin/ui';
import { createTournament } from '../actions';

export default async function NewTournamentPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l } = await params;
  const sp = await searchParams;
  const { locale, supabase, user } = await requireOrganizer(l);
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (!(roles ?? []).some((r) => r.role === 'super_admin')) redirect(`/${locale}/admin`);

  const [{ data: games }, { data: tournaments }] = await Promise.all([
    supabase.from('games').select('id,name_ar,name_en').eq('is_active', true).order('name_en'),
    supabase.from('tournaments').select('id,title_ar,title_en,slug').order('created_at', { ascending: false })
  ]);
  if (!games) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link href={`/${locale}/admin`} className="mb-4 block text-xs text-[#a4a6aa] hover:text-[#e5ed43]">
          {locale === 'ar' ? '→ رجوع للبطولات' : '← Back to tournaments'}
        </Link>
        <p className="eyebrow mb-2">{tr(locale, 'لوحة الإدارة', 'ADMIN CONSOLE')}</p>
        <h1 className="text-3xl font-extrabold text-[#f4f4ed]">{tr(locale, 'بطولة جديدة', 'Create tournament')}</h1>
      </div>
      <Flash ok={sp.ok} err={sp.err} />
      <form action={createTournament} className="space-y-5">
        <Hidden values={{ locale }} />
        <Card title={tr(locale, 'الأساسيات', 'Basics')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'الاسم بالإنجليزي', 'Name (English)')}<input name="title_en" required minLength={2} className={inputCls} dir="ltr" /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'الاسم بالعربي', 'Name (Arabic)')}<input name="title_ar" className={inputCls} /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'الرابط (slug) - فارغ = من الاسم', 'URL slug (empty = from the name)')}<input name="slug" pattern="[a-z0-9]+(-[a-z0-9]+)*" className={inputCls} dir="ltr" placeholder="rage-cup-2" /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'اللعبة', 'Game')}
              <select name="game_id" required className={inputCls}>
                {games.map((g) => (<option key={g.id} value={g.id}>{locale === 'ar' ? g.name_ar : g.name_en}</option>))}
              </select>
            </label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'النظام', 'Format')}
              <select name="format" className={inputCls} defaultValue="ffa">
                <option value="ffa">{tr(locale, 'FFA فردي بالغرف (نقاط المركز + الكيلز)', 'Solo FFA in rooms (placement + kills)')}</option>
                <option value="sd_single">{tr(locale, 'تيمات SD: خروج مباشر (5 أساسي + 2 بدلاء)', 'Teams SD: single elimination (5 players + 2 subs)')}</option>
              </select>
            </label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'أقصى عدد لاعبين (0 = مفتوح)', 'Capacity (0 = open)')}<input name="max_participants" type="number" min={0} defaultValue={64} className={inputCls} dir="ltr" /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'لاعبين في الغرفة', 'Players per room')}<input name="room_size" type="number" min={2} defaultValue={25} className={inputCls} dir="ltr" /></label>
          </div>
        </Card>
        <Card title={tr(locale, 'المواعيد (توقيت القاهرة)', 'Dates (Cairo time)')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'موعد البداية (فارغ = لم يحدد)', 'Start (empty = TBD)')}<input name="starts_at" type="datetime-local" lang="en-GB" dir="ltr" className={inputCls} /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'آخر موعد للتسجيل (اختياري)', 'Registration deadline (optional)')}<input name="registration_deadline" type="datetime-local" lang="en-GB" dir="ltr" className={inputCls} /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'التشيك إن يفتح قبل البداية بـ (دقيقة)', 'Check-in opens before start (minutes)')}<input name="checkin_minutes" type="number" min={0} defaultValue={40} className={inputCls} dir="ltr" /></label>
          </div>
        </Card>
        <Card title={tr(locale, 'التسجيل والتواصل', 'Registration and contact')}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-2 text-sm text-[#f4f4ed] sm:col-span-2"><input name="requires_approval" type="checkbox" defaultChecked />{tr(locale, 'التسجيل بموافقة المنظم', 'Registration needs approval')}</label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'رابط التواصل (اختياري)', 'Contact link (optional)')}<input name="contact_url" className={inputCls} dir="ltr" /></label>
            <label className="text-xs text-[#a4a6aa]">{tr(locale, 'اسم زر التواصل', 'Contact label')}<input name="contact_label" className={inputCls} /></label>
          </div>
        </Card>
        <Card title={tr(locale, 'صورة الغلاف (اختياري)', 'Cover image (optional)')}>
          <input name="cover" type="file" accept="image/jpeg,image/png,image/webp" className="block w-full text-xs text-[#a4a6aa] file:me-3 file:border-0 file:bg-[#23252a] file:px-3 file:py-2 file:text-xs file:font-bold file:text-[#f4f4ed]" />
          <p className="mt-2 text-xs text-[#6f7276]">{tr(locale, 'JPG أو PNG أو WebP، حتى 3 ميجا. يفضل عريضة (مثلاً 1600×600). فارغ = الصورة الافتراضية.', 'JPG, PNG or WebP, up to 3 MB. Wide images work best (e.g. 1600x600). Empty = default art.')}</p>
        </Card>
        <Card title={tr(locale, 'نسخ القواعد', 'Copy rules')}>
          <label className="text-xs text-[#a4a6aa]">{tr(locale, 'انسخ القوانين والنقاط والجوائز والمراحل من بطولة موجودة', 'Copy rules, points, prizes and stages from an existing tournament')}
            <select name="copy_from" defaultValue="" className={inputCls}>
              <option value="">{tr(locale, 'لا، ابدأ فاضي (مرحلة واحدة ونقاط افتراضية)', 'No, start blank (one stage, default points)')}</option>
              {(tournaments ?? []).map((t) => (<option key={t.id} value={t.id}>{locale === 'ar' ? t.title_ar : t.title_en} ({t.slug})</option>))}
            </select>
          </label>
          <p className="mt-2 text-xs text-[#6f7276]">{tr(locale, 'اللاعبين والتسجيلات والنتائج مش بتتنسخ.', 'Players, registrations and results are not copied.')}</p>
        </Card>
        <label className="flex items-center gap-2 text-sm text-[#f4f4ed]"><input name="publish" type="checkbox" />{tr(locale, 'انشرها فوراً (غير كده تفضل مسودة مخفية)', 'Publish now (otherwise it stays a hidden draft)')}</label>
        <Btn tone="primary">{tr(locale, 'إنشاء البطولة', 'Create tournament')}</Btn>
      </form>
    </div>
  );
}
