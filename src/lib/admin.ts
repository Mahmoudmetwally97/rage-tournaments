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
  const isSuper = (roles ?? []).some((r) => r.role === 'super_admin');
  const isGlobal = isSuper || (roles ?? []).some((r) => r.role === 'moderator');
  const { data: ta } = await supabase.from('tournament_admins').select('tournament_id,role').eq('user_id', user.id);
  const assigned = (ta ?? []).map((x) => x.tournament_id as string);
  if (!isGlobal && assigned.length === 0) redirect(`/${locale}/dashboard`);
  let tournament: Record<string, any> | null = null;
  // 'manager' = full control of this tournament; 'staff' = results, check-in and players only
  let level: 'manager' | 'staff' = isSuper ? 'manager' : 'staff';
  if (slug) {
    const { data } = await supabase.from('tournaments').select('*').eq('slug', slug).maybeSingle();
    if (!data) notFound();
    tournament = data;
    const mine = (ta ?? []).filter((x) => x.tournament_id === data.id);
    if (!isGlobal && mine.length === 0) redirect(`/${locale}/admin`);
    if (mine.some((x) => x.role === 'tournament_manager')) level = 'manager';
  }
  return { locale, user, supabase, tournament, level, isSuper, isGlobal, assigned };
}
