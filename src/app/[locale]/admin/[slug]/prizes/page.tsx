import { requireOrganizer, tr } from '@/lib/admin';
import { Btn, Card, Flash, Hidden, Pill, inputCls } from '@/components/admin/ui';
import { addBonus, addPool, addReward, deleteBonus, deletePool, deleteReward, setClaimStatus } from '../../actions';

const KINDS = ['cash', 'coins', 'voucher', 'other'];

export default async function PrizesPage({
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
  const [{ data: pools }, { data: bonuses }, { data: claims }] = await Promise.all([
    supabase.from('prize_pools').select('id,rank_from,rank_to,label_ar,label_en,prize_rewards(id,kind,amount,currency,text_ar,text_en,note,is_placeholder)').eq('tournament_id', tid).order('rank_from'),
    supabase.from('tournament_bonuses').select('*').eq('tournament_id', tid),
    supabase.from('prize_claims').select('id,status,payout_contact,staff_note,pool_id,registrations(ign_snapshot)').eq('tournament_id', tid)
  ]);
  const KindSel = () => (
    <select name="kind" className={inputCls}>{KINDS.map((k) => <option key={k}>{k}</option>)}</select>
  );
  return (
    <div className="space-y-6">
      <Flash ok={sp.ok} err={sp.err} />
      <Card title={tr(locale, 'مجموعات الجوائز (حسب المركز)', 'Prize pools (by rank)')}>
        <div className="space-y-4">
          {(pools ?? []).map((p) => (
            <div key={p.id} className="border border-[#2b2d30] p-3">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="font-extrabold text-[#f4f4ed]">
                  {locale === 'ar' ? p.label_ar : p.label_en}{' '}
                  <span className="text-xs text-[#6f7276] ltr-isolate">#{p.rank_from}{p.rank_to > p.rank_from ? `-${p.rank_to}` : ''}</span>
                </h3>
                <form action={deletePool}><Hidden values={{ locale, slug, id: p.id }} /><Btn tone="danger">{tr(locale, 'حذف', 'Delete')}</Btn></form>
              </div>
              <ul className="mb-3 space-y-1 text-sm">
                {(p.prize_rewards as any[]).map((r) => (
                  <li key={r.id} className="flex items-center justify-between gap-2">
                    <span className="text-[#a4a6aa]">
                      <Pill>{r.kind}</Pill> {r.amount ?? ''} {r.currency ?? ''} {locale === 'ar' ? r.text_ar : r.text_en}{' '}
                      {r.is_placeholder && <Pill>{tr(locale, 'مؤقت', 'placeholder')}</Pill>}
                    </span>
                    <form action={deleteReward}><Hidden values={{ locale, slug, id: r.id }} /><Btn tone="danger">×</Btn></form>
                  </li>
                ))}
              </ul>
              <form action={addReward} className="grid gap-2 sm:grid-cols-6">
                <Hidden values={{ locale, slug, pool_id: p.id }} />
                <KindSel />
                <input name="amount" type="number" step="any" placeholder={tr(locale, 'المبلغ', 'Amount')} className={inputCls} />
                <input name="currency" placeholder="EGP/USD" className={inputCls} />
                <input name="text_ar" placeholder="نص عربي" className={inputCls} />
                <input name="text_en" placeholder="English text" className={inputCls} />
                <Btn>{tr(locale, 'إضافة جائزة', 'Add reward')}</Btn>
              </form>
            </div>
          ))}
        </div>
        <form action={addPool} className="mt-4 grid gap-2 sm:grid-cols-5">
          <Hidden values={{ locale, slug, tid }} />
          <input name="rank_from" type="number" min={1} placeholder={tr(locale, 'من مركز', 'From rank')} required className={inputCls} />
          <input name="rank_to" type="number" min={1} placeholder={tr(locale, 'إلى مركز', 'To rank')} className={inputCls} />
          <input name="label_ar" placeholder="الاسم عربي" className={inputCls} />
          <input name="label_en" placeholder="Label EN" className={inputCls} />
          <Btn tone="primary">{tr(locale, 'مجموعة جديدة', 'New pool')}</Btn>
        </form>
      </Card>

      <Card title={tr(locale, 'المكافآت الإضافية', 'Bonuses')}>
        <ul className="mb-3 space-y-1 text-sm">
          {(bonuses ?? []).map((b) => (
            <li key={b.id} className="flex items-center justify-between">
              <span className="text-[#a4a6aa]">{locale === 'ar' ? b.title_ar : b.title_en} {b.is_placeholder && <Pill>{tr(locale, 'مؤقت', 'placeholder')}</Pill>}</span>
              <form action={deleteBonus}><Hidden values={{ locale, slug, id: b.id }} /><Btn tone="danger">×</Btn></form>
            </li>
          ))}
        </ul>
        <form action={addBonus} className="grid gap-2 sm:grid-cols-5">
          <Hidden values={{ locale, slug, tid }} />
          <input name="title_ar" placeholder="العنوان" className={inputCls} />
          <input name="title_en" placeholder="Title" className={inputCls} />
          <KindSel />
          <input name="amount" type="number" step="any" placeholder={tr(locale, 'المبلغ', 'Amount')} className={inputCls} />
          <Btn>{tr(locale, 'إضافة', 'Add')}</Btn>
        </form>
      </Card>

      <Card title={tr(locale, 'مطالبات الجوائز', 'Prize claims')}>
        {(claims ?? []).length === 0 ? (
          <p className="text-sm text-[#a4a6aa]">{tr(locale, 'لا توجد مطالبات.', 'No claims yet.')}</p>
        ) : (
          <ul className="divide-y divide-[#2b2d30]">
            {(claims ?? []).map((c) => {
              const reg = c.registrations as any;
              const ign = Array.isArray(reg) ? reg[0]?.ign_snapshot : reg?.ign_snapshot;
              return (
                <li key={c.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-bold text-[#f4f4ed]">{ign} <Pill on={c.status === 'paid'}>{c.status}</Pill></p>
                    <p className="text-xs text-[#a4a6aa] ltr-isolate">{c.payout_contact}</p>
                  </div>
                  <div className="flex gap-2">
                    {['approved', 'paid', 'rejected'].map((st) => (
                      <form key={st} action={setClaimStatus}>
                        <Hidden values={{ locale, slug, id: c.id, status: st }} />
                        <Btn tone={st === 'rejected' ? 'danger' : st === 'paid' ? 'primary' : 'default'}>{st}</Btn>
                      </form>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
