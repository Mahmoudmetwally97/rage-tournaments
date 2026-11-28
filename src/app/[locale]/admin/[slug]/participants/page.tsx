import { label } from '@/lib/labels';
import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill } from '@/components/admin/ui';
import { TeamLogo } from '@/components/tournaments/TeamLogo';
import { setRegStatus, setPublicName } from '../../actions';

const ACTIONS: Record<string, [string, string, string, 'default' | 'primary' | 'danger'][]> = {
  pending: [['confirmed', 'قبول', 'Accept', 'primary'], ['rejected', 'رفض', 'Reject', 'danger']],
  waitlisted: [['confirmed', 'قبول', 'Accept', 'primary'], ['rejected', 'رفض', 'Reject', 'danger']],
  confirmed: [['checked_in', 'تشيك إن', 'Check in', 'default'], ['disqualified', 'حظر', 'Ban', 'danger'], ['pending', 'رجوع لمعلق', 'To pending', 'default']],
  checked_in: [['confirmed', 'إلغاء التشيك إن', 'Undo check-in', 'default'], ['disqualified', 'حظر', 'Ban', 'danger']],
  rejected: [['pending', 'إعادة', 'Reopen', 'default']],
  disqualified: [['confirmed', 'رفع الحظر', 'Unban', 'default']]
};

export default async function Participants({
  params,
  searchParams
}: {
  params: Promise<{ locale: string; slug: string }>;
  searchParams: Promise<{ ok?: string; err?: string; f?: string }>;
}) {
  const { locale: l, slug } = await params;
  const sp = await searchParams;
  const { locale, supabase, tournament: t, level } = await requireOrganizer(l, slug);
  const { data: regs } = await supabase
    .from('registrations')
    .select('id,ign_snapshot,status,registration_code,contact_email,created_at,user_id,team_id,display_override,hidden_public')
    .eq('tournament_id', t!.id)
    .order('created_at');
  const tids = Array.from(new Set((regs ?? []).map((r) => r.team_id as string | null).filter(Boolean))) as string[];
  const { data: tms } = tids.length ? await supabase.from('teams').select('id,tag,logo_url').in('id', tids) : { data: [] as { id: string; tag: string; logo_url: string | null }[] };
  const filter = sp.f ?? 'all';
  const rows = (regs ?? []).filter((r) => filter === 'all' || r.status === filter);
  const stat = (st: string) => (regs ?? []).filter((r) => r.status === st).length;
  const filters = ['all', 'pending', 'confirmed', 'checked_in', 'waitlisted', 'rejected', 'disqualified'];
  return (
    <div className="space-y-4">
      <Flash ok={sp.ok} err={sp.err} />
      <Card title={tr(locale, `اللاعبين (${regs?.length ?? 0})`, `Participants (${regs?.length ?? 0})`)}>
        <div className="mb-4 flex flex-wrap gap-2">
          {filters.map((f) => (
            <a key={f} href={`?f=${f}`}>
              <Pill on={filter === f}>{label(locale, f)} {f === 'all' ? regs?.length ?? 0 : stat(f)}</Pill>
            </a>
          ))}
        </div>
        {rows.length === 0 ? (
          <p className="text-sm text-[#a4a6aa]">{tr(locale, 'لا يوجد لاعبين بعد.', 'No participants yet.')}</p>
        ) : (
          <ul className="divide-y divide-[#2b2d30]">
            {rows.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3">
                  {r.team_id && (() => { const tm = (tms ?? []).find((x) => x.id === r.team_id); return <TeamLogo src={tm?.logo_url} tag={tm?.tag} size={36} />; })()}
                  <div>
                  <p className="font-bold text-[#f4f4ed]">{r.ign_snapshot}
                    {r.hidden_public && <span className="ms-2 border border-[#FF8C4D]/50 bg-[#FF8C4D]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#FF8C4D]">{tr(locale, 'مخفي عن الجمهور', 'HIDDEN PUBLICLY')}</span>}
                    {!r.hidden_public && r.display_override && <span className="ms-2 border border-[#e5ed43]/40 px-2 py-0.5 text-[10px] font-extrabold text-[#e5ed43]">{tr(locale, 'يظهر للجمهور باسم', 'SHOWN PUBLICLY AS')}: {r.display_override}</span>}
                  </p>
                  <p className="text-xs text-[#6f7276] ltr-isolate">{r.registration_code}{r.contact_email ? ` · ${r.contact_email}` : ''}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Pill on={r.status === 'checked_in' || r.status === 'confirmed'}>{label(locale, r.status)}</Pill>
                  {(ACTIONS[r.status] ?? []).map(([st, ar, en, tone]) => (
                    <form key={st} action={setRegStatus}>
                      <Hidden values={{ locale, slug, reg_id: r.id, status: st }} />
                      <Btn tone={tone}>{tr(locale, ar, en)}</Btn>
                    </form>
                  ))}
                </div>
                {level === 'manager' && (
                  <details className="basis-full text-xs text-[#a4a6aa]">
                    <summary className="cursor-pointer select-none font-bold hover:text-[#f4f4ed]">{tr(locale, 'الاسم العام', 'Public name')}</summary>
                    <form action={setPublicName} className="mt-2 flex flex-wrap items-end gap-2">
                      <Hidden values={{ locale, slug, reg_id: r.id }} />
                      <label>{tr(locale, 'اسم بديل (فاضي = الاسم الأصلي)', 'Replacement name (empty = real IGN)')}<input name="name" defaultValue={r.display_override ?? ''} maxLength={32} className="mt-1 block w-56 border border-[#2b2d30] bg-[#0d0e10] px-3 py-2 text-sm text-[#f4f4ed]" /></label>
                      <label className="flex items-center gap-2 pb-2 text-[#f4f4ed]"><input type="checkbox" name="hidden" value="1" defaultChecked={r.hidden_public} />{tr(locale, 'إخفاء من الليدربورد والبراكت', 'Hide from public leaderboards and brackets')}</label>
                      <Btn tone="primary">{tr(locale, 'حفظ', 'Save')}</Btn>
                    </form>
                    {(r.display_override || r.hidden_public) && (
                      <form action={setPublicName} className="mt-2">
                        <Hidden values={{ locale, slug, reg_id: r.id, name: '' }} />
                        <Btn>{tr(locale, 'تراجع (الاسم الأصلي ويظهر)', 'Undo (real name, visible)')}</Btn>
                      </form>
                    )}
                    <p className="mt-2 text-[#6f7276]">{tr(locale, 'الاسم الحقيقي والحساب مش بيتغيروا. كل تغيير بيتسجل في سجل التدقيق.', 'The real IGN and the account are not changed. Every change is saved in the audit log.')}</p>
                  </details>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
