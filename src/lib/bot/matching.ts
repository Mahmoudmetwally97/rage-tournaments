import type { ExtractedScreenshot, MatchedRow, Resolution, RoomCandidate, RosterEntry } from './types';

const CONFUSABLE: Record<string, string> = { '0': 'o', '1': 'l', 'i': 'l', '5': 's', '$': 's', '@': 'a', '3': 'e', '8': 'b' };

/** Lowercase, drop [CLAN] tags, spaces and punctuation, fold look-alike characters. */
export function normalizeName(raw: string): string {
  const noTag = raw.replace(/[\[(【][^\])】]{1,8}[\])】]/g, '');
  const s = noTag
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}$@]/gu, '');
  return [...s].map((c) => CONFUSABLE[c] ?? c).join('');
}

export function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length]!;
}

/** 1 = identical after normalisation, 0 = nothing in common. */
export function nameSimilarity(a: string, b: string): number {
  const x = normalizeName(a);
  const y = normalizeName(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const max = Math.max(x.length, y.length);
  let sim = 1 - levenshtein(x, y) / max;
  // A clean prefix/suffix hit (name cut off in the UI) counts as strong, but never perfect.
  if (Math.min(x.length, y.length) >= 4 && (x.startsWith(y) || y.startsWith(x))) sim = Math.max(sim, 0.9);
  return Math.max(0, sim);
}

export const NAME_MATCH_MIN = 0.78;
export const AMBIGUITY_GAP = 0.06;

export interface NameMatch { entry: RosterEntry | null; score: number; ambiguous: boolean }

export function matchName(read: string, roster: RosterEntry[], taken: Set<string> = new Set()): NameMatch {
  const scored = roster
    .filter((r) => !taken.has(r.registration_id))
    .map((r) => ({
      entry: r,
      score: Math.max(nameSimilarity(read, r.ign), r.discord_handle ? nameSimilarity(read, r.discord_handle) * 0.95 : 0)
    }))
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (!best || best.score < NAME_MATCH_MIN) return { entry: null, score: best?.score ?? 0, ambiguous: false };
  const second = scored[1];
  const ambiguous = Boolean(second && second.score >= NAME_MATCH_MIN && best.score - second.score < AMBIGUITY_GAP);
  return { entry: best.entry, score: best.score, ambiguous };
}

function matchRowsToRoster(extracted: ExtractedScreenshot, roster: RosterEntry[]): { rows: MatchedRow[]; ambiguous: number } {
  const taken = new Set<string>();
  let ambiguous = 0;
  // Match the most certain names first so a weak read cannot steal a registration.
  const order = extracted.rows
    .map((r, i) => ({ r, i, s: Math.max(0, ...roster.map((e) => nameSimilarity(r.name, e.ign))) }))
    .sort((a, b) => b.s - a.s);
  const out: MatchedRow[] = new Array(extracted.rows.length);
  for (const { r, i } of order) {
    const m = matchName(r.name, roster, taken);
    if (m.entry) taken.add(m.entry.registration_id);
    if (m.ambiguous) ambiguous++;
    out[i] = {
      registration_id: m.entry?.registration_id ?? null,
      ign: m.entry?.ign ?? null,
      read_name: r.name,
      rank: r.rank,
      kills: r.kills,
      match_score: Number(m.score.toFixed(3)),
      confidence: Number((Math.min(1, Math.max(0, r.confidence)) * (m.entry ? m.score : 0)).toFixed(3))
    };
  }
  return { rows: out, ambiguous };
}

export function parseRoomNumber(label: string | null | undefined): number | null {
  if (!label) return null;
  const arDigits = label.replace(/[\u0660-\u0669]/g, (d) => String(d.charCodeAt(0) - 0x0660));
  const m = arDigits.match(/(\d{1,3})/);
  return m ? Number(m[1]) : null;
}

/**
 * Pick the room (by roster overlap, cross-checked with the printed room label / channel hint),
 * match every row to a registered player and compute a confidence + the list of problems.
 */
export function resolveSubmission(
  extracted: ExtractedScreenshot,
  rooms: RoomCandidate[],
  opts: { roomHint?: string | null; maxKills?: number } = {}
): Resolution {
  const issues: string[] = [];
  if (!extracted.is_results_screen || extracted.rows.length === 0) {
    return { room: null, match_id: null, rows: [], issues: ['not_a_results_screen'], confidence: 0 };
  }
  if (rooms.length === 0) {
    return { room: null, match_id: null, rows: [], issues: ['no_active_stage_rooms'], confidence: 0 };
  }

  // 1. Choose room by overlap.
  const scored = rooms.map((room) => {
    const { rows } = matchRowsToRoster(extracted, room.roster);
    const hits = rows.filter((r) => r.registration_id).length;
    return { room, hits };
  }).sort((a, b) => b.hits - a.hits);
  const top = scored[0]!;
  const runnerUp = scored[1];
  let room: RoomCandidate | null = top.hits >= Math.max(2, Math.ceil(extracted.rows.length * 0.5)) ? top.room : null;
  if (room && runnerUp && runnerUp.hits === top.hits && top.hits < extracted.rows.length) issues.push('room_ambiguous');

  // 2. Cross-check with the room label / channel hint.
  const printed = parseRoomNumber(extracted.room) ?? parseRoomNumber(opts.roomHint ?? null);
  if (printed !== null) {
    const byLabel = rooms.find((r) => r.group_order === printed);
    if (!room && byLabel) room = byLabel;
    else if (room && byLabel && byLabel.group_id !== room.group_id) issues.push('room_label_mismatch');
  }
  if (!room) {
    return { room: null, match_id: null, rows: matchRowsToRoster(extracted, rooms.flatMap((r) => r.roster)).rows, issues: [...issues, 'room_not_identified'], confidence: 0 };
  }

  // 3. Rows against that room's roster.
  const { rows, ambiguous } = matchRowsToRoster(extracted, room.roster);
  const unmatched = rows.filter((r) => !r.registration_id);
  if (unmatched.length) issues.push(`unmatched_players:${unmatched.map((r) => r.read_name).join('|')}`);
  if (ambiguous) issues.push('ambiguous_names');
  const ids = rows.map((r) => r.registration_id).filter(Boolean);
  if (new Set(ids).size !== ids.length) issues.push('duplicate_player');

  const ranks = rows.map((r) => r.rank).filter((x): x is number => x !== null);
  if (ranks.length < rows.length) issues.push('missing_rank');
  if (new Set(ranks).size !== ranks.length) issues.push('duplicate_rank');
  if (ranks.some((r) => r < 1 || r > room!.roster.length)) issues.push('rank_out_of_range');
  if (rows.some((r) => r.kills === null)) issues.push('missing_kills');
  const maxKills = opts.maxKills ?? 100;
  if (rows.some((r) => (r.kills ?? 0) < 0 || (r.kills ?? 0) > maxKills)) issues.push('kills_out_of_range');
  if (rows.length < room.roster.length) issues.push(`missing_players:${room.roster.length - rows.length}`);
  if (rows.length > room.roster.length) issues.push('more_rows_than_roster');

  // 4. Which round (match) of the room: first one without a completed result.
  const open = [...room.matches].sort((a, b) => a.round_number - b.round_number).filter((m) => m.status !== 'completed');
  let match = open[0] ?? null;
  if (extracted.round) {
    const byRound = room.matches.find((m) => m.round_number === extracted.round);
    if (byRound) {
      if (byRound.status === 'completed') issues.push('round_already_completed');
      match = byRound;
    }
  } else if (!match) {
    issues.push('room_already_completed');
  }

  // 5. Confidence: weakest-link style, so one bad row drags the whole submission down.
  const rowConf = rows.length ? Math.min(...rows.map((r) => r.confidence)) : 0;
  const meanConf = rows.length ? rows.reduce((a, r) => a + r.confidence, 0) / rows.length : 0;
  let conf = Math.min(extracted.overall_confidence, 0.5 * rowConf + 0.5 * meanConf);
  const hard = issues.filter((i) => !i.startsWith('missing_players')).length;
  conf *= Math.pow(0.8, hard) * (issues.some((i) => i.startsWith('missing_players')) ? 0.9 : 1);
  return { room, match_id: match?.match_id ?? null, rows, issues, confidence: Number(Math.max(0, Math.min(1, conf)).toFixed(3)) };
}
