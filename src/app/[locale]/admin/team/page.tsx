import Link from 'next/link';
import { redirect } from 'next/navigation';
import { requireOrganizer } from '@/lib/admin';
import { setUserRole, setUserPublicName, resolveNameFlag } from '../actions';

const ROLE_AR: Record<string, string> = { owner: 'المالك', super_admin: 'أدمن', moderator: 'مشرف', player: 'لاعب' };
const ROLE_EN: Record<string, string> = { owner: 'Owner', super_admin: 'Admin', moderator: 'Moderator', player: 'Player' };

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

  const isOwner = (mine ?? []).some((r) => r.role === 'owner');
  const q = (sp.q ?? '').trim();
  const { data: users } = await supabase.rpc('admin_list_users', { p_q: q });
  const { data: flags } = await supabase.rpc('admin_list_name_flags');
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
            ? 'المالك بس يقدر يدّي أو يشيل الأدمن. الأدمن يدير الموقع ويدير المشرفين. المشرف يدخل لوحة الإدارة بس. اللاعب لازم يكون سجّل في الموقع الأول.'
            : 'The owner can do everything and is the only one who can grant or remove admin. An admin can run the site and manage moderators. A moderator can open the admin console only. The person must have signed up on the site first.'}
        </p>
      </div>

      {sp.err && <p className="border border-[#ff5d5d]/40 bg-[#ff5d5d]/10 p-3 text-sm text-[#ff9a9a]">{sp.err}</p>}
      {sp.ok && <p className="border border-[#e5ed43]/40 bg-[#e5ed43]/10 p-3 text-sm text-[#e5ed43]">{ar ? 'تم الحفظ' : 'Saved'}</p>}

      {(flags ?? []).filter((x: { status?: string }) => !x.status || x.status === 'open').length > 0 && (
        <section className="space-y-2 border border-[#ff9a3d]/40 bg-[#ff9a3d]/5 p-4">
          <h2 className="text-sm font-extrabold text-[#ffb36b]">{ar ? 'أسماء محتاجة مراجعة' : 'Names to review'}</h2>
          <p className="text-xs text-[#a4a6aa]">{ar ? 'الموقع بيعلّم الأسماء المشبوهة بس، مفيش حاجة بتتخفى تلقائياً.' : 'The site only flags suspicious names. Nothing is hidden automatically.'}</p>
          {(flags ?? []).map((x: { id: string; kind: string; name: string; matched: string; user_id: string | null; username: string | null; tournament_slug: string | null }) => (
            <div key={x.id} className="flex flex-wrap items-center justify-between gap-2 border border-[#2b2d30] bg-[#151619] p-3 text-sm">
              <div className="min-w-0">
                <b className="text-[#f4f4ed] ltr-isolate">{x.name}</b>
                <span className="ms-2 text-xs text-[#a4a6aa]">{x.kind === 'username' ? (ar ? 'اسم مستخدم' : 'username') : (ar ? 'اسم لاعب في بطولة' : 'in-tournament name')}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {x.kind === 'username' && x.username && (
                  <Link href={`/${locale}/admin/team?q=${encodeURIComponent(x.username)}`} className={`${btn} border-[#e5ed43] text-[#e5ed43]`}>{ar ? 'افتح' : 'Open'}</Link>
                )}
                {x.kind !== 'username' && x.tournament_slug && (
                  <Link href={`/${locale}/admin/${x.tournament_slug}/participants`} className={`${btn} border-[#e5ed43] text-[#e5ed43]`}>{ar ? 'افتح المشاركين' : 'Open participants'}</Link>
                )}
                <form action={resolveNameFlag}>
                  <input type="hidden" name="locale" value={locale} />
                  <input type="hidden" name="flag" value={x.id} />
                  <input type="hidden" name="status" value="dismissed" />
                  <button className={`${btn} border-[#2b2d30] text-[#f4f4ed]`}>{ar ? 'تجاهل' : 'Dismiss'}</button>
                </form>
              </div>
            </div>
          ))}
        </section>
      )}

      <form className="flex gap-2" action="" method="get">
        <input name="q" defaultValue={q} placeholder={ar ? 'ابحث باسم المستخدم...' : 'Search by username...'} className="w-full border border-[#2b2d30] bg-[#151619] px-4 py-2.5 text-sm text-[#f4f4ed]" />
        <button className="clip-btn bg-[#e5ed43] px-5 text-xs font-extrabold text-[#0d0e10]">{ar ? 'بحث' : 'Search'}</button>
      </form>
      <p className="text-xs text-[#a4a6aa]">{q ? (ar ? 'نتائج البحث' : 'Search results') : ar ? 'الأدمن والمشرفين الحاليين' : 'Current admins and moderators'}</p>

      <div className="space-y-3">
        {(users ?? []).map((u: { id: string; username: string; display_name: string; role: string; public_name_override: string | null; public_hidden: boolean }) => {
          const self = u.id === user.id;
          const locked = u.role === 'owner' || (u.role === 'super_admin' && !isOwner);
          return (
            <article key={u.id} className="flex flex-wrap items-center justify-between gap-3 border border-[#2b2d30] bg-[#151619] p-4">
              <div>
                <p className="font-extrabold text-[#f4f4ed] ltr-isolate">{u.username}{self && <span className="ms-2 text-[10px] text-[#a4a6aa]">({ar ? 'انت' : 'you'})</span>}</p>
                <p className="text-xs text-[#a4a6aa]">{rn(u.role)}</p>
                {u.public_hidden && <p className="mt-1 text-[11px] font-bold text-[#ff9a9a]">{ar ? 'مخفي عن العامة' : 'Hidden from public'}</p>}
                {u.public_name_override && <p className="mt-1 text-[11px] font-bold text-[#ffb36b]">{ar ? 'بيظهر للناس باسم:' : 'Shown publicly as:'} <span className="ltr-isolate">{u.public_name_override}</span></p>}
              </div>
              {!self && !locked && (
                <div className="flex flex-wrap gap-2">
                  {(['moderator', 'super_admin', 'player'] as const).filter((r) => r !== u.role && (isOwner || r !== 'super_admin')).map((r) => (
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
              {!self && u.role !== 'owner' && (u.role !== 'super_admin' || isOwner) && (
                <details className="w-full border-t border-[#2b2d30] pt-3 text-xs">
                  <summary className="cursor-pointer font-bold text-[#a4a6aa]">{ar ? 'اسم المستخدم قدام الناس' : 'Public username'}</summary>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <form action={setUserPublicName} className="flex flex-wrap gap-2">
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="q" value={q} />
                      <input type="hidden" name="user" value={u.id} />
                      <input type="hidden" name="mode" value="rename" />
                      <input name="name" minLength={2} maxLength={24} required placeholder={ar ? 'اسم بديل (2-24)' : 'Replacement name (2-24)'} className="border border-[#2b2d30] bg-[#0d0e10] px-3 py-1.5 text-[#f4f4ed]" />
                      <button className={`${btn} border-[#e5ed43] text-[#e5ed43]`}>{ar ? 'غيّر الاسم العام' : 'Set public name'}</button>
                    </form>
                    {!u.public_hidden && (
                      <form action={setUserPublicName}>
                        <input type="hidden" name="locale" value={locale} /><input type="hidden" name="q" value={q} /><input type="hidden" name="user" value={u.id} /><input type="hidden" name="mode" value="hide" />
                        <button className={`${btn} border-[#ff5d5d]/50 text-[#ff9a9a]`}>{ar ? 'اخفي' : 'Hide'}</button>
                      </form>
                    )}
                    {(u.public_hidden || u.public_name_override) && (
                      <form action={setUserPublicName}>
                        <input type="hidden" name="locale" value={locale} /><input type="hidden" name="q" value={q} /><input type="hidden" name="user" value={u.id} /><input type="hidden" name="mode" value="undo" />
                        <button className={`${btn} border-[#2b2d30] text-[#f4f4ed]`}>{ar ? 'رجّع الاسم الأصلي' : 'Restore real name'}</button>
                      </form>
                    )}
                  </div>
                </details>
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
