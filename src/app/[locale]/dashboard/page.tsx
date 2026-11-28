import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { label } from '@/lib/labels';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function PlayerDashboardPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  const user = await getCurrentUser();
  const supabase = await getSupabaseServerClient();
  let profile: { username: string; display_name: string | null } | null = null;
  let isOrganizer = false;
  let mine: { id: string; ign: string; status: string; title: string; slug: string }[] = [];

  if (user && supabase) {
    const { data } = await supabase
      .from('player_profiles')
      .select('username,display_name')
      .eq('id', user.id)
      .maybeSingle();
    profile = data ?? null;

    const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
    isOrganizer = (roles ?? []).some((r) => r.role === 'super_admin' || r.role === 'moderator');
    const { data: regs } = await supabase
      .from('registrations')
      .select('id,ign_snapshot,status,tournaments(title_ar,title_en,slug)')
      .eq('user_id', user.id)
      .neq('status', 'cancelled');
    mine = (regs ?? []).map((r) => {
      const t = r.tournaments as unknown as { title_ar: string; title_en: string; slug: string } | { title_ar: string; title_en: string; slug: string }[] | null;
      const tt = Array.isArray(t) ? t[0] : t;
      return { id: r.id, ign: r.ign_snapshot, status: r.status, title: (locale === 'ar' ? tt?.title_ar : tt?.title_en) ?? '', slug: tt?.slug ?? '' };
    });
  }

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6">
      {/* Player Summary Header */}
      <section className="flex flex-col justify-between gap-4 rounded-none border border-[#2b2d30] bg-[#151619] p-6 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-2xl font-extrabold text-[#f4f4ed] sm:text-3xl">
            {profile ? (locale === 'ar' ? `أهلاً ${profile.username}` : `Welcome ${profile.username}`) : dict.dashboard.title}
          </h1>
          <p className="mt-1 text-sm text-[#a4a6aa]">
            {user
              ? isOrganizer
                ? locale === 'ar'
                  ? 'حسابك مُسجَّل كمنظِّم للبطولات.'
                  : 'Your account is registered as a tournament organizer.'
                : dict.dashboard.subtitle
              : locale === 'ar'
                ? 'سجّل الدخول لعرض بطولاتك ونتائجك.'
                : 'Sign in to see your tournaments and results.'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {isOrganizer && (
            <Link
              href={`/${locale}/admin`}
              className="rounded-none border border-[#e5ed43] px-5 py-2.5 text-center text-sm font-extrabold text-[#e5ed43] hover:bg-[#e5ed43]/10"
            >
              {locale === 'ar' ? 'لوحة الإدارة' : 'Admin console'}
            </Link>
          )}
          <Link
            href={`/${locale}/tournaments`}
            className="rounded-none bg-[#e5ed43] px-5 py-2.5 text-center text-sm font-extrabold text-[#0d0e10] hover:bg-[#eef46b]"
          >
            {dict.dashboard.browseAction}
          </Link>
        </div>
      </section>

      <section>
        <SectionHeader title={dict.dashboard.myTournaments} />
        {mine.length === 0 ? (
          <div className="clip-card card-surface border border-[#2b2d30] p-6 text-sm text-[#a4a6aa]">
            {locale === 'ar' ? 'لسه مسجلتش في أي بطولة.' : 'You have not registered in any tournament yet.'}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {mine.map((r) => (
              <div key={r.id} className="clip-card card-surface card-hover border border-[#2b2d30] p-5">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <h3 className="text-lg font-extrabold text-[#f4f4ed]">{r.title}</h3>
                  <StatusBadge variant="open">{label(locale, r.status)}</StatusBadge>
                </div>
                <p className="mb-4 text-xs text-[#a4a6aa]">{r.ign}</p>
                <Link href={`/${locale}/tournaments/${r.slug}/play`} className="clip-btn btn-shine inline-block bg-[#e5ed43] px-5 py-2 text-sm font-extrabold text-[#121408]">
                  {locale === 'ar' ? 'افتح لوحتي' : 'Open my panel'}
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
