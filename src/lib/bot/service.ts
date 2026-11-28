import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { matchRowsToRoster, resolveSubmission } from './matching';
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
  outcome: 'pending' | 'lobby' | 'unreadable' | 'ignored' | 'duplicate' | 'not_live' | 'unlinked';
  submission_id?: string;
  confidence?: number;
  issues?: string[];
  summary?: SubmissionSummary;
  lobby?: LobbySummary;
  reason?: string;
}

export interface LobbySummary {
  tournament: string; room_label: string | null; mode: string | null; map: string | null;
  group_name: string | null; matched: number; total: number; unmatched: string[]; flags: string[]; proof_id?: string;
}

export interface SubmissionSummary {
  tournament: string;
  stage: string;
  room: string | null;
  round: number | null;
  rows: { rank: number | null; name: string; registered_as: string | null; kills: number | null; confidence: number }[];
}

async function handleLobby(
  sb: SupabaseClient, input: IngestInput, tournament: { id: string; title_en: string }, stage: { id: string } | null,
  rooms: RoomCandidate[], extracted: ExtractedScreenshot, sha: string
): Promise<IngestResult> {
  const flags: string[] = [];
  const names = extracted.rows.map((r) => r.name).filter(Boolean);
  if (names.length < 2) return { outcome: 'ignored', reason: 'lobby_without_players' };

  // Roster to compare with: the room with the most name hits, else every registered player of the stage.
  let roster = rooms.flatMap((r) => r.roster);
  let room: RoomCandidate | null = null;
  if (rooms.length) {
    const scored = rooms.map((r) => ({ r, hits: matchRowsToRoster(extracted, r.roster).rows.filter((x) => x.registration_id).length })).sort((a, b) => b.hits - a.hits);
    const top = scored[0]!;
    if (top.hits >= Math.max(2, Math.ceil(names.length * 0.5))) {
      room = top.r; roster = top.r.roster;
      if (scored[1] && scored[1].hits === top.hits) flags.push('room_ambiguous');
    } else flags.push('room_not_identified');
  } else {
    flags.push('no_active_stage_rooms');
    const { data: regs } = await sb.from('registrations').select('id,ign_snapshot').eq('tournament_id', tournament.id).eq('status', 'confirmed');
    roster = (regs ?? []).map((r: any) => ({ registration_id: r.id, ign: r.ign_snapshot ?? '' }));
  }
  const { rows } = matchRowsToRoster(extracted, roster);
  const unmatched = rows.filter((r) => !r.registration_id).map((r) => r.read_name);
  if (unmatched.length) flags.push(`unregistered_players:${unmatched.join('|')}`);
  if (room && rows.length < room.roster.length) flags.push(`missing_players:${room.roster.length - rows.length}`);
  if (room && rows.length > room.roster.length) flags.push('more_players_than_roster');
  const ids = rows.map((r) => r.registration_id).filter(Boolean);
  if (new Set(ids).size !== ids.length) flags.push('duplicate_player');
  if (!extracted.room) flags.push('room_number_not_visible');
  if (!extracted.mode) flags.push('mode_not_visible');
  if (!extracted.map) flags.push('map_not_visible');

  const { data: dup } = await sb.from('bot_lobby_proofs').select('id').eq('tournament_id', tournament.id).eq('image_sha256', sha).limit(1).maybeSingle();
  if (dup) flags.push('same_image_already_submitted');
  if (extracted.room && !dup) {
    const { data: same } = await sb.from('bot_lobby_proofs').select('id,submitted_by_discord_id,image_sha256').eq('tournament_id', tournament.id).eq('room_label', extracted.room).limit(5);
    if ((same ?? []).some((x: any) => x.image_sha256 !== sha)) flags.push('room_number_used_by_another_proof');
  }

  const { data: row, error } = await sb.from('bot_lobby_proofs').insert({
    tournament_id: tournament.id, stage_id: stage?.id ?? null, group_id: room?.group_id ?? null, guild_id: input.guildId,
    channel_id: input.channelId, message_id: input.messageId, submitted_by_discord_id: input.authorDiscordId,
    image_url: input.imageUrl, image_sha256: sha, extracted, room_label: extracted.room, mode: extracted.mode, map: extracted.map ?? null,
    players: rows.map((r) => ({ read_name: r.read_name, registration_id: r.registration_id, ign: r.ign, match_score: r.match_score })),
    matched: rows.length - unmatched.length, total: rows.length, flags
  }).select('id').single();
  if (error) return { outcome: 'duplicate', reason: error.message };
  return {
    outcome: 'lobby', submission_id: row.id,
    lobby: {
      tournament: tournament.title_en, room_label: extracted.room, mode: extracted.mode, map: extracted.map ?? null,
      group_name: room?.group_name ?? null, matched: rows.length - unmatched.length, total: rows.length, unmatched, flags, proof_id: row.id
    }
  };
}

async function lobbyNote(sb: SupabaseClient, tournamentId: string, groupId: string, rows: { registration_id: string | null }[]): Promise<string> {
  try {
    const { data } = await sb.from('bot_lobby_proofs').select('room_label,matched,total,players').eq('tournament_id', tournamentId).eq('group_id', groupId)
      .order('created_at', { ascending: false }).limit(1).maybeSingle();
    if (!data) return 'lobby_proof:none for this room';
    const inLobby = new Set(((data.players ?? []) as any[]).map((p) => p.registration_id).filter(Boolean));
    const notInLobby = rows.filter((r) => r.registration_id && !inLobby.has(r.registration_id)).length;
    const base = `lobby_proof:found (room ${data.room_label ?? '?'}, ${data.matched}/${data.total} names registered)`;
    return notInLobby ? `${base}, ${notInLobby} result player(s) not seen in the lobby` : `${base}, players match`;
  } catch { return 'lobby_proof:could not check'; }
}

export async function ingestScreenshot(input: IngestInput, extractor: typeof readScreenshot = readScreenshot): Promise<IngestResult> {
  const sb = serviceClient();
  const { data: link } = await sb.from('bot_channels').select('*').eq('channel_id', input.channelId).maybeSingle();
  if (!link) return { outcome: 'unlinked' };

  const { tournament, stage, rooms } = await loadRooms(sb, link.tournament_id);
  if (!tournament) return { outcome: 'not_live', reason: 'tournament_missing' };
  const isLive = tournament.status === 'live' && Boolean(stage);

  let extracted: ExtractedScreenshot; let sha: string;
  try {
    ({ extracted, sha256: sha } = await extractor(input.imageUrl));
  } catch (e) {
    const reason = e instanceof Error ? e.message : 'VISION_ERROR';
    const { data } = await sb.from('bot_submissions').insert({
      tournament_id: tournament.id, stage_id: stage?.id ?? null, guild_id: input.guildId, channel_id: input.channelId,
      message_id: input.messageId, submitted_by_discord_id: input.authorDiscordId, image_url: input.imageUrl,
      status: 'unreadable', issues: [reason]
    }).select('id').single();
    return { outcome: 'unreadable', submission_id: data?.id, reason };
  }

  if (extracted.screen_type === 'lobby') {
    try { return await handleLobby(sb, input, tournament, stage, rooms, extracted, sha); }
    catch (e) { return { outcome: 'ignored', reason: `lobby_error:${e instanceof Error ? e.message : 'x'}` }; }
  }
  if (!extracted.is_results_screen) return { outcome: 'ignored', reason: 'not_a_results_screen' };
  if (!isLive || !stage) return { outcome: 'not_live', reason: tournament.status !== 'live' ? `status_${tournament.status}` : 'no_active_stage' };

  const { data: dup } = await sb.from('bot_submissions').select('id,status').eq('tournament_id', tournament.id)
    .eq('image_sha256', sha).in('status', ['pending', 'approved']).limit(1).maybeSingle();
  if (dup) return { outcome: 'duplicate', submission_id: dup.id, reason: `already_${dup.status}` };

  const res = resolveSubmission(extracted, rooms, { roomHint: link.room_hint });
  if (res.room) res.issues.push(await lobbyNote(sb, tournament.id, res.room.group_id, res.rows));
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
  // Owner only: every command, button and reaction is accepted from this one Discord account. Nobody else.
  void sb;
  if (owner && owner === discordUserId) return { user_id: null };
  return null;
}

export async function isApprover(discordUserId: string): Promise<boolean> {
  return Boolean(await approverRow(serviceClient(), discordUserId));
}

/** Match by exact slug first, then by part of slug or title (English or Arabic). Any status. */
export async function findTournaments(sb: ReturnType<typeof serviceClient>, q: string) {
  const term = q.trim();
  if (!term) return [] as { id: string; slug: string; title_en: string; status: string }[];
  const exact = await sb.from('tournaments').select('id,slug,title_en,status').eq('slug', term).maybeSingle();
  if (exact.data) return [exact.data as any];
  const safe = term.replace(/[%,()_]/g, ' ').trim();
  const slugish = safe.toLowerCase().replace(/\s+/g, '-');
  const { data } = await sb.from('tournaments').select('id,slug,title_en,status')
    .or(`slug.ilike.%${slugish}%,title_en.ilike.%${safe}%,title_ar.ilike.%${safe}%`).order('created_at', { ascending: false }).limit(10);
  const rows = (data ?? []) as any[];
  const eq = rows.filter((r) => r.title_en.toLowerCase() === safe.toLowerCase());
  return eq.length === 1 ? eq : rows;
}

export async function searchTournaments(q: string) {
  const sb = serviceClient();
  if (!q.trim()) {
    const { data } = await sb.from('tournaments').select('slug,title_en,status').order('created_at', { ascending: false }).limit(10);
    return (data ?? []) as any[];
  }
  return (await findTournaments(sb, q)).slice(0, 10);
}

export async function linkChannel(i: { discordUserId: string; guildId: string; channelId: string; tournamentSlug: string; roomHint?: string }) {
  const sb = serviceClient();
  const found = await findTournaments(sb, i.tournamentSlug);
  if (found.length === 0) return { ok: false as const, error: 'TOURNAMENT_NOT_FOUND (type part of the name or slug, or pick from the suggestions)' };
  if (found.length > 1) return { ok: false as const, error: `More than one match: ${found.slice(0, 5).map((x) => `${x.title_en} [${x.slug}]`).join(' | ')}. Type the exact slug.` };
  const t = found[0];
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
