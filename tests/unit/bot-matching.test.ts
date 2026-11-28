import { describe, expect, it } from 'vitest';
import { nameSimilarity, normalizeName, resolveSubmission, parseRoomNumber } from '@/lib/bot/matching';
import type { ExtractedScreenshot, RoomCandidate } from '@/lib/bot/types';

const names = ['Shadow_X', 'N1ghtWolf', 'Ahmed99', 'ViperKSA', 'Zoro', 'Falcon', 'Ghost', 'Rex'];
const room = (order: number, list: string[]): RoomCandidate => ({
  group_id: `g${order}`,
  group_name: `Room ${order}`,
  group_order: order,
  roster: list.map((n, i) => ({ registration_id: `r${order}-${i}`, ign: n })),
  matches: [{ match_id: `m${order}-1`, round_number: 1, status: 'scheduled' }, { match_id: `m${order}-2`, round_number: 2, status: 'scheduled' }]
});
const shot = (rows: [string, number, number, number?][], extra: Partial<ExtractedScreenshot> = {}): ExtractedScreenshot => ({
  is_results_screen: true, room: null, round: null, mode: null, overall_confidence: 0.95,
  rows: rows.map(([name, rank, kills, confidence]) => ({ name, rank, kills, confidence: confidence ?? 0.95 })), ...extra
});

describe('bot name matching', () => {
  it('folds clan tags, case and look-alikes', () => {
    expect(normalizeName('[RG] Shadow_X')).toBe(normalizeName('shadow x'));
    expect(nameSimilarity('N1ghtWolf', 'NightWolf')).toBeGreaterThan(0.9);
    expect(nameSimilarity('Ahmed99', 'Zoro')).toBeLessThan(0.4);
  });
  it('reads Arabic room digits', () => {
    expect(parseRoomNumber('غرفة ٣')).toBe(3);
    expect(parseRoomNumber('Room 12')).toBe(12);
    expect(parseRoomNumber(null)).toBeNull();
  });
});

describe('resolveSubmission', () => {
  const rooms = [room(1, names), room(2, ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel'])];

  it('clean screenshot: right room, all matched, high confidence, first open round', () => {
    const r = resolveSubmission(shot(names.map((n, i) => [n, i + 1, 8 - i] as [string, number, number])), rooms);
    expect(r.room?.group_name).toBe('Room 1');
    expect(r.match_id).toBe('m1-1');
    expect(r.rows.every((x) => x.registration_id)).toBe(true);
    expect(r.issues).toEqual([]);
    expect(r.confidence).toBeGreaterThan(0.85);
  });

  it('misread letters still match but lower confidence than clean', () => {
    const clean = resolveSubmission(shot(names.map((n, i) => [n, i + 1, 3] as [string, number, number])), rooms);
    const noisy = resolveSubmission(shot(names.map((n, i) => [i === 1 ? 'NightWo1f' : n, i + 1, 3, i === 1 ? 0.6 : 0.95] as [string, number, number, number])), rooms);
    expect(noisy.rows[1]!.registration_id).toBe('r1-1');
    expect(noisy.confidence).toBeLessThan(clean.confidence);
  });

  it('flags unknown player, duplicate rank and wrong room label', () => {
    const rows: [string, number, number][] = names.map((n, i) => [n, i + 1, 2]);
    rows[2] = ['Stranger', 2, 2];
    const r = resolveSubmission(shot(rows, { room: 'Room 2' }), rooms);
    expect(r.issues.some((i) => i.startsWith('unmatched_players'))).toBe(true);
    expect(r.issues).toContain('duplicate_rank');
    expect(r.issues).toContain('room_label_mismatch');
    expect(r.confidence).toBeLessThan(0.6);
  });

  it('non-results image and unknown room give nothing to approve', () => {
    expect(resolveSubmission({ ...shot([]), is_results_screen: false }, rooms).rows).toHaveLength(0);
    const r = resolveSubmission(shot([['Nobody', 1, 1], ['Else', 2, 1]]), rooms);
    expect(r.match_id).toBeNull();
    expect(r.confidence).toBe(0);
  });

  it('uses round 2 when round 1 is already completed', () => {
    const rs = [room(1, names)];
    rs[0]!.matches[0]!.status = 'completed';
    const r = resolveSubmission(shot(names.map((n, i) => [n, i + 1, 1] as [string, number, number])), rs);
    expect(r.match_id).toBe('m1-2');
  });

  it('flags a round that is already completed when the screen prints it', () => {
    const rs = [room(1, names)];
    rs[0]!.matches[0]!.status = 'completed';
    const r = resolveSubmission(shot(names.map((n, i) => [n, i + 1, 1] as [string, number, number]), { round: 1 }), rs);
    expect(r.issues).toContain('round_already_completed');
  });
});
