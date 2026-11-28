import type { EngineParticipant, RoundRobinPairing, SeedingMode } from './types';
import { distributeSnake, orderParticipants } from './seeding';

export function buildGroups(
  participants: readonly EngineParticipant[],
  groupCount: number,
  seedingMode: SeedingMode = 'seeded_snake',
  randomSeed = 'groups-seed'
): EngineParticipant[][] {
  const ordered = orderParticipants(participants, seedingMode, randomSeed);
  return distributeSnake(ordered, groupCount);
}

export function generateRoundRobinPairings(
  groupParticipants: readonly EngineParticipant[]
): RoundRobinPairing[] {
  if (groupParticipants.length < 2) return [];

  const ids: Array<string | null> = groupParticipants.map((p) => p.registrationId);
  if (ids.length % 2 === 1) {
    ids.push(null); // Virtual BYE for odd participant counts
  }

  const n = ids.length;
  const totalRounds = n - 1;
  const pairings: RoundRobinPairing[] = [];
  const rotating = [...ids];

  for (let round = 1; round <= totalRounds; round++) {
    for (let i = 0; i < n / 2; i++) {
      const a = rotating[i] ?? null;
      const b = rotating[n - 1 - i] ?? null;
      if (a === null && b === null) continue;
      if (a === null && b !== null) {
        pairings.push({ round, homeRegistrationId: b, awayRegistrationId: null });
      } else if (a !== null) {
        pairings.push({ round, homeRegistrationId: a, awayRegistrationId: b });
      }
    }

    const fixed = rotating[0] ?? null;
    const last = rotating.pop() ?? null;
    rotating.splice(1, 0, last);
    rotating[0] = fixed;
  }

  return pairings;
}
