'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { kindTone, timeAgo, type NotificationRow } from '@/lib/notifications';

const COLS = 'id,kind,source,title_en,title_ar,body_en,body_ar,link,read_at,created_at';

export function NotificationBell({ locale, userId }: { locale: 'ar' | 'en'; userId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [unread, setUnread] = useState(0);
  const t = (ar: string, en: string) => (locale === 'ar' ? ar : en);

  const load = useCallback(async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    await sb.rpc('sync_my_notifications');
    const [{ data }, { count }] = await Promise.all([
      sb.from('notifications').select(COLS).eq('user_id', userId).order('created_at', { ascending: false }).limit(15),
      sb.from('notifications').select('id', { count: 'exact', head: true }).eq('user_id', userId).is('read_at', null)
    ]);
    setItems((data as NotificationRow[]) ?? []);
    setUnread(count ?? 0);
  }, [userId]);

  useEffect(() => {
    void load();
    const i = setInterval(() => void load(), 60000);
    return () => clearInterval(i);
  }, [load]);

  async function markRead(ids: string[] | null) {
    const sb = getSupabaseBrowserClient();
    if (!sb) return;
    await sb.rpc('mark_notifications_read', { p_ids: ids });
    void load();
  }

  function openItem(n: NotificationRow) {
    setOpen(false);
    if (!n.read_at) void markRead([n.id]);
    if (n.link) router.push(`/${locale}${n.link}`);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setOpen((v) => !v); if (!open) void load(); }}
        aria-label={t('الإشعارات', 'Notifications')}
        aria-expanded={open}
        className="relative inline-flex h-9 w-9 cursor-pointer items-center justify-center border border-[#2b2d30] bg-[#151619] text-[#d6d7d2] hover:border-[#3a3d40] hover:text-[#e5ed43]"
      >
        <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 10-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 01-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -end-1.5 -top-1.5 min-w-[18px] bg-[#e5ed43] px-1 text-center text-[10px] font-extrabold leading-[18px] text-[#0d0e10]">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <button type="button" aria-label="close" className="fixed inset-0 z-40 cursor-default" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-3 top-[5.5rem] z-50 sm:absolute sm:inset-x-auto sm:end-0 sm:top-full sm:mt-2 sm:w-[22rem] border border-[#2b2d30] bg-[#101113] shadow-xl">
            <div className="flex items-center justify-between border-b border-[#2b2d30] px-4 py-3">
              <span className="text-sm font-extrabold text-[#f4f4ed]">{t('الإشعارات', 'Notifications')}</span>
              {unread > 0 && (
                <button type="button" onClick={() => void markRead(null)} className="cursor-pointer text-xs font-bold text-[#e5ed43] hover:underline">
                  {t('تعليم الكل كمقروء', 'Mark all read')}
                </button>
              )}
            </div>
            <div className="max-h-[26rem] overflow-y-auto">
              {items.length === 0 ? (
                <p className="px-4 py-8 text-center text-sm text-[#a4a6aa]">{t('مفيش إشعارات لسه.', 'No notifications yet.')}</p>
              ) : (
                items.map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => openItem(n)}
                    className={`flex w-full cursor-pointer gap-3 border-b border-[#1f2124] px-4 py-3 text-start hover:bg-[#1b1d20] ${n.read_at ? '' : 'bg-[#e5ed43]/[0.04]'}`}
                  >
                    <span className="mt-1.5 h-2 w-2 shrink-0" style={{ background: n.read_at ? 'transparent' : kindTone(n.kind) }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-extrabold" style={{ color: kindTone(n.kind) }}>{locale === 'ar' ? n.title_ar : n.title_en}</span>
                        <span className="shrink-0 text-[10px] font-bold text-[#6f7276]">{timeAgo(n.created_at, locale)}</span>
                      </span>
                      <span className="mt-0.5 block text-xs leading-5 text-[#a4a6aa]">{locale === 'ar' ? n.body_ar : n.body_en}</span>
                      {n.source === 'discord_bot' && <span className="mt-1 inline-block bg-[#5865F2]/20 px-1.5 text-[10px] font-extrabold text-[#a5adff]">DISCORD BOT</span>}
                    </span>
                  </button>
                ))
              )}
            </div>
            <Link href={`/${locale}/notifications`} onClick={() => setOpen(false)} className="block px-4 py-3 text-center text-xs font-extrabold text-[#e5ed43] hover:bg-[#1b1d20]">
              {t('كل الإشعارات', 'View all notifications')}
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
