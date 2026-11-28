import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill } from '@/components/admin/ui';
import { approveBotSubmission, rejectBotSubmission } from '../../actions';

type Row = { registration_id: string | null; ign: string | null; read_name: string; rank: number | null; kills: number | null; confidence: number };

const ISSUE_AR: Record<string, string> = {
  unmatched_players: 'أسماء مش متسجلة في الغرفة',
  ambiguous_names: 'أسماء متشابهة',
  duplicate_player: 'لاعب مكرر',
  missing_rank: 'ترتيب ناقص',
  duplicate_rank: 'ترتيب مكرر',
  rank_out_of_range: 'ترتيب برا النطاق',
  missing_kills: 'كيلز ناقصة',
  kills_out_of_range: 'كيلز غير منطقية',
  missing_players: 'لاعبين ناقصين',
  more_rows_than_roster: 'صفوف أكتر من اللاعبين',
  round_already_completed: 'الراوند ده متسجل قبل كده',
  room_already_completed: 'الغرفة خلصت نتايجها',
  room_ambiguous: 'مش متأكد من الغرفة',
  room_label_mismatch: 'رقم الغرفة في الصورة مختلف',
  room_not_identified: 'ماعرفش الغرفة',
  not_a_results_screen: 'مش شاشة نتائج',
  no_active_stage_rooms: 'مفيش غرف في المرحلة الحالية'
};

export default async function BotPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  const { locale, supabase, tournament: t } = await requireOrganizer(l, slug);
  const tid = t!.id as string;
  const { data: subs } = await supabase
    .from('bot_submissions')
    .select('id,status,confidence,issues,rows,image_url,match_id,created_at,decided_at,matches(round_number,groups(name))')
    .eq('tournament_id', tid)
    .order('created_at', { ascending: false })
    .limit(40);
  const pending = (subs ?? []).filter((x) => x.status === 'pending');
  const rest = (subs ?? []).filter((x) => x.status !== 'pending');
  const fmt = (d: string) => new Date(d).toLocaleString(locale === 'ar' ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' });
  const issueText = (i: string) => {
    const [k, v] = i.split(':');
    const base = locale === 'ar' ? ISSUE_AR[k ?? ''] ?? k : k;
    return v ? `${base} (${v})` : base;
  };
  const roomOf = (x: any) => {
    const m = Array.isArray(x.matches) ? x.matches[0] : x.matches;
    const g = m ? (Array.isArray(m.groups) ? m.groups[0] : m.groups) : null;
    return m ? `${g?.name ?? '?'} · ${tr(locale, 'راوند', 'Round')} ${m.round_number}` : tr(locale, 'غرفة غير معروفة', 'Room unknown');
  };

  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} err={sp.err} />
      <Card title={tr(locale, `نتائج مستنية الاعتماد (${pending.length})`, `Results waiting for approval (${pending.length})`)}>
        <p className="mb-3 text-xs text-[#a4a6aa]">
          {tr(locale, 'البوت بيقرأ السكرين شوت وبيسجلها هنا. مفيش حاجة بتتحدث في الترتيب أو البراكت إلا بعد ما تعتمد.', 'The bot reads screenshots and parks them here. Standings and bracket only change after you approve.')}
        </p>
        {pending.length === 0 && <p className="text-sm text-[#a4a6aa]">{tr(locale, 'مفيش نتائج مستنية.', 'Nothing pending.')}</p>}
        <div className="space-y-4">
          {pending.map((x) => {
            const rows = ((x.rows as Row[]) ?? []).slice().sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99));
            const issues = (x.issues as string[]) ?? [];
            return (
              <div key={x.id} className="border border-[#2b2d30] bg-[#151619] p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                  <Pill on>{roomOf(x)}</Pill>
                  <Pill>{tr(locale, 'ثقة', 'Confidence')} {Math.round(Number(x.confidence) * 100)}%</Pill>
                  <span className="text-[#a4a6aa]">{fmt(x.created_at)}</span>
                  <a href={x.image_url} target="_blank" rel="noreferrer" className="font-bold text-[#e5ed43]">{tr(locale, 'السكرين شوت', 'Screenshot')}</a>
                </div>
                {issues.length > 0 && (
                  <p className="mb-2 text-xs font-bold text-[#ffb36b]">⚠ {issues.map(issueText).join(' · ')}</p>
                )}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr className="text-xs text-[#a4a6aa]"><th className="p-1 text-start">#</th><th className="p-1 text-start">{tr(locale, 'اللاعب', 'Player')}</th><th className="p-1 text-start">{tr(locale, 'اتقرا كـ', 'Read as')}</th><th className="p-1">K</th><th className="p-1">%</th></tr></thead>
                    <tbody>
                      {rows.map((r, i) => (
                        <tr key={i} className={r.registration_id ? '' : 'text-[#ffb36b]'}>
                          <td className="p-1">{r.rank ?? '?'}</td>
                          <td className="p-1 font-bold">{r.ign ?? '—'}</td>
                          <td className="p-1 text-[#a4a6aa]">{r.read_name}</td>
                          <td className="p-1 text-center">{r.kills ?? '?'}</td>
                          <td className="p-1 text-center">{Math.round(r.confidence * 100)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 flex gap-2">
                  {x.match_id ? (
                    <form action={approveBotSubmission}>
                      <Hidden values={{ locale, slug, sid: x.id }} />
                      <Btn tone="primary">{tr(locale, 'اعتمد', 'Approve')}</Btn>
                    </form>
                  ) : (
                    <span className="self-center text-xs text-[#ffb36b]">{tr(locale, 'مش هينفع اعتماد: الغرفة مش معروفة، ادخل النتيجة يدوي من الماتشات', 'Cannot approve: room unknown, enter manually in Matches')}</span>
                  )}
                  <form action={rejectBotSubmission}>
                    <Hidden values={{ locale, slug, sid: x.id }} />
                    <Btn tone="danger">{tr(locale, 'ارفض', 'Reject')}</Btn>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <Card title={tr(locale, 'السجل', 'History')}>
        <ul className="divide-y divide-[#2b2d30] text-sm">
          {rest.map((x) => (
            <li key={x.id} className="flex flex-wrap items-center gap-2 py-2">
              <Pill on={x.status === 'approved'}>{x.status}</Pill>
              <span>{roomOf(x)}</span>
              <span className="text-xs text-[#a4a6aa]">{fmt(x.decided_at ?? x.created_at)}</span>
              <a href={x.image_url} target="_blank" rel="noreferrer" className="text-xs font-bold text-[#e5ed43]">{tr(locale, 'صورة', 'Image')}</a>
            </li>
          ))}
          {rest.length === 0 && <li className="py-2 text-[#a4a6aa]">—</li>}
        </ul>
      </Card>
    </div>
  );
}
