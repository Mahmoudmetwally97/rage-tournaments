import Link from 'next/link';
import { notFound } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { tr } from '@/lib/admin';
import { getCurrentUser, getSupabaseServerClient } from '@/lib/supabase/server';
import { Card, PageHero } from '@/components/admin/ui';
import { kindTone, timeAgo, type NotificationRow } from '@/lib/notifications';

export const dynamic = 'force-dynamic';

async function markAll(fd: FormData) {
  'use server';
  const locale = String(fd.get('locale') || 'en');
  const sb = await getSupabaseServerClient();
  if (sb) await sb.rpc('mark_notifications_read', { p_ids: null });
  revalidatePath(`/${locale}/notifications`);
}

export default async function NotificationsPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale: l } = await params;
  if (!isValidLocale(l)) notFound();
  const locale = l as 'ar' | 'en';
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase || !user) {
    return <div className="mx-auto max-w-3xl px-4 py-10 text-sm text-[#a4a6aa]"><Link className="font-bold text-[#e5ed43]" href={`/${locale}/login`}>{tr(locale, 'سجل دخول', 'Sign in')}</Link> {tr(locale, 'عشان تشوف إشعاراتك.', 'to see your notifications.')}</div>;
  }
  await supabase.rpc('sync_my_notifications');
  const { data } = await supabase
    .from('notifications')
    .select('id,kind,source,title_en,title_ar,body_en,body_ar,link,read_at,created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  const rows = (data as NotificationRow[]) ?? [];
  const unread = rows.filter((r) => !r.read_at).length;
  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-8 sm:px-6">
      <PageHero eyebrow={tr(locale, 'الحساب', 'ACCOUNT')} title={tr(locale, 'الإشعارات', 'Notifications')} compact />
      <Card
        right={unread > 0 ? (
          <form action={markAll}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit" className="cursor-pointer text-xs font-extrabold text-[#e5ed43] hover:underline">{tr(locale, 'تعليم الكل كمقروء', 'Mark all read')}</button>
          </form>
        ) : undefined}
        title={tr(locale, `${unread} غير مقروء`, `${unread} unread`)}
      >
        {rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-[#a4a6aa]">{tr(locale, 'مفيش إشعارات لسه.', 'No notifications yet.')}</p>
        ) : (
          <ul className="divide-y divide-[#1f2124]">
            {rows.map((n) => {
              const inner = (
                <div className={`flex gap-3 px-1 py-3 ${n.read_at ? 'opacity-70' : ''}`}>
                  <span className="mt-2 h-2 w-2 shrink-0" style={{ background: n.read_at ? '#2b2d30' : kindTone(n.kind) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-extrabold" style={{ color: kindTone(n.kind) }}>{locale === 'ar' ? n.title_ar : n.title_en}</span>
                      <span className="shrink-0 text-[11px] font-bold text-[#6f7276]">{timeAgo(n.created_at, locale)}</span>
                    </div>
                    <p className="mt-0.5 text-sm text-[#a4a6aa]">{locale === 'ar' ? n.body_ar : n.body_en}</p>
                    {n.source === 'discord_bot' && <span className="mt-1 inline-block bg-[#5865F2]/20 px-1.5 text-[10px] font-extrabold text-[#a5adff]">DISCORD BOT</span>}
                  </div>
                </div>
              );
              return <li key={n.id}>{n.link ? <Link href={`/${locale}${n.link}`} className="block hover:bg-[#151619]">{inner}</Link> : inner}</li>;
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
