import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { resolveSubmission } from './matching';
import { readScreenshot } from './vision';
import type { ExtractedScreenshot, RoomCandidate } from './types';

export function serviceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('NO_SERVICE_KEY');
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

/** Rooms of the live stage, with rosters and rounds. */
export async function loadRooms(sb: SupabaseClient, tournamentId: string) {
  const { data: t } = await sb.from('tournaments').select('id,status,title_en').eq('id', tournamentId).maybeSingle();
  if (!t) return { tournament: null, stage: null, rooms: [] as RoomCandidate[] };
  const { data: stage } = await sb.from('stages').select('id,stage_order,name_en,status').eq('tournament_id', tournamentId)
    .eq('status', 'active').order('stage_order', { ascending: true }).limit(1).maybeSingle();
  if (!stage) return { tournament: t, stage: null, rooms: [] as RoomCandidate[] };
  const { data: groups } = await sb.from('groups').select('id,name,group_order').eq('stage_id', stage.id).order('group_order');
  const gids = (groups ?? []).map((g) => g.id);
  const [{ data: parts }, { data: matches }] = await Promise.all([
    sb.from('group_participants').select('group_id,registration_id,registrations(ign_snapshot,player_profiles:user_id(discord_handle))').in('group_id', gids),
    sb.from('matches').select('id,group_id,round_number,status').eq('stage_id', stage.id)
  ]);
  const rooms: RoomCandidate[] = (groups ?? []).map((g) => ({
    group_id: g.id,
    group_name: g.name,
    group_order: g.group_order,
    roster: (parts ?? []).filter((p: any) => p.group_id === g.id).map((p: any) => ({
      registration_id: p.registration_id,
      ign: p.registrations?.ign_snapshot ?? '',
      discord_handle: p.registrations?.player_profiles?.discord_handle ?? null
    })),
    matches: (matches ?? []).filter((m) => m.group_id === g.id).map((m) => ({ match_id: m.id, round_number: m.round_number, status: m.status }))
  }));
  return { tournament: t, stage, rooms };
}

export interface IngestInput {
  channelId: string;
  guildId?: string;
  messageId: string;
  imageUrl: string;
  authorDiscordId?: string;
}

export interface IngestResult {
  outcome: 'pending' | 'unreadable' | 'ignored' | 'duplicate' | 'not_live' | 'unlinked';
  submission_id?: string;
  confidence?: number;
  issues?: string[];
  summary?: SubmissionSummary;
  reason?: string;
}

export interface SubmissionSummary {
  tournament: string;
  stage: string;
  room: string | null;
  round: number | null;
  rows: { rank: number | null; name: string; registered_as: string | null; kills: number | null; confidence: number }[];
}

export async function ingestScreenshot(input: IngestInput, extractor: typeof readScreenshot = readScreenshot): Promise<IngestResult> {
  const sb = serviceClient();
  const { data: link } = await sb.from('bot_channels').select('*').eq('channel_id', input.channelId).maybeSingle();
  if (!link) return { outcome: 'unlinked' };

  const { tournament, stage, rooms } = await loadRooms(sb, link.tournament_id);
  if (!tournament || tournament.status !== 'live' || !stage) {
    return { outcome: 'not_live', reason: !tournament ? 'tournament_missing' : tournament.status !== 'live' ? `status_${tournament.status}` : 'no_active_stage' };
  }

  let extracted: ExtractedScreenshot; let sha: string;
  try {
    ({ extracted, sha256: sha } = await extractor(input.imageUrl));
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'VISION_ERROR';
    const { data } = await sb.from('bot_submissions').insert({
      tournament_id: tournament.id, stage_id: stage.id, guild_id: input.guildId, channel_id: input.channelId,
      message_id: input.messageId, submitted_by_discord_id: input.authorDiscordId, image_url: input.imageUrl,
      status: 'unreadable', issues: [reason]
    }).select('id').single();
    return { outcome: 'unreadable', submission_id: data?.id, reason };
  }

  if (!extracted.is_results_screen) return { outcome: 'ignored', reason: 'not_a_results_screen' };

  const { data: dup } = await sb.from('bot_submissions').select('id,status').eq('tournament_id', tournament.id)
    .eq('image_sha256', sha).in('status', ['pending', 'approved']).limit(1).maybeSingle();
  if (dup) return { outcome: 'duplicate', submission_id: dup.id, reason: `already_${dup.status}` };

  const res = resolveSubmission(extracted, rooms, { roomHint: link.room_hint });
  const status = res.rows.length === 0 ? 'unreadable' : 'pending';
  const { data: row, error } = await sb.from('bot_submissions').insert({
    tournament_id: tournament.id, stage_id: stage.id, match_id: res.match_id, guild_id: input.guildId,
    channel_id: input.channelId, message_id: input.messageId, submitted_by_discord_id: input.authorDiscordId,
    image_url: input.imageUrl, image_sha256: sha, extracted, rows: res.rows, confidence: res.confidence,
    issues: res.issues, status
  }).select('id').single();
  if (error) return { outcome: 'duplicate', reason: error.message };

  return {
    outcome: status === 'pending' ? 'pending' : 'unreadable',
    submission_id: row.id,
    confidence: res.confidence,
    issues: res.issues,
    summary: {
      tournament: tournament.title_en,
      stage: stage.name_en,
      room: res.room?.group_name ?? null,
      round: res.room?.matches.find((m) => m.match_id === res.match_id)?.round_number ?? null,
      rows: [...res.rows].sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99)).map((r) => ({
        rank: r.rank, name: r.read_name, registered_as: r.ign, kills: r.kills, confidence: r.confidence
      }))
    }
  };
}

export async function approverRow(sb: SupabaseClient, discordUserId: string): Promise<{ user_id: string | null } | null> {
  const owner = process.env.BOT_OWNER_DISCORD_ID;
  if (owner && owner === discordUserId) return { user_id: null };
  const { data } = await sb.from('bot_approvers').select('user_id').eq('discord_user_id', discordUserId).maybeSingle();
  return data ?? null;
}

export async function isApprover(discordUserId: string): Promise<boolean> {
  return Boolean(await approverRow(serviceClient(), discordUserId));
}

export async function linkChannel(i: { discordUserId: string; guildId: string; channelId: string; tournamentSlug: string; roomHint?: string }) {
  const sb = serviceClient();
  const { data: t } = await sb.from('tournaments').select('id,title_en,status').eq('slug', i.tournamentSlug).maybeSingle();
  if (!t) return { ok: false as const, error: 'TOURNAMENT_NOT_FOUND' };
  const { error } = await sb.from('bot_channels').upsert({
    guild_id: i.guildId, channel_id: i.channelId, tournament_id: t.id, room_hint: i.roomHint ?? null, linked_by_discord_id: i.discordUserId
  }, { onConflict: 'channel_id' });
  return error ? { ok: false as const, error: error.message } : { ok: true as const, tournament: t.title_en, status: t.status };
}

/** Approve/reject from Discord (button or reaction). Only listed Discord approvers; same SQL path as the dashboard. */
export async function decideFromDiscord(i: { submissionId?: string; channelId?: string; messageId?: string; discordUserId: string; decision: 'approve' | 'reject' }) {
  const sb = serviceClient();
  const appr = await approverRow(sb, i.discordUserId);
  if (!appr) return { ok: false as const, error: 'NOT_APPROVER' };
  let submissionId = i.submissionId;
  if (!submissionId) {
    const { data } = await sb.from('bot_submissions').select('id').eq('channel_id', i.channelId!)
      .or(`message_id.eq.${i.messageId},bot_message_id.eq.${i.messageId}`).eq('status', 'pending').limit(1).maybeSingle();
    if (!data) return { ok: false as const, error: 'NO_PENDING_SUBMISSION' };
    submissionId = data.id;
  }
  if (i.decision === 'reject') {
    const { error } = await sb.from('bot_submissions').update({
      status: 'rejected', decided_by: appr.user_id, decided_by_discord_id: i.discordUserId, decided_at: new Date().toISOString()
    }).eq('id', submissionId).eq('status', 'pending');
    return error ? { ok: false as const, error: error.message } : { ok: true as const, submissionId };
  }
  const { data, error } = await sb.rpc('_apply_bot_submission', {
    p_submission_id: submissionId, p_actor: appr.user_id, p_actor_discord: i.discordUserId
  });
  return error ? { ok: false as const, error: error.message } : { ok: true as const, submissionId, result: data };
}

/** Worker reports the id of the embed it posted so a ✅ on it can be matched. */
export async function attachBotMessage(submissionId: string, botMessageId: string) {
  await serviceClient().from('bot_submissions').update({ bot_message_id: botMessageId }).eq('id', submissionId);
}
