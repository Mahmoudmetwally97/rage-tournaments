import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOrganizer } from '@/lib/admin';
import { setUserRole } from '../actions';

const ROLE_AR: Record<string, string> = { super_admin: 'أدمن', moderator: 'مشرف', player: 'لاعب' };
const ROLE_EN: Record<string, string> = { super_admin: 'Admin', moderator: 'Moderator', player: 'Player' };

export default async function TeamPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; err?: string; ok?: string }>;
}) {
  const { locale: lp } = await params;
  const sp = await searchParams;
  const { locale, user, supabase } = await requireOrganizer(lp);
  const ar = locale === 'ar';
  const { data: mine } = await supabase.from('user_roles').select('role').eq('user_id', user.id);
  if (!(mine ?? []).some((r) => r.role === 'super_admin')) redirect(`/${locale}/admin`);

  const q = (sp.q ?? '').trim();
  const { data: users } = await supabase.rpc('admin_list_users', { p_q: q });
  const { data: changes } = await supabase.rpc('admin_role_changes');
  const rn = (r: string | null) => (r ? (ar ? ROLE_AR[r] : ROLE_EN[r]) ?? r : '-');
  const btn = 'border px-3 py-1.5 text-xs font-bold';

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-8 sm:px-6">
      <div>
        <Link href={`/${locale}/admin`} className="text-xs text-[#a4a6aa] hover:text-[#f4f4ed]">← {ar ? 'لوحة الإدارة' : 'Admin console'}</Link>
        <p className="eyebrow mb-2 mt-3">{ar ? 'الفريق والصلاحيات' : 'TEAM & ROLES'}</p>
        <h1 className="text-3xl font-extrabold text-[#f4f4ed]">{ar ? 'مين يقدر يدير الموقع' : 'Who can run the site'}</h1>
        <p className="mt-2 text-sm text-[#a4a6aa]">
          {ar
            ? 'الأدمن يقدر يعمل كل حاجة ويدّي صلاحيات. المشرف يدخل لوحة الإدارة بس. اللاعب لازم يكون سجّل في الموقع الأول.'
            : 'An admin can do everything and grant roles. A moderator can open the admin console only. The person must have signed up on the site first.'}
        </p>
      </div>

      {sp.err && <p className="border border-[#ff5d5d]/40 bg-[#ff5d5d]/10 p-3 text-sm text-[#ff9a9a]">{sp.err}</p>}
      {sp.ok && <p className="border border-[#e5ed43]/40 bg-[#e5ed43]/10 p-3 text-sm text-[#e5ed43]">{ar ? 'تم الحفظ' : 'Saved'}</p>}

      <form className="flex gap-2" action="" method="get">
        <input name="q" defaultValue={q} placeholder={ar ? 'ابحث باسم المستخدم...' : 'Search by username...'} className="w-full border border-[#2b2d30] bg-[#151619] px-4 py-2.5 text-sm text-[#f4f4ed]" />
        <button className="clip-btn bg-[#e5ed43] px-5 text-xs font-extrabold text-[#0d0e10]">{ar ? 'بحث' : 'Search'}</button>
      </form>
      <p className="text-xs text-[#a4a6aa]">{q ? (ar ? 'نتائج البحث' : 'Search results') : ar ? 'الأدمن والمشرفين الحاليين' : 'Current admins and moderators'}</p>

      <div className="space-y-3">
        {(users ?? []).map((u: { id: string; username: string; display_name: string; role: string }) => {
          const self = u.id === user.id;
          return (
            <article key={u.id} className="flex flex-wrap items-center justify-between gap-3 border border-[#2b2d30] bg-[#151619] p-4">
              <div>
                <p className="font-extrabold text-[#f4f4ed] ltr-isolate">{u.username}{self && <span className="ms-2 text-[10px] text-[#a4a6aa]">({ar ? 'انت' : 'you'})</span>}</p>
                <p className="text-xs text-[#a4a6aa]">{rn(u.role)}</p>
              </div>
              {!self && (
                <div className="flex flex-wrap gap-2">
                  {(['moderator', 'super_admin', 'player'] as const).filter((r) => r !== u.role).map((r) => (
                    <form key={r} action={setUserRole}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="q" value={q} />
                      <input type="hidden" name="user" value={u.id} />
                      <input type="hidden" name="role" value={r} />
                      <button className={`${btn} ${r === 'player' ? 'border-[#ff5d5d]/50 text-[#ff9a9a]' : r === 'super_admin' ? 'border-[#e5ed43] text-[#e5ed43]' : 'border-[#2b2d30] text-[#f4f4ed]'}`}>
                        {r === 'moderator' ? (ar ? 'خليه مشرف' : 'Make moderator') : r === 'super_admin' ? (ar ? 'خليه أدمن (كامل الصلاحيات)' : 'Make admin (full access)') : ar ? 'شيل الصلاحية' : 'Remove role'}
                      </button>
                    </form>
                  ))}
                </div>
              )}
            </article>
          );
        })}
        {(users ?? []).length === 0 && <p className="text-sm text-[#a4a6aa]">{ar ? 'مفيش نتائج' : 'No results'}</p>}
      </div>

      <section>
        <h2 className="mb-3 text-lg font-extrabold text-[#f4f4ed]">{ar ? 'آخر التغييرات' : 'Recent changes'}</h2>
        <div className="space-y-2">
          {(changes ?? []).map((c: { created_at: string; actor: string; target: string; old_role: string; new_role: string }, i: number) => (
            <p key={i} className="border border-[#2b2d30] bg-[#151619] px-4 py-2 text-xs text-[#a4a6aa]">
              <span className="ltr-isolate">{new Date(c.created_at).toLocaleString(ar ? 'ar-EG' : 'en-GB', { timeZone: 'Africa/Cairo' })}</span>{' · '}
              <b className="text-[#f4f4ed] ltr-isolate">{c.actor}</b> {ar ? 'غيّر' : 'changed'} <b className="text-[#f4f4ed] ltr-isolate">{c.target}</b>: {rn(c.old_role)} → {rn(c.new_role)}
            </p>
          ))}
          {(changes ?? []).length === 0 && <p className="text-sm text-[#a4a6aa]">{ar ? 'لسه مفيش تغييرات' : 'No changes yet'}</p>}
        </div>
      </section>
    </div>
  );
}
