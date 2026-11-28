import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, PageHero } from '@/components/admin/ui';
import { TeamCard, type TeamCardData } from '@/components/profile/TeamCard';
import { teamRespondAction } from '../admin/actions';

export const dynamic = 'force-dynamic';

export default async function TeamsPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l } = await params;
  const sp = await searchParams;
  if (!isValidLocale(l)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="text-sm text-[#a4a6aa]">
          <Link className="font-bold text-[#e5ed43]" href={`/${locale}/login`}>{tr(locale, 'سجل دخول', 'Sign in')}</Link> {tr(locale, 'عشان تشوف تيماتك.', 'to see your teams.')}
        </p>
      </div>
    );
  }
  const { data: cards } = await supabase.rpc('profile_teams', { p_user: user.id });
  const teams = (cards ?? []) as TeamCardData[];
  const { data: pend } = await supabase.from('team_members').select('team_id,teams(id,name,tag)').eq('user_id', user.id).eq('invite_status', 'pending');
  type P = { id: string; name: string; tag: string };
  const invites = (pend ?? []).map((r) => {
    const x = r.teams as unknown as P | P[] | null;
    return Array.isArray(x) ? x[0]! : x!;
  }).filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHero eyebrow={tr(locale, 'التيمات', 'TEAMS')} title={tr(locale, 'تيماتي', 'My teams')} compact>
        <span>{tr(locale, 'التيم 5 لاعبين أساسيين + 2 بدلاء. قائد التيم بيسجل ويعمل التشيك إن.', '5 starters + 2 subs. The team leader registers and checks in.')}</span>
      </PageHero>
      <Flash ok={sp.ok} err={sp.err} />

      {invites.length > 0 && (
        <Card title={tr(locale, 'دعوات ليك', 'Invites for you')}>
          <ul className="divide-y divide-[#2b2d30]">
            {invites.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <strong className="text-[#f4f4ed]">[{t.tag}] {t.name}</strong>
                <div className="flex gap-2">
                  <form action={teamRespondAction}><Hidden values={{ locale, team_id: t.id, accept: '1' }} /><Btn tone="primary">{tr(locale, 'قبول', 'Accept')}</Btn></form>
                  <form action={teamRespondAction}><Hidden values={{ locale, team_id: t.id, accept: '0' }} /><Btn tone="danger">{tr(locale, 'رفض', 'Decline')}</Btn></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-[#a4a6aa]"><span className="text-[#f4f4ed]">{teams.length}</span> {tr(locale, 'تيم', teams.length === 1 ? 'team' : 'teams')}</p>
        <Link href={`/${locale}/teams/create`} className="clip-btn bg-[#e5ed43] px-4 py-2 text-sm font-extrabold text-[#0d0e10] hover:bg-[#eef46b]">+ {tr(locale, 'إنشاء تيم', 'Create team')}</Link>
      </div>

      {teams.length === 0 ? (
        <Card><p className="text-sm text-[#a4a6aa]">{tr(locale, 'لسه معندكش تيم. اعمل واحد أو استنى دعوة من قائد تيم.', 'You have no team yet. Create one or wait for an invite from a team leader.')}</p></Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {teams.map((t) => <TeamCard key={t.id} t={t} locale={locale} />)}
        </div>
      )}
    </div>
  );
}
