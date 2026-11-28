import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, PageHero, inputCls } from '@/components/admin/ui';
import { CountrySelect, ImageInput, Label } from '@/components/profile/Fields';
import { createTeamFull } from '../../profile-actions';

export const dynamic = 'force-dynamic';

export default async function CreateTeamPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale: l } = await params;
  const sp = await searchParams;
  if (!isValidLocale(l)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#a4a6aa]"><Link className="font-bold text-[#e5ed43]" href={`/${locale}/login`}>{tr(locale, 'سجل دخول', 'Sign in')}</Link> {tr(locale, 'عشان تعمل تيم.', 'to create a team.')}</div>;
  }
  const { data: game } = await supabase.from('games').select('id,name_en,name_ar').order('created_at').limit(1).maybeSingle();
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={`/${locale}/teams`} className="text-xs font-bold text-[#a4a6aa] hover:text-[#e5ed43]">← {tr(locale, 'تيماتي', 'My teams')}</Link>
      <PageHero eyebrow={tr(locale, 'تيم جديد', 'NEW TEAM')} title={tr(locale, 'إنشاء تيم', 'Create team')} compact />
      <Flash ok={sp.ok} err={sp.err} />
      <form action={createTeamFull} className="space-y-4">
        <Hidden values={{ locale, game_id: (game?.id as string) ?? '' }} />
        <Card title={tr(locale, 'هوية التيم', 'Team identity')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>{tr(locale, 'اللوجو (500×500)', 'Logo (500×500)')}</Label><ImageInput name="logo" locale={locale} hint="500 × 500 px" /></div>
            <div><Label>{tr(locale, 'الكوفر (1920×480)', 'Cover (1920×480)')}</Label><ImageInput name="cover" locale={locale} hint="1920 × 480 px" /></div>
          </div>
        </Card>
        <Card title={tr(locale, 'بيانات التيم', 'Team info')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>{tr(locale, 'اسم التيم', 'Team name')}</Label><input name="name" required minLength={2} maxLength={40} autoComplete="off" className={inputCls} placeholder={tr(locale, 'اكتب اسم التيم', 'Enter your team name')} /></div>
            <div><Label>{tr(locale, 'التاج (2-5 حروف)', 'Tag (2-5 characters)')}</Label><input name="tag" required minLength={2} maxLength={5} dir="ltr" autoComplete="off" className={inputCls} placeholder="RAGE" /></div>
            <div><Label>{tr(locale, 'البلد', 'Country')}</Label><CountrySelect locale={locale} value="EG" /></div>
            <div><Label>{tr(locale, 'اللعبة', 'Game')}</Label><input disabled value={(locale === 'ar' ? game?.name_ar : game?.name_en) ?? ''} className={`${inputCls} opacity-70`} /></div>
          </div>
          <div className="mt-4"><Label>{tr(locale, 'الوصف', 'Description')}</Label><textarea name="description" rows={4} maxLength={500} className={inputCls} placeholder={tr(locale, 'عرّف بتيمك (لحد 500 حرف)', 'Tell people about your team (up to 500 characters)')} /></div>
        </Card>
        <Card title={tr(locale, 'التواصل', 'Contact')}>
          <Label>{tr(locale, 'الإيميل', 'Email')}</Label>
          <input name="contact_email" type="email" dir="ltr" className={inputCls} placeholder="team@example.com" />
          <p className="mt-1 text-[11px] text-[#6f7276]">{tr(locale, 'بيظهر بس للأعضاء المسجلين دخول.', 'Shown only to signed-in users.')}</p>
        </Card>
        <div className="flex justify-end"><Btn tone="primary">{tr(locale, 'إنشاء التيم', 'Create team')}</Btn></div>
      </form>
    </div>
  );
}
