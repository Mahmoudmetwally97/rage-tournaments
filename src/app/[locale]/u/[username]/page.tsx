import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { label } from '@/lib/labels';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Pill } from '@/components/admin/ui';
import { TeamLogo } from '@/components/tournaments/TeamLogo';
import { TeamCard, type TeamCardData } from '@/components/profile/TeamCard';
import { countryName, flag } from '@/lib/countries';

export const dynamic = 'force-dynamic';

type Prof = { id: string; username: string; country: string | null; bio: string | null; avatar_url: string | null; cover_url: string | null; created_at: string };
type Tour = { slug: string; title_en: string; title_ar: string; cover_image_url: string | null; t_status: string; starts_at: string | null; competition_type: string; reg_status: string; reg_name: string };
type Match = { match_id: string; slug: string; title_en: string; title_ar: string; round_number: number; match_number: number; m_status: string; scheduled_at: string | null; reg_name: string; score_a: number | null; score_b: number | null; my_slot: number };

const UPCOMING = ['published', 'registration_open', 'registration_closed', 'check_in', 'ready'];
const FINISHED = ['completed', 'archived'];
const bucket = (st: string) => (st === 'live' ? 'live' : FINISHED.includes(st) ? 'finished' : UPCOMING.includes(st) ? 'upcoming' : 'other');

export default async function ProfilePage({ params, searchParams }: { params: Promise<{ locale: string; username: string }>; searchParams: Promise<{ tab?: string; f?: string }> }) {
  const { locale: l, username } = await params;
  const sp = await searchParams;
  if (!isValidLocale(l)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  if (!supabase) notFound();
  const me = await getCurrentUser();
  const { data: pd } = await supabase.rpc('public_profile', { p_username: decodeURIComponent(username) });
  const p = (pd as Prof[] | null)?.[0];
  if (!p) notFound();
  const own = me?.id === p.id;
  const tab = sp.tab === 'teams' ? 'teams' : 'esports';
  const f = ['upcoming', 'live', 'finished'].includes(sp.f ?? '') ? (sp.f as string) : 'all';

  const [{ data: td }, { data: md }, { data: cd }] = await Promise.all([
    supabase.rpc('profile_tournaments', { p_user: p.id }),
    supabase.rpc('profile_matches', { p_user: p.id }),
    supabase.rpc('profile_teams', { p_user: p.id })
  ]);
  const tours = (td ?? []) as Tour[];
  const matches = (md ?? []) as Match[];
  const teams = (cd ?? []) as TeamCardData[];
  const base = `/${locale}/u/${p.username}`;
  const joined = new Date(p.created_at).toLocaleDateString(locale === 'ar' ? 'ar-EG' : 'en-US', { month: 'long', year: 'numeric' });
  const shown = tours.filter((t) => f === 'all' || bucket(t.t_status) === f);
  const upcomingMatches = matches.filter((m) => m.m_status === 'scheduled' || m.m_status === 'live');
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo', dateStyle: 'medium', timeStyle: 'short' }) : tr(locale, 'الموعد لسه', 'TBD'));

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <section className="clip-card overflow-hidden border border-[#2b2d30] bg-[#101113]">
        <div className="relative h-32 bg-[#16171a] sm:h-44">
          {p.cover_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover_url} alt="" className="h-full w-full object-cover" />
          ) : <div className="h-full w-full bg-[linear-gradient(135deg,#16171a,#1d1f12)]" />}
          <div className="absolute inset-0 bg-gradient-to-t from-[#101113] to-transparent" />
        </div>
        <div className="relative -mt-10 flex flex-wrap items-end gap-4 px-5 pb-5">
          <div className="rounded-sm border-4 border-[#101113] bg-[#101113]"><TeamLogo src={p.avatar_url} tag={p.username} size={88} /></div>
          <div className="min-w-0 flex-1 pb-1">
            <h1 className="truncate text-2xl font-extrabold normal-case text-[#f4f4ed] sm:text-3xl">{p.username} {flag(p.country)}</h1>
            <p className="mt-1 text-xs font-bold text-[#a4a6aa]">{p.country ? `${countryName(p.country, locale)} · ` : ''}{tr(locale, 'انضم', 'Joined')} {joined}</p>
          </div>
          {own && <Link href={`/${locale}/settings`} className="clip-btn bg-[#e5ed43] px-4 py-2 text-sm font-extrabold text-[#0d0e10] hover:bg-[#eef46b]">{tr(locale, 'إعدادات الحساب', 'Account settings')}</Link>}
        </div>
        {p.bio && <p className="whitespace-pre-line border-t border-[#2b2d30] px-5 py-4 text-sm text-[#d6d7d2]">{p.bio}</p>}
      </section>

      <nav className="flex gap-2">
        {([['esports', tr(locale, 'الإي سبورتس', 'Esports')], ['teams', tr(locale, 'التيمات', 'Teams')]] as const).map(([k, name]) => (
          <Link key={k} href={`${base}?tab=${k}`} className={`clip-chip px-4 py-2 text-sm font-extrabold ${tab === k ? 'bg-[#e5ed43] text-[#0d0e10]' : 'bg-[#151619] text-[#a4a6aa] hover:text-[#f4f4ed]'}`}>{name}</Link>
        ))}
      </nav>

      {tab === 'teams' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-bold text-[#a4a6aa]"><span className="text-[#f4f4ed]">{teams.length}</span> {tr(locale, 'تيم', teams.length === 1 ? 'team' : 'teams')}</p>
            {own && <Link href={`/${locale}/teams/create`} className="clip-btn bg-[#e5ed43] px-4 py-2 text-sm font-extrabold text-[#0d0e10]">+ {tr(locale, 'إنشاء تيم', 'Create team')}</Link>}
          </div>
          {teams.length === 0 ? <p className="text-sm text-[#a4a6aa]">{tr(locale, 'مفيش تيمات لسه.', 'No teams yet.')}</p> : (
            <div className="grid gap-4 sm:grid-cols-2">{teams.map((t) => <TeamCard key={t.id} t={t} locale={locale} />)}</div>
          )}
        </section>
      ) : (
        <section className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {([[tours.length, tr(locale, 'بطولات', 'Tournaments')], [matches.length, tr(locale, 'ماتشات', 'Matches')], [teams.length, tr(locale, 'تيمات', 'Teams')]] as const).map(([n, name]) => (
              <div key={name} className="border-s-2 border-[#e5ed43] bg-[#101113] px-4 py-3"><p className="text-2xl font-extrabold text-[#f4f4ed]">{n}</p><p className="text-[11px] font-bold uppercase tracking-wider text-[#a4a6aa]">{name}</p></div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="me-2 text-lg font-extrabold text-[#f4f4ed]">{tr(locale, 'البطولات اللي اشترك فيها', 'Joined tournaments')}</h2>
              {(['all', 'upcoming', 'live', 'finished'] as const).map((k) => (
                <Link key={k} href={`${base}?tab=esports&f=${k}`}><Pill on={f === k}>{k === 'upcoming' ? tr(locale, 'قادمة', 'Upcoming') : k === 'finished' ? tr(locale, 'منتهية', 'Finished') : k === 'live' ? tr(locale, 'مباشرة', 'Live') : label(locale, 'all')}</Pill></Link>
              ))}
            </div>
            {shown.length === 0 ? <p className="text-sm text-[#a4a6aa]">{tr(locale, 'مفيش بطولات هنا.', 'No tournaments here.')}</p> : (
              <ul className="space-y-2">
                {shown.map((t) => (
                  <li key={t.slug} className="flex items-center gap-3 border border-[#2b2d30] bg-[#101113] p-3">
                    {t.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.cover_image_url} alt="" className="h-14 w-20 shrink-0 object-cover" />
                    ) : <div className="h-14 w-20 shrink-0 bg-[#16171a]" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-[#f4f4ed]">{locale === 'ar' ? t.title_ar : t.title_en}</p>
                      <p className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-[#a4a6aa]"><Pill on={t.t_status === 'live'}>{label(locale, t.t_status)}</Pill><span>{when(t.starts_at)}</span>{own && <Pill>{label(locale, t.reg_status)}</Pill>}</p>
                    </div>
                    <Link href={`/${locale}/tournaments/${t.slug}`} className="clip-btn shrink-0 bg-[#23252a] px-3 py-2 text-xs font-extrabold text-[#f4f4ed] hover:bg-[#2d3036]">{tr(locale, 'عرض', 'View')} →</Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="mb-3 text-lg font-extrabold text-[#f4f4ed]">{tr(locale, 'الماتشات', 'Matches')}</h2>
            {matches.length === 0 ? <p className="text-sm text-[#a4a6aa]">{tr(locale, 'مفيش ماتشات. أول ما يتسجل في بطولة هتظهر هنا.', 'No matches yet. They show up here once a bracket is joined.')}</p> : (
              <ul className="space-y-2">
                {[...upcomingMatches, ...matches.filter((m) => !upcomingMatches.includes(m))].map((m) => (
                  <li key={m.match_id} className="flex flex-wrap items-center justify-between gap-2 border border-[#2b2d30] bg-[#101113] p-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-[#f4f4ed]">{locale === 'ar' ? m.title_ar : m.title_en}</p>
                      <p className="text-[11px] text-[#a4a6aa]">{tr(locale, 'جولة', 'Round')} {m.round_number} · {tr(locale, 'ماتش', 'Match')} {m.match_number} · {m.reg_name} · {when(m.scheduled_at)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {m.score_a !== null && m.score_b !== null && <span className="ltr-isolate text-xs font-extrabold text-[#f4f4ed]">{m.score_a} - {m.score_b}</span>}
                      <Pill on={m.m_status === 'live'}>{label(locale, m.m_status)}</Pill>
                      <Link href={`/${locale}/tournaments/${m.slug}`} className="text-xs font-bold text-[#e5ed43] hover:underline">{tr(locale, 'عرض', 'View')}</Link>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
