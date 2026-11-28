import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, PageHero, inputCls } from '@/components/admin/ui';
import { TeamLogo } from '@/components/tournaments/TeamLogo';
import { CountrySelect, ImageInput, Label } from '@/components/profile/Fields';
import { removeProfileImage, saveProfile } from '../profile-actions';

export const dynamic = 'force-dynamic';

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ locale: string }>; searchParams: Promise<{ ok?: string; err?: string }> }) {
  const { locale: l } = await params;
  const sp = await searchParams;
  if (!isValidLocale(l)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#a4a6aa]"><Link className="font-bold text-[#e5ed43]" href={`/${locale}/login`}>{tr(locale, 'سجل دخول', 'Sign in')}</Link> {tr(locale, 'عشان تعدل حسابك.', 'to edit your account.')}</div>;
  }
  const { data: p } = await supabase.from('player_profiles').select('username,country,bio,avatar_url,cover_url').eq('id', user.id).maybeSingle();
  if (!p) return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#a4a6aa]">{tr(locale, 'مفيش بروفايل لسه.', 'No profile yet.')}</div>;
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={`/${locale}/u/${p.username}`} className="text-xs font-bold text-[#a4a6aa] hover:text-[#e5ed43]">← {tr(locale, 'رجوع للبروفايل', 'Back to profile')}</Link>
      <PageHero eyebrow={tr(locale, 'الحساب', 'ACCOUNT')} title={tr(locale, 'إعدادات الحساب', 'Account settings')} compact />
      <Flash ok={sp.ok} err={sp.err} />
      <form action={saveProfile} className="space-y-4">
        <Hidden values={{ locale }} />
        <Card title={tr(locale, 'الصور', 'Images')}>
          <div className="mb-4 flex items-center gap-4">
            <TeamLogo src={p.avatar_url} tag={p.username} size={72} />
            <div className="min-w-0 flex-1"><Label>{tr(locale, 'الصورة الشخصية (500×500)', 'Profile image (500×500)')}</Label><ImageInput name="avatar" locale={locale} hint="500 × 500 px" /></div>
          </div>
          <Label>{tr(locale, 'الكوفر (1920×480)', 'Cover image (1920×480)')}</Label>
          {p.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover_url} alt="" className="mb-2 h-24 w-full object-cover" />
          )}
          <ImageInput name="cover" locale={locale} hint="1920 × 480 px" />
        </Card>
        <Card title={tr(locale, 'بيانات المستخدم', 'User info')}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><Label>{tr(locale, 'اسم المستخدم', 'Username')}</Label><input name="username" required minLength={3} maxLength={20} defaultValue={p.username} dir="ltr" autoComplete="off" className={inputCls} /></div>
            <div><Label>{tr(locale, 'الإيميل', 'Email')}</Label><input disabled value={user.email ?? ''} dir="ltr" className={`${inputCls} opacity-70`} /></div>
            <div><Label>{tr(locale, 'البلد', 'Country')}</Label><CountrySelect locale={locale} value={p.country} /></div>
          </div>
          <div className="mt-4"><Label>{tr(locale, 'نبذة', 'About')}</Label><textarea name="bio" rows={4} maxLength={300} defaultValue={p.bio ?? ''} className={inputCls} placeholder={tr(locale, 'اكتب نبذة عنك (لحد 300 حرف)', 'Enter your bio (up to 300 characters)')} /></div>
        </Card>
        <div className="flex justify-end"><Btn tone="primary">{tr(locale, 'حفظ', 'Save')}</Btn></div>
      </form>
      {(p.avatar_url || p.cover_url) && (
        <div className="flex flex-wrap gap-2">
          {p.avatar_url && <form action={removeProfileImage}><Hidden values={{ locale, kind: 'avatar' }} /><Btn tone="danger">{tr(locale, 'شيل الصورة الشخصية', 'Remove profile image')}</Btn></form>}
          {p.cover_url && <form action={removeProfileImage}><Hidden values={{ locale, kind: 'cover' }} /><Btn tone="danger">{tr(locale, 'شيل الكوفر', 'Remove cover')}</Btn></form>}
        </div>
      )}
    </div>
  );
}
