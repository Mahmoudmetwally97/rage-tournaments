import { notFound, redirect } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

export type Locale = 'ar' | 'en';

export function tr(locale: string, ar: string, en: string): string {
  return locale === 'ar' ? ar : en;
}

/** Guard for admin pages: signed in + organizer role, else redirect. */
export async function requireOrganizer(localeParam: string, slug?: string) {
  if (!isValidLocale(localeParam)) notFound();
  const locale = localeParam as Locale;
  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);
  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/${locale}`);
  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  const ok = (roles ?? []).some((r) => r.role === 'super_admin' || r.role === 'moderator');
  if (!ok) redirect(`/${locale}/dashboard`);
  let tournament: Record<string, any> | null = null;
  if (slug) {
    const { data } = await supabase.from('tournaments').select('*').eq('slug', slug).maybeSingle();
    if (!data) notFound();
    tournament = data;
  }
  return { locale, user, supabase, tournament };
}
