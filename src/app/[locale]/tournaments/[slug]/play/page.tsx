import { formatStartDate } from '@/lib/format';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { label, rewardText } from '@/lib/labels';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, PageHero, Pill, inputCls } from '@/components/admin/ui';
import { playerCancel, playerCheckIn, playerClaim, playerIssue, playerRegister, playerRegisterTeam } from '../../../admin/actions';
import { loadBracket } from '@/lib/bracket';
import { TeamBracket } from '@/components/tournaments/TeamBracket';
import { MyPath, type PathStep } from '@/components/tournaments/MyPath';

export default async function PlayPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  if (!isValidLocale(l)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  if (!supabase) notFound();
  const user = await getCurrentUser();
  const { data: t } = await supabase.from('tournaments').select('*').eq('slug', slug).maybeSingle();
  if (!t) notFound();
  const tid = t.id as string;

  const [{ data: stand }, { data: pools }, { data: bonuses }, { count }] = await Promise.all([
    supabase.from('tournament_standings').select('*').eq('tournament_id', tid).order('rank').limit(50),
    supabase.from('prize_pools').select('id,rank_from,rank_to,label_ar,label_en,prize_rewards(kind,amount,currency,text_ar,text_en,is_placeholder)').eq('tournament_id', tid).order('rank_from'),
    supabase.from('tournament_bonuses').select('*').eq('tournament_id', tid),
    supabase.from('registrations').select('id', { count: 'exact', head: true }).eq('tournament_id', tid).in('status', ['pending', 'confirmed', 'checked_in'])
  ]);

  const isTeam = t.competition_type === 'team';
  let myTeams: { id: string; name: string; tag: string }[] = [];
  let mine: { id: string; status: string; ign_snapshot: string; registration_code: string } | null = null;
  let myClaim: { status: string } | null = null;
  let myIssues: { id: string; subject: string; status: string; staff_reply: string | null }[] = [];
  if (user) {
    if (isTeam) {
      const { data: rm } = await supabase.from('registration_roster_members').select('registration_id').eq('tournament_id', tid).eq('user_id', user.id);
      const rid = (rm ?? [])[0]?.registration_id;
      const { data: reg } = rid
        ? await supabase.from('registrations').select('id,status,ign_snapshot,registration_code').eq('id', rid).not('status', 'in', '(cancelled,rejected)').maybeSingle()
        : { data: null };
      mine = reg;
      const { data: ct } = await supabase.from('teams').select('id,name,tag').eq('captain_id', user.id).eq('game_id', t.game_id);
      myTeams = ct ?? [];
    } else {
    const { data: reg } = await supabase
      .from('registrations')
      .select('id,status,ign_snapshot,registration_code')
      .eq('tournament_id', tid)
      .eq('user_id', user.id)
      .not('status', 'in', '(cancelled)')
      .maybeSingle();
    mine = reg;
    }
    const { data: c } = await supabase.from('prize_claims').select('status').eq('tournament_id', tid).eq('user_id', user.id).maybeSingle();
    myClaim = c;
    const { data: iss } = await supabase.from('tournament_issues').select('id,subject,status,staff_reply').eq('tournament_id', tid).eq('user_id', user.id);
    myIssues = iss ?? [];
  }
  const bracket = isTeam ? await loadBracket(supabase, tid) : null;
  const isCaptain = isTeam && !!user && !!mine && myTeams.some((x) => mine!.ign_snapshot === `${x.tag} ${x.name}`);
  const myRank = mine ? (stand ?? []).find((r) => r.registration_id === mine!.id)?.rank : undefined;
  const finished = t.status === 'completed' || t.status === 'archived';
  // My Path (solo): built from the player's own registration, room assignment and results
  let pathSteps: PathStep[] | null = null;
  let pathAction: { href: string; label: string } | null = null;
  if (mine && !isTeam && ['pending', 'confirmed', 'checked_in'].includes(mine.status)) {
    const [{ data: mps }, { data: myRes }, { data: allStages }] = await Promise.all([
      supabase.from('match_participants').select('matches(status,round_number,scheduled_at,groups(name),stages(stage_order,name_en,name_ar,qualify_count))').eq('registration_id', mine.id),
      supabase.from('match_results').select('placement,kills,points_awarded,matches(stages(stage_order))').eq('registration_id', mine.id).eq('is_current', true).eq('approval_status', 'approved'),
      supabase.from('stages').select('stage_order,name_en,name_ar,qualify_count').eq('tournament_id', tid).order('stage_order')
    ]);
    type M = { status: string; round_number: number; scheduled_at: string | null; groups: { name: string } | { name: string }[] | null; stages: { stage_order: number; name_en: string; name_ar: string; qualify_count: number } | { stage_order: number; name_en: string; name_ar: string; qualify_count: number }[] | null };
    const one = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v);
    const ms = ((mps ?? []) as unknown as { matches: M | M[] | null }[]).map((x) => one(x.matches)).filter((x): x is M => !!x)
      .sort((a, b) => (one(a.stages)?.stage_order ?? 0) - (one(b.stages)?.stage_order ?? 0) || a.round_number - b.round_number);
    const cur = ms[ms.length - 1] ?? null;
    const curStage = cur ? one(cur.stages) : null;
    const curRoom = cur ? one(cur.groups)?.name : null;
    const stageCount = (allStages ?? []).length;
    const sName = (s: { name_en: string; name_ar: string } | null) => (s ? (locale === 'ar' ? s.name_ar : s.name_en) : '');
    const resRows = (myRes ?? []) as unknown as { placement: number | null; kills: number; points_awarded: number }[];
    const last = resRows[resRows.length - 1];
    const approved = ['confirmed', 'checked_in'].includes(mine.status);
    const checked = mine.status === 'checked_in';
    const inRoom = !!cur;
    const matchDone = cur?.status === 'completed';
    const qualified = (curStage?.stage_order ?? 1) > 1;
    const startsTxt = (cur?.scheduled_at ?? t.starts_at) ? formatStartDate((cur?.scheduled_at ?? t.starts_at) as string, locale) : tr(locale, 'الموعد قيد التحديد', 'Date to be announced');
    const defs: { key: string; title: string; desc: string; done: boolean }[] = [
      { key: 'registered', title: tr(locale, 'اتسجلت', 'Registered'), desc: mine.ign_snapshot, done: true },
      { key: 'approved', title: tr(locale, 'اتقبلت', 'Approved'), desc: approved ? tr(locale, 'المنظم قبل تسجيلك', 'The organizer accepted your entry') : tr(locale, 'بانتظار موافقة المنظم', 'Waiting for organizer approval'), done: approved },
      { key: 'checkin', title: tr(locale, 'تشيك إن', 'Check in'), desc: checked ? tr(locale, 'جاهز للعب', 'You are ready to play') : tr(locale, 'أكّد حضورك قبل البداية', 'Confirm before kickoff'), done: checked },
      { key: 'room', title: inRoom ? `${sName(curStage)} · ${curRoom ?? ''}` : tr(locale, 'الغرفة والراوند', 'Room and round'), desc: inRoom ? `${tr(locale, 'راوند', 'Round')} ${cur?.round_number} · ${startsTxt}` : tr(locale, 'بتتحدد لما المراحل تتوزع', 'Assigned when the stage is seeded'), done: inRoom && !!matchDone },
      { key: 'result', title: tr(locale, 'نتيجتك', 'Your result'), desc: last ? tr(locale, `المركز ${last.placement ?? '-'} · ${last.kills} كيل · ${Number(last.points_awarded)} نقطة`, `Place ${last.placement ?? '-'} · ${last.kills} kills · ${Number(last.points_awarded)} pts`) : tr(locale, 'بتظهر بعد تسجيل الراوند', 'Appears once the round is scored'), done: !!last },
      stageCount > 1
        ? { key: 'advance', title: tr(locale, 'التأهل', 'Qualify'), desc: qualified ? tr(locale, `تأهلت إلى ${sName(curStage)}`, `You qualified for ${sName(curStage)}`) : tr(locale, 'اللي يتأهل بيكمل للمرحلة الجاية', 'Top players move on to the next stage'), done: qualified }
        : { key: 'finish', title: tr(locale, 'الترتيب النهائي', 'Final standing'), desc: finished && myRank ? tr(locale, `خلصت في المركز ${myRank}`, `You finished #${myRank}`) : tr(locale, 'بيظهر لما البطولة تخلص', 'Shown when the tournament ends'), done: finished && !!myRank }
    ];
    let nowSet = false;
    pathSteps = defs.map((d) => { if (d.done) return { key: d.key, title: d.title, desc: d.desc, state: 'done' as const }; if (!nowSet) { nowSet = true; return { key: d.key, title: d.title, desc: d.desc, state: 'now' as const }; } return { key: d.key, title: d.title, desc: d.desc, state: 'todo' as const }; });
    const nowKey = pathSteps.find((s) => s.state === 'now')?.key;
    if (nowKey === 'checkin' || nowKey === 'approved') pathAction = { href: '#my-entry', label: tr(locale, 'روح لمشاركتي', 'Go to my entry') };
  }
  const sections = (t.rules_sections ?? []) as { title_ar: string; title_en: string; body_ar: string; body_en: string }[];
  const STATUS_TXT: Record<string, [string, string]> = {
    pending: ['بانتظار موافقة المنظم', 'Waiting for organizer approval'],
    confirmed: ['تم قبولك', 'Accepted'],
    checked_in: ['عملت تشيك إن', 'Checked in'],
    waitlisted: ['في قايمة الانتظار', 'On the waitlist'],
    rejected: ['تم رفض التسجيل', 'Rejected'],
    disqualified: ['تم استبعادك', 'Disqualified']
  };
  const base = `/${locale}/tournaments/${slug}`;
  const hid = { locale, slug, tid };

  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 py-8 sm:px-6">
      <Link href={base} className="inline-block text-xs font-bold text-[#a4a6aa] hover:text-[#e5ed43]">← {tr(locale, 'صفحة البطولة', 'Tournament page')}</Link>
      <PageHero eyebrow={tr(locale, 'منطقة المشاركة', 'PLAYER ZONE')} title={locale === 'ar' ? t.title_ar : t.title_en}>
        <Pill on>{label(locale, t.status)}</Pill>
        <span className="ltr-isolate">{count ?? 0}/{t.max_participants || '∞'}</span>
        <span>{t.starts_at ? formatStartDate(t.starts_at, locale) : tr(locale, 'الموعد قيد التحديد', 'Date TBD')}</span>
      </PageHero>
      <Flash ok={sp.ok} err={sp.err} />

      {pathSteps && <MyPath steps={pathSteps} startsAt={t.starts_at} ar={locale === 'ar'} action={pathAction} />}
      <div id="my-entry" />
      <Card title={tr(locale, 'مشاركتي', 'My entry')}>
        {!user ? (
          <p className="text-sm text-[#a4a6aa]">
            <Link className="font-bold text-[#e5ed43]" href={`/${locale}/login`}>{tr(locale, 'سجل دخول', 'Sign in')}</Link>{' '}
            {tr(locale, 'عشان تسجل في البطولة.', 'to join this tournament.')}
          </p>
        ) : mine ? (
          <div className="space-y-3">
            <p className="text-sm text-[#f4f4ed]">
              <strong>{mine.ign_snapshot}</strong> <Pill on={mine.status === 'checked_in' || mine.status === 'confirmed'}>{tr(locale, ...(STATUS_TXT[mine.status] ?? [mine.status, mine.status]))}</Pill>
              <span className="ms-2 text-xs text-[#6f7276] ltr-isolate">{mine.registration_code}</span>
            </p>
            <div className="flex flex-wrap gap-2">
              {(t.status === 'check_in' || (t.starts_at && ['registration_open','registration_closed','ready'].includes(t.status) && Date.now() >= new Date(t.starts_at).getTime() - 40 * 60000 && Date.now() < new Date(t.starts_at).getTime() + 6 * 3600000)) && mine.status === 'confirmed' && (!isTeam || isCaptain) && (
                <form action={playerCheckIn}><Hidden values={hid} /><Btn tone="primary">{tr(locale, 'تشيك إن', 'Check in')}</Btn></form>
              )}
              {!isTeam && !['live', 'completed', 'archived'].includes(t.status) && ['pending', 'confirmed', 'checked_in', 'waitlisted'].includes(mine.status) && (
                <form action={playerCancel}><Hidden values={hid} /><Btn tone="danger">{tr(locale, 'إلغاء التسجيل', 'Cancel registration')}</Btn></form>
              )}
            </div>
            {myRank && <p className="text-sm text-[#e5ed43]">{tr(locale, `ترتيبك: ${myRank}`, `Your rank: ${myRank}`)}</p>}
            {myRank && (
              <div className="flex flex-wrap items-center gap-2 border-t border-[#2b2d30] pt-3">
                <span className="text-xs font-bold text-[#a4a6aa]">{tr(locale, 'كارت نتيجتك للمشاركة:', 'Your result card:')}</span>
                <a className="border border-[#e5ed43] px-3 py-1.5 text-xs font-bold text-[#e5ed43]" href={`/api/card?t=${slug}&r=${mine.id}&size=story&dl=1`}>{tr(locale, 'ستوري', 'Story')}</a>
                <a className="border border-[#e5ed43] px-3 py-1.5 text-xs font-bold text-[#e5ed43]" href={`/api/card?t=${slug}&r=${mine.id}&size=square&dl=1`}>{tr(locale, 'مربع', 'Square')}</a>
                <a className="text-xs text-[#a4a6aa] underline" target="_blank" rel="noreferrer" href={`/api/card?t=${slug}&r=${mine.id}&size=story`}>{tr(locale, 'معاينة', 'Preview')}</a>
              </div>
            )}
          </div>
        ) : isTeam && t.status === 'registration_open' ? (
          myTeams.length > 0 ? (
            <form action={playerRegisterTeam} className="flex flex-wrap gap-2">
              <Hidden values={hid} />
              <select name="team_id" required className={`${inputCls} w-full max-w-xs`}>
                {myTeams.map((x) => (<option key={x.id} value={x.id}>[{x.tag}] {x.name}</option>))}
              </select>
              <Btn tone="primary">{tr(locale, 'سجل التيم', 'Register team')}</Btn>
              <p className="w-full text-[11px] text-[#6f7276]">{tr(locale, 'التشكيلة (القائد + اللاعبين اللي قبلوا الدعوة) بتتقفل بعد التسجيل.', 'The roster (leader + accepted players) locks once you register.')}</p>
            </form>
          ) : (
            <p className="text-sm text-[#a4a6aa]">
              {tr(locale, 'قائد التيم بس هو اللي بيسجل. ', 'Only a team leader can register. ')}
              <Link className="font-bold text-[#e5ed43]" href={`/${locale}/teams`}>{tr(locale, 'اعمل تيم أو شوف تيمك', 'Create or view your team')}</Link>
            </p>
          )
        ) : t.status === 'registration_open' ? (
          <form action={playerRegister} className="flex flex-wrap gap-2">
            <Hidden values={hid} />
            <input name="ign" required minLength={2} autoComplete="off" placeholder={tr(locale, 'اسمك في اللعبة (IGN)', 'In-game name (IGN)')} className={`${inputCls} w-full max-w-xs`} />
            <input name="email" type="email" required autoComplete="email" dir="ltr" placeholder={tr(locale, 'Gmail بتاعك', 'Your Gmail')} className={`${inputCls} w-full max-w-xs`} />
            <Btn tone="primary">{tr(locale, 'سجل في البطولة', 'Join tournament')}</Btn>
          </form>
        ) : (
          <p className="text-sm text-[#a4a6aa]">{tr(locale, 'التسجيل غير مفتوح حالياً.', 'Registration is not open right now.')}</p>
        )}
        <div className="mt-4 flex flex-wrap gap-2">
          {t.contact_url && (
            <a href={t.contact_url} target="_blank" rel="noreferrer" className="clip-chip inline-block border border-[#2b2d30] px-3 py-1.5 text-xs font-bold text-[#f4f4ed] hover:border-[#e5ed43]">
              {t.contact_label || tr(locale, 'تواصل مع المنظمين', 'Contact organizers')}
            </a>
          )}
          <a href="https://facebook.com/rageegcf" target="_blank" rel="noreferrer" className="clip-chip inline-block border border-[#2b2d30] px-3 py-1.5 text-xs font-bold text-[#f4f4ed] hover:border-[#e5ed43]">
            Facebook
          </a>
        </div>
      </Card>

      {isTeam && bracket && (
        <Card title={tr(locale, 'البراكت', 'Bracket')}>
          <TeamBracket rounds={bracket.rounds} ar={locale === 'ar'} />
        </Card>
      )}

      {!isTeam && (<Card title={tr(locale, 'الترتيب', 'Standings')}>
        {(stand ?? []).length === 0 ? (
          <p className="text-sm text-[#a4a6aa]">{tr(locale, 'لا توجد نتائج بعد.', 'No results yet.')}</p>
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="text-[11px] text-[#6f7276]"><th className="py-1 text-start">#</th><th className="text-start">{tr(locale, 'اللاعب', 'Player')}</th><th>{tr(locale, 'كيلز', 'Kills')}</th><th>{tr(locale, 'نقاط', 'Pts')}</th></tr></thead>
            <tbody>
              {(stand ?? []).map((r) => (
                <tr key={r.registration_id} className={`border-t border-[#2b2d30] text-center ${r.rank <= 3 ? `row-top${r.rank}` : ""}`}>
                  <td className="py-2 text-start font-bold text-[#e5ed43]">{r.rank <= 3 ? ['🥇', '🥈', '🥉'][r.rank - 1] : r.rank}</td>
                  <td className="text-start text-[#f4f4ed]">{r.ign}</td>
                  <td className="text-[#a4a6aa]">{r.total_kills}</td>
                  <td className="font-bold text-[#f4f4ed]">{Number(r.total_points)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>)}

      <div className="grid gap-6 md:grid-cols-2">
        <Card title={tr(locale, 'الجوائز', 'Prizes')}>
          <ul className="space-y-2 text-sm">
            {(pools ?? []).map((p) => (
              <li key={p.id}>
                <span className="font-bold text-[#f4f4ed]">{locale === 'ar' ? p.label_ar : p.label_en}</span>
                {(p.prize_rewards as any[]).map((r, i) => (
                  <span key={i} className="block text-[#a4a6aa]">
                    {rewardText(r, locale)}
                  </span>
                ))}
              </li>
            ))}
            {(bonuses ?? []).map((b) => (
              <li key={b.id} className="text-[#a4a6aa]">+ {locale === 'ar' ? b.title_ar : b.title_en}{b.amount != null && ` (${rewardText(b, locale)})`}</li>
            ))}
          </ul>
        </Card>
        <Card title={tr(locale, 'القواعد', 'Rules')}>
          <div className="space-y-3 text-sm">
            {sections.map((s, i) => (
              <div key={i}>
                <h3 className="font-bold text-[#f4f4ed]">{locale === 'ar' ? s.title_ar : s.title_en}</h3>
                <p className="text-[#a4a6aa]">{locale === 'ar' ? s.body_ar : s.body_en}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {user && mine && finished && (
        <Card title={tr(locale, 'استلام الجائزة', 'Claim prize')}>
          {myClaim ? (
            <p className="text-sm text-[#e5ed43]">{tr(locale, 'حالة المطالبة', 'Claim status')}: {label(locale, myClaim.status)}</p>
          ) : (
            <form action={playerClaim} className="flex flex-wrap gap-2">
              <Hidden values={hid} />
              <input name="contact" required placeholder={tr(locale, 'وسيلة استلام الجائزة (رقم/محفظة/ديسكورد)', 'Payout contact (number/wallet/Discord)')} className={`${inputCls} max-w-md`} />
              <Btn tone="primary">{tr(locale, 'اطلب الجائزة', 'Claim')}</Btn>
            </form>
          )}
        </Card>
      )}

      {user && (
        <Card title={tr(locale, 'عندك مشكلة؟', 'Report an issue')}>
          <form action={playerIssue} className="space-y-2">
            <Hidden values={hid} />
            <input name="subject" required placeholder={tr(locale, 'العنوان', 'Subject')} className={inputCls} />
            <textarea name="body" required rows={3} placeholder={tr(locale, 'التفاصيل', 'Details')} className={inputCls} />
            <Btn>{tr(locale, 'إرسال', 'Send')}</Btn>
          </form>
          {myIssues.length > 0 && (
            <ul className="mt-4 space-y-2 text-sm">
              {myIssues.map((i) => (
                <li key={i.id} className="border border-[#2b2d30] p-2 text-[#a4a6aa]">
                  <strong className="text-[#f4f4ed]">{i.subject}</strong> <Pill on={i.status === 'resolved'}>{label(locale, i.status)}</Pill>
                  {i.staff_reply && <span className="block text-[#e5ed43]">↳ {i.staff_reply}</span>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}
