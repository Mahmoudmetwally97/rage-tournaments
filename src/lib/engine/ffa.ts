import type {
  EngineParticipant,
  FfaRoom,
  MatchScoreInput,
  RankedParticipant,
  ScoringRulesConfig,
  SeedingMode
} from './types';
import { distributeSnake, orderParticipants } from './seeding';
import { rankWithTieBreakers } from './tiebreaker';

export function distributeFfaRooms(
  participants: readonly EngineParticipant[],
  maxRoomSize: number,
  seedingMode: SeedingMode = 'seeded_snake',
  randomSeed = 'ffa-seed'
): FfaRoom[] {
  if (maxRoomSize < 2) throw new Error('maxRoomSize must be >= 2');
  if (participants.length === 0) return [];

  const ordered = orderParticipants(participants, seedingMode, randomSeed);
  const roomCount = Math.ceil(ordered.length / maxRoomSize);
  const buckets = distributeSnake(ordered, roomCount);

  return buckets.map((bucket, idx) => ({
    roomNumber: idx + 1,
    participants: bucket
  }));
}

export function scoreFfaStage(
  participants: readonly EngineParticipant[],
  roundResults: readonly MatchScoreInput[][],
  rules: ScoringRulesConfig
): RankedParticipant[] {
  const participantMap = new Map(participants.map((p) => [p.registrationId, p]));
  const totals = new Map<
    string,
    { roundPoints: number[]; totalKills: number; bestPlacement: number }
  >();

  for (const p of participants) {
    totals.set(p.registrationId, {
      roundPoints: [],
      totalKills: 0,
      bestPlacement: Number.MAX_SAFE_INTEGER
    });
  }

  for (const round of roundResults) {
    for (const entry of round) {
      const agg = totals.get(entry.registrationId);
      if (!agg) continue;
      const placementPts =
        entry.placement !== null ? (rules.placementPoints[entry.placement] ?? 0) : 0;
      const pts = placementPts + entry.kills * rules.killPoints + entry.winPoints;
      agg.roundPoints.push(pts);
      agg.totalKills += entry.kills;
      if (entry.placement !== null && entry.placement < agg.bestPlacement) {
        agg.bestPlacement = entry.placement;
      }
    }
  }

  const unranked = Array.from(totals.entries()).map(([registrationId, data]) => {
    const meta = participantMap.get(registrationId);
    const totalPoints =
      rules.aggregationMode === 'best_round'
        ? Math.max(0, ...data.roundPoints)
        : data.roundPoints.reduce((acc, v) => acc + v, 0);

    return {
      registrationId,
      displayName: meta?.displayName ?? registrationId,
      totalPoints,
      totalKills: data.totalKills,
      bestPlacement: data.bestPlacement,
      seed: meta?.seed ?? 9999,
      createdAtMs: meta?.createdAtMs ?? 0
    };
  });

  return rankWithTieBreakers(unranked);
}
