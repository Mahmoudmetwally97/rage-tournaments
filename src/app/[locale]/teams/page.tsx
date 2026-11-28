import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, PageHero, Pill, inputCls } from '@/components/admin/ui';
import { TeamLogo } from '@/components/tournaments/TeamLogo';
import { removeTeamLogo, saveTeamLogo, createTeamAction, teamInviteAction, teamRemoveAction, teamRespondAction } from '../admin/actions';

type Member = { user_id: string; invite_status: string; player_profiles: { username: string } | { username: string }[] | null };
const uname = (m: Member) => {
  const p = m.player_profiles;
  return (Array.isArray(p) ? p[0]?.username : p?.username) ?? '?';
};

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
          <Link className="font-bold text-[#e5ed43]" href={`/${locale}/login`}>{tr(locale, 'سجل دخول', 'Sign in')}</Link> {tr(locale, 'عشان تعمل تيم.', 'to manage your teams.')}
        </p>
      </div>
    );
  }
  const { data: game } = await supabase.from('games').select('id').order('created_at').limit(1).maybeSingle();
  const { data: mine } = await supabase.from('team_members').select('team_id,invite_status,teams(id,name,tag,captain_id,logo_url)').eq('user_id', user.id).neq('invite_status', 'declined');
  type T = { id: string; name: string; tag: string; captain_id: string; logo_url: string | null };
  const rows = (mine ?? []).map((r) => {
    const tm = r.teams as unknown as T | T[] | null;
    return { status: r.invite_status as string, team: Array.isArray(tm) ? tm[0]! : tm! };
  }).filter((r) => r.team);
  const invites = rows.filter((r) => r.status === 'pending');
  const teams = rows.filter((r) => r.status === 'accepted');
  const members: Record<string, Member[]> = {};
  for (const r of teams) {
    const { data } = await supabase.from('team_members').select('user_id,invite_status,player_profiles(username)').eq('team_id', r.team.id).order('joined_at');
    members[r.team.id] = (data ?? []) as unknown as Member[];
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <PageHero eyebrow={tr(locale, 'التيمات', 'TEAMS')} title={tr(locale, 'تيماتي', 'My teams')}>
        <span>{tr(locale, 'التيم 5 لاعبين أساسيين + 2 بدلاء. قائد التيم بيسجل ويعمل التشيك إن.', '5 starters + 2 subs. The team leader registers and checks in.')}</span>
      </PageHero>
      <Flash ok={sp.ok} err={sp.err} />

      {invites.length > 0 && (
        <Card title={tr(locale, 'دعوات ليك', 'Invites for you')}>
          <ul className="divide-y divide-[#2b2d30]">
            {invites.map((r) => (
              <li key={r.team.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <strong className="text-[#f4f4ed]">[{r.team.tag}] {r.team.name}</strong>
                <div className="flex gap-2">
                  <form action={teamRespondAction}><Hidden values={{ locale, team_id: r.team.id, accept: '1' }} /><Btn tone="primary">{tr(locale, 'قبول', 'Accept')}</Btn></form>
                  <form action={teamRespondAction}><Hidden values={{ locale, team_id: r.team.id, accept: '0' }} /><Btn tone="danger">{tr(locale, 'رفض', 'Decline')}</Btn></form>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {teams.map((r) => {
        const isCap = r.team.captain_id === user.id;
        const ms = members[r.team.id] ?? [];
        const accepted = ms.filter((m) => m.invite_status === 'accepted').length;
        return (
          <Card key={r.team.id} title={`[${r.team.tag}] ${r.team.name}`} right={<Pill on={accepted >= 5}>{accepted}/7 {tr(locale, 'لاعبين', 'players')}</Pill>}>
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <TeamLogo src={r.team.logo_url} tag={r.team.tag} size={56} />
              {isCap ? (
                <>
                  <form action={saveTeamLogo} className="flex flex-wrap items-center gap-2">
                    <Hidden values={{ locale, team_id: r.team.id }} />
                    <input name="logo" type="file" required accept="image/png,image/jpeg,image/webp" className="max-w-[14rem] text-xs text-[#a8abb0] file:me-2 file:border-0 file:bg-[#2b2d30] file:px-3 file:py-1.5 file:text-[#f4f4ed]" />
                    <Btn tone="primary">{r.team.logo_url ? tr(locale, 'غيّر اللوجو', 'Change logo') : tr(locale, 'ارفع لوجو', 'Upload logo')}</Btn>
                  </form>
                  {r.team.logo_url && <form action={removeTeamLogo}><Hidden values={{ locale, team_id: r.team.id }} /><Btn tone="danger">{tr(locale, 'شيل اللوجو', 'Remove logo')}</Btn></form>}
                  <span className="text-[11px] text-[#6f7276]">{tr(locale, 'JPG / PNG / WebP، لحد 2 ميجا', 'JPG / PNG / WebP, up to 2 MB')}</span>
                </>
              ) : null}
            </div>
            <ul className="divide-y divide-[#2b2d30]">
              {ms.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                  <span className="text-[#f4f4ed]">
                    {uname(m)} {m.user_id === r.team.captain_id && <Pill on>{tr(locale, 'القائد', 'Leader')}</Pill>}{' '}
                    {m.invite_status === 'pending' && <Pill>{tr(locale, 'دعوة معلقة', 'Invite pending')}</Pill>}
                  </span>
                  {isCap && m.user_id !== user.id && (
                    <form action={teamRemoveAction}><Hidden values={{ locale, team_id: r.team.id, user_id: m.user_id }} /><Btn tone="danger">{tr(locale, 'إزالة', 'Remove')}</Btn></form>
                  )}
                </li>
              ))}
            </ul>
            {isCap && (
              <form action={teamInviteAction} className="mt-3 flex flex-wrap gap-2">
                <Hidden values={{ locale, team_id: r.team.id }} />
                <input name="username" required dir="ltr" autoComplete="off" placeholder={tr(locale, 'يوزر اللاعب على الموقع (مثال: maxx_cf)', 'Player username on the site (e.g. maxx_cf)')} className={`${inputCls} w-full max-w-xs`} />
                <Btn tone="primary">{tr(locale, 'ادعُ لاعب', 'Invite player')}</Btn>
              </form>
            )}
            {isCap && accepted < 5 && <p className="mt-2 text-[11px] text-[#6f7276]">{tr(locale, 'محتاج 5 لاعبين قبلوا الدعوة عشان تسجل في بطولة.', 'You need 5 accepted players to register for a tournament.')}</p>}
          </Card>
        );
      })}

      <Card title={tr(locale, 'اعمل تيم جديد', 'Create a team')}>
        <form action={createTeamAction} className="flex flex-wrap gap-2">
          <Hidden values={{ locale, game_id: (game?.id as string) ?? '' }} />
          <input name="name" required minLength={2} autoComplete="off" placeholder={tr(locale, 'اسم التيم', 'Team name')} className={`${inputCls} w-full max-w-xs`} />
          <input name="tag" required minLength={2} maxLength={5} autoComplete="off" dir="ltr" placeholder={tr(locale, 'التاج (2-5 حروف)', 'Tag (2-5 letters)')} className={`${inputCls} w-full max-w-[10rem]`} />
          <Btn tone="primary">{tr(locale, 'إنشاء التيم', 'Create team')}</Btn>
        </form>
      </Card>
    </div>
  );
}
