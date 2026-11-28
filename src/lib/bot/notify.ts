import { siteUrl } from '@/lib/seo';
import type { SupabaseClient } from '@supabase/supabase-js';

export type NoticeKind = 'checkin_open' | 'checkin_expired';

export interface Notice {
  key: string;                 // tournament_id|kind|registration_id
  tournamentId: string;
  registrationId: string;
  kind: NoticeKind;
  tournament: string;
  slug: string;
  channelIds: string[];
  userId: string;
  username: string;
  teamName: string | null;
  discordUserId: string | null;
  text: string;
  card: NoticeCard;
}

const EXPIRED_WINDOW_MS = 12 * 3600_000; // do not announce "missed" for windows that closed long ago

export interface NoticeCard {
  kind: NoticeKind; tournament: string; teamName: string | null; time: string | null; url: string;
  titleAr: string; titleEn: string; bodyAr: string; bodyEn: string; buttonAr: string; buttonEn: string;
}

export function noticeCard(kind: NoticeKind, tournament: string, slug: string, teamName: string | null, closesAt: string | null): NoticeCard {
  const time = closesAt
    ? new Date(closesAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).replace(',', ' ·')
    : null;
  const open = kind === 'checkin_open';
  const team = !!teamName;
  const base = siteUrl();
  return {
    kind, tournament, teamName, time,
    url: open ? `${base}/ar/tournaments/${slug}/play` : `${base}/ar/tournaments/${slug}`,
    titleAr: open ? '✅ التشيك إن اتفتح' : '⛔ وقت التشيك إن خلص',
    titleEn: open ? '✅ Check-in is open' : '⛔ Check-in has closed',
    bodyAr: open ? (team ? 'يا قائد التيم، اعمل تشيك إن دلوقتي.' : 'اعمل تشيك إن دلوقتي.') : (team ? 'التيم ماعملش تشيك إن، وممكن يتشال.' : 'انت ماعملتش تشيك إن، ومكانك ممكن يتشال.'),
    bodyEn: open ? (team ? 'Team captain, check in now.' : 'Check in now.') : (team ? 'Your team did not check in and may be removed.' : 'You did not check in and your spot may be removed.'),
    buttonAr: open ? 'اعمل تشيك إن' : 'افتح البطولة',
    buttonEn: open ? 'Check in now' : 'Open tournament'
  };
}

export function noticeText(kind: NoticeKind, tournament: string, teamName: string | null, closesAt: string | null): string {
  // Names and times sit on their own lines so Arabic (RTL) and English (LTR) never mix inside one line.
  const time = closesAt
    ? new Date(closesAt).toLocaleString('en-GB', { timeZone: 'Africa/Cairo', hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' }).replace(',', ' ·')
    : null;
  const open = kind === 'checkin_open';
  const ar: string[] = [open ? '✅ التشيك إن اتفتح' : '⛔ وقت التشيك إن خلص'];
  const en: string[] = [open ? '✅ Check-in is open' : '⛔ Check-in has closed'];
  const info = [`🏆 **${tournament}**`];
  if (teamName) info.push(`👥 **${teamName}**`);
  ar.push(...info);
  en.push(...info);
  if (open) {
    ar.push(teamName ? 'يا قائد التيم، اعمل تشيك إن من الموقع' : 'اعمل تشيك إن من الموقع');
    en.push(teamName ? 'Team captain: please check in on the site' : 'Please check in on the site');
    if (time) { ar.push('قبل (بتوقيت القاهرة):'); en.push('Before (Cairo time):'); ar.push(`⏰ ${time}`); en.push(`⏰ ${time}`); }
  } else {
    ar.push(teamName ? 'التيم ماعملش تشيك إن، وممكن يتشال من البطولة' : 'انت ماعملتش تشيك إن، ومكانك ممكن يتشال');
    ar.push('كلم المنظم لو في مشكلة');
    en.push(teamName ? 'Your team did not check in and may be removed' : 'You did not check in and your spot may be removed');
    en.push('Talk to the organizer if this is a mistake');
  }
  // The Arabic lines start with an RTL mark so each paragraph is laid out right-to-left.
  const rtl = (l: string) => (/^[\u0600-\u06FF]/.test(l.replace(/^[^\u0600-\u06FFA-Za-z]+/, '')) ? '\u200F' + l : l);
  return `${ar.map(rtl).join('\n')}\n\n${en.join('\n')}`;
}

async function discordIdOf(sb: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await sb.auth.admin.getUserById(userId);
  const ident = data?.user?.identities?.find((i) => i.provider === 'discord');
  const d = (ident?.identity_data ?? {}) as Record<string, unknown>;
  const id = (d.provider_id ?? d.sub ?? ident?.id) as string | undefined;
  return id && /^\d{15,25}$/.test(String(id)) ? String(id) : null;
}

/** Notices that are due now and not yet recorded. Only tournaments in `slugs` AND linked to a channel. */
export async function dueNotices(sb: SupabaseClient, slugs: string[], now = new Date()): Promise<Notice[]> {
  if (!slugs.length) return [];
  const { data: chans } = await sb.from('bot_channels')
    .select('channel_id,tournament_id,tournaments!inner(id,slug,title_en,checkin_opens_at,checkin_closes_at,status)')
    .in('tournaments.slug', slugs);
  const byT = new Map<string, { t: any; channels: string[] }>();
  for (const c of (chans ?? []) as any[]) {
    const e = byT.get(c.tournament_id) ?? { t: c.tournaments, channels: [] };
    e.channels.push(c.channel_id);
    byT.set(c.tournament_id, e);
  }
  const out: Notice[] = [];
  for (const [tid, { t, channels }] of byT) {
    const opens = t.checkin_opens_at ? new Date(t.checkin_opens_at) : null;
    const closes = t.checkin_closes_at ? new Date(t.checkin_closes_at) : null;
    let kind: NoticeKind | null = null;
    if (opens && opens <= now && (!closes || now < closes)) kind = 'checkin_open';
    else if (closes && closes <= now && now.getTime() - closes.getTime() < EXPIRED_WINDOW_MS) kind = 'checkin_expired';
    if (!kind) continue;
    // 'confirmed' = approved but not checked in yet.
    const { data: regs } = await sb.from('registrations').select('id,user_id,team_id').eq('tournament_id', tid).eq('status', 'confirmed');
    if (!regs?.length) continue;
    const { data: sent } = await sb.from('bot_notified').select('registration_id').eq('tournament_id', tid).eq('kind', kind);
    const done = new Set((sent ?? []).map((r: any) => r.registration_id));
    const todo = regs.filter((r: any) => !done.has(r.id));
    if (!todo.length) continue;
    const teamIds = todo.map((r: any) => r.team_id).filter(Boolean);
    const { data: teams } = teamIds.length ? await sb.from('teams').select('id,name,captain_id').in('id', teamIds) : { data: [] as any[] };
    const teamMap = new Map((teams ?? []).map((x: any) => [x.id, x]));
    for (const r of todo as any[]) {
      const team = r.team_id ? teamMap.get(r.team_id) : null;
      const uid: string | null = r.team_id ? team?.captain_id ?? null : r.user_id;
      if (!uid) continue;
      const { data: prof } = await sb.from('player_profiles').select('username').eq('id', uid).maybeSingle();
      out.push({
        key: `${tid}|${kind}|${r.id}`, tournamentId: tid, registrationId: r.id, kind,
        tournament: t.title_en, slug: t.slug, channelIds: channels,
        userId: uid, username: prof?.username ?? '?', teamName: team?.name ?? null,
        discordUserId: await discordIdOf(sb, uid),
        text: noticeText(kind, t.title_en, team?.name ?? null, t.checkin_closes_at),
        card: noticeCard(kind, t.title_en, t.slug, team?.name ?? null, t.checkin_closes_at)
      });
    }
  }
  return out;
}

export async function recordNotices(sb: SupabaseClient, rows: { tournamentId: string; kind: NoticeKind; registrationId: string; outcome: 'dm' | 'failed' | 'no_discord' }[]) {
  if (!rows.length) return;
  await sb.from('bot_notified').upsert(
    rows.map((r) => ({ tournament_id: r.tournamentId, kind: r.kind, registration_id: r.registrationId, outcome: r.outcome })),
    { onConflict: 'tournament_id,kind,registration_id', ignoreDuplicates: true }
  );
}

export interface AckRow {
  tournamentId: string; registrationId: string; kind: NoticeKind; outcome: 'dm' | 'failed' | 'no_discord';
  userId?: string; slug?: string; tournament?: string; teamName?: string | null;
}

/** Mirror the bot's DM result into the site notification bell (only "DM sent" / "could not DM"; the site makes the check-in notices itself). */
export async function mirrorToBell(sb: SupabaseClient, rows: AckRow[]) {
  for (const r of rows) {
    if (!r.userId || !r.slug) continue;
    const t = r.tournament ?? r.slug;
    const who = r.teamName ? ` (${r.teamName})` : '';
    const open = r.kind === 'checkin_open';
    const sent = r.outcome === 'dm';
    const p = {
      p_user: r.userId,
      p_kind: sent ? 'bot_checkin_dm_sent' : 'bot_checkin_dm_failed',
      p_title_en: sent ? 'Discord reminder sent' : 'Could not DM you on Discord',
      p_title_ar: sent ? 'تم إرسال تنبيه على ديسكورد' : 'مقدرناش نبعتلك دي إم على ديسكورد',
      p_body_en: sent
        ? `We sent you a Discord DM about ${open ? 'check-in opening' : 'missed check-in'} for ${t}${who}.`
        : `${open ? 'Check-in is open' : 'Check-in closed'} for ${t}${who}. We could not DM you on Discord${r.outcome === 'no_discord' ? ' (no Discord account linked)' : ' (DMs may be blocked)'}, so check the site.`,
      p_body_ar: sent
        ? `بعتنالك دي إم على ديسكورد بخصوص ${open ? 'فتح التشيك إن' : 'فوات التشيك إن'} في ${t}${who}.`
        : `${open ? 'التشيك إن مفتوح' : 'التشيك إن خلص'} في ${t}${who}. مقدرناش نبعتلك دي إم على ديسكورد${r.outcome === 'no_discord' ? ' (مفيش حساب ديسكورد مربوط)' : ' (ممكن الدي إم مقفولة)'}، فشوف الموقع.`,
      p_link: `/tournaments/${r.slug}`,
      p_source: 'discord_bot',
      p_dedupe: `${open ? 'bot_dm_open' : 'bot_dm_expired'}:${r.registrationId}`
    };
    await sb.rpc('notify_user', p);
  }
}
