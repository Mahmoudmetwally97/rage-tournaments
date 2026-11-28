import Link from 'next/link';
import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { label } from '@/lib/labels';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Btn, Card, Flash, Hidden, PageHero, Pill, inputCls } from '@/components/admin/ui';
import { playerCancel, playerCheckIn, playerClaim, playerIssue, playerRegister } from '../../../admin/actions';

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

  let mine: { id: string; status: string; ign_snapshot: string; registration_code: string } | null = null;
  let myClaim: { status: string } | null = null;
  let myIssues: { id: string; subject: string; status: string; staff_reply: string | null }[] = [];
  let ign = '';
  if (user) {
    const { data: reg } = await supabase
      .from('registrations')
      .select('id,status,ign_snapshot,registration_code')
      .eq('tournament_id', tid)
      .eq('user_id', user.id)
      .not('status', 'in', '(cancelled)')
      .maybeSingle();
    mine = reg;
    const { data: prof } = await supabase.from('player_profiles').select('username').eq('id', user.id).maybeSingle();
    ign = prof?.username ?? '';
    const { data: c } = await supabase.from('prize_claims').select('status').eq('tournament_id', tid).eq('user_id', user.id).maybeSingle();
    myClaim = c;
    const { data: iss } = await supabase.from('tournament_issues').select('id,subject,status,staff_reply').eq('tournament_id', tid).eq('user_id', user.id);
    myIssues = iss ?? [];
  }
  const myRank = mine ? (stand ?? []).find((r) => r.registration_id === mine!.id)?.rank : undefined;
  const finished = t.status === 'completed' || t.status === 'archived';
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
        <span>{t.starts_at ? new Date(t.starts_at).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB') : tr(locale, 'الموعد قيد التحديد', 'Date TBD')}</span>
      </PageHero>
      <Flash ok={sp.ok} err={sp.err} />

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
              {t.status === 'check_in' && mine.status === 'confirmed' && (
                <form action={playerCheckIn}><Hidden values={hid} /><Btn tone="primary">{tr(locale, 'تشيك إن', 'Check in')}</Btn></form>
              )}
              {!['live', 'completed', 'archived'].includes(t.status) && ['pending', 'confirmed', 'checked_in', 'waitlisted'].includes(mine.status) && (
                <form action={playerCancel}><Hidden values={hid} /><Btn tone="danger">{tr(locale, 'إلغاء التسجيل', 'Cancel registration')}</Btn></form>
              )}
            </div>
            {myRank && <p className="text-sm text-[#e5ed43]">{tr(locale, `ترتيبك: ${myRank}`, `Your rank: ${myRank}`)}</p>}
          </div>
        ) : t.status === 'registration_open' ? (
          <form action={playerRegister} className="flex flex-wrap gap-2">
            <Hidden values={hid} />
            <input name="ign" defaultValue={ign} required minLength={2} placeholder={tr(locale, 'اسمك في اللعبة', 'In-game name')} className={`${inputCls} max-w-xs`} />
            <Btn tone="primary">{tr(locale, 'سجل في البطولة', 'Join tournament')}</Btn>
          </form>
        ) : (
          <p className="text-sm text-[#a4a6aa]">{tr(locale, 'التسجيل غير مفتوح حالياً.', 'Registration is not open right now.')}</p>
        )}
        {t.contact_url && (
          <a href={t.contact_url} target="_blank" rel="noreferrer" className="mt-4 inline-block border border-[#2b2d30] px-3 py-1.5 text-xs font-bold text-[#f4f4ed] hover:border-[#e5ed43]">
            {t.contact_label || tr(locale, 'تواصل مع المنظمين', 'Contact organizers')}
          </a>
        )}
      </Card>

      <Card title={tr(locale, 'الترتيب', 'Standings')}>
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
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card title={tr(locale, 'الجوائز', 'Prizes')}>
          <ul className="space-y-2 text-sm">
            {(pools ?? []).map((p) => (
              <li key={p.id}>
                <span className="font-bold text-[#f4f4ed]">{locale === 'ar' ? p.label_ar : p.label_en}</span>
                {(p.prize_rewards as any[]).map((r, i) => (
                  <span key={i} className="block text-[#a4a6aa]">
                    {r.amount ?? ''} {r.currency ?? ''} {locale === 'ar' ? r.text_ar : r.text_en}
                  </span>
                ))}
              </li>
            ))}
            {(bonuses ?? []).map((b) => (
              <li key={b.id} className="text-[#a4a6aa]">+ {locale === 'ar' ? b.title_ar : b.title_en}</li>
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
