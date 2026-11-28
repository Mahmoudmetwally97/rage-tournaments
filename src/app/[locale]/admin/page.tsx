import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';

export default async function AdminHomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const user = await getCurrentUser();
  if (!user) redirect(`/${locale}/login`);

  const supabase = await getSupabaseServerClient();
  if (!supabase) redirect(`/${locale}`);

  const { data: roles } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  const isOrganizer = (roles ?? []).some((r) => r.role === 'super_admin' || r.role === 'moderator');
  if (!isOrganizer) redirect(`/${locale}/dashboard`);

  const { data: tournaments } = await supabase
    .from('tournaments')
    .select('id,slug,title_ar,title_en,status,max_participants')
    .order('created_at', { ascending: false });

  const { data: registrations } = await supabase.from('registrations').select('tournament_id');
  const counts = (registrations ?? []).reduce<Record<string, number>>((acc, r) => {
    acc[r.tournament_id] = (acc[r.tournament_id] ?? 0) + 1;
    return acc;
  }, {});

  const dict = dictionaries[locale];

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-2">{locale === 'ar' ? 'لوحة الإدارة' : 'ADMIN CONSOLE'}</p>
          <h1 className="text-3xl font-extrabold text-[#f4f4ed]">
            {locale === 'ar' ? 'بطولاتك' : 'Your tournaments'}
          </h1>
        </div>
        <span className="border border-[#2b2d30] px-3 py-1.5 text-[11px] font-bold tracking-[0.16em] text-[#a4a6aa] ltr-isolate">
          {user.email}
        </span>
      </div>

      <div className="space-y-3">
        {(tournaments ?? []).map((t) => (
          <article
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-4 border border-[#2b2d30] bg-[#151619] p-5"
          >
            <div>
              <h2 className="text-lg font-extrabold text-[#f4f4ed]">
                {locale === 'ar' ? t.title_ar : t.title_en}
              </h2>
              <p className="mt-1 text-xs text-[#a4a6aa]">
                {t.slug} • {t.status} • {counts[t.id] ?? 0}/{t.max_participants || '∞'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href={`/${locale}/tournaments/${t.slug}`}
                className="border border-[#2b2d30] px-4 py-2 text-xs font-bold text-[#f4f4ed] hover:border-[#3a3d40]"
              >
                {dict.nav.tournaments}
              </Link>
              <Link
                href={`/${locale}/admin/${t.slug}`}
                className="border border-[#e5ed43] bg-[#e5ed43] px-4 py-2 text-xs font-bold text-[#0d0e10]"
              >
                {locale === 'ar' ? 'إدارة' : 'Manage'}
              </Link>
            </div>
          </article>
        ))}
      </div>

    </div>
  );
}
