import type { RankedParticipant } from './types';

export function rankWithTieBreakers(
  items: ReadonlyArray<Omit<RankedParticipant, 'rank'>>
): RankedParticipant[] {
  const sorted = [...items].sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
    if (b.totalKills !== a.totalKills) return b.totalKills - a.totalKills;
    if (a.bestPlacement !== b.bestPlacement) return a.bestPlacement - b.bestPlacement;
    if (a.seed !== b.seed) return a.seed - b.seed;
    return a.createdAtMs - b.createdAtMs;
  });

  return sorted.map((item, idx) => ({
    ...item,
    rank: idx + 1
  }));
}
