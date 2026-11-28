import { label } from '@/lib/labels';
import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { replyIssue } from '../../actions';

export default async function SupportPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  const { locale, supabase, tournament: t } = await requireOrganizer(l, slug);
  const { data: issues } = await supabase
    .from('tournament_issues')
    .select('id,subject,body,status,staff_reply,created_at')
    .eq('tournament_id', t!.id)
    .order('created_at', { ascending: false });
  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} err={sp.err} />
      <Card title={tr(locale, 'مشاكل اللاعبين', 'Player issues')}>
        {(issues ?? []).length === 0 ? (
          <p className="text-sm text-[#a4a6aa]">{tr(locale, 'لا توجد مشاكل.', 'No issues.')}</p>
        ) : (
          <ul className="space-y-4">
            {(issues ?? []).map((i) => (
              <li key={i.id} className="border border-[#2b2d30] p-3">
                <p className="font-bold text-[#f4f4ed]">{i.subject} <Pill on={i.status === 'resolved'}>{label(locale, i.status)}</Pill></p>
                <p className="mt-1 text-sm text-[#a4a6aa]">{i.body}</p>
                <form action={replyIssue} className="mt-3 flex flex-wrap gap-2">
                  <Hidden values={{ locale, slug, id: i.id, status: 'resolved' }} />
                  <input name="reply" defaultValue={i.staff_reply ?? ''} placeholder={tr(locale, 'الرد', 'Reply')} className={`${inputCls} flex-1`} />
                  <Btn tone="primary">{tr(locale, 'رد وإغلاق', 'Reply and resolve')}</Btn>
                </form>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
