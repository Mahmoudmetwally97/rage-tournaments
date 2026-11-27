import { describe, expect, it } from 'vitest';
import { distributeFfaRooms, scoreFfaStage } from '@/lib/engine/ffa';
import { buildGroups, generateRoundRobinPairings } from '@/lib/engine/groups';
import { generateSingleEliminationBracket } from '@/lib/engine/knockout';
import type { EngineParticipant } from '@/lib/engine/types';

function makeParticipants(count: number): EngineParticipant[] {
  return Array.from({ length: count }, (_, i) => ({
    registrationId: `reg-${i + 1}`,
    displayName: `Player_${i + 1}`,
    seed: i + 1,
    createdAtMs: 1000 + i
  }));
}

describe('Competition Engine — Core & Boundary Edge Cases', () => {
  it('distributes 35 FFA players evenly across 3 rooms (no stranded small room)', () => {
    const rooms = distributeFfaRooms(makeParticipants(35), 16, 'seeded_snake');
    expect(rooms).toHaveLength(3);
    expect(rooms.map((r) => r.participants.length)).toEqual([11, 12, 12]);
  });

  it('scales cleanly to 256 FFA players across 16 rooms with zero loss or duplicates', () => {
    const players = makeParticipants(256);
    const rooms = distributeFfaRooms(players, 16, 'seeded_snake');
    expect(rooms).toHaveLength(16);
    const flattened = rooms.flatMap((r) => r.participants.map((p) => p.registrationId));
    expect(new Set(flattened).size).toBe(256);
  });

  it('returns empty rooms for 0 participants and throws for invalid roomSize < 2', () => {
    expect(distributeFfaRooms([], 16)).toEqual([]);
    expect(() => distributeFfaRooms(makeParticipants(4), 1)).toThrow();
  });

  it('produces identical random_prng draws for same seed and different draws for different seeds', () => {
    const players = makeParticipants(16);
    const drawA1 = distributeFfaRooms(players, 8, 'random_prng', 'seed-alpha');
    const drawA2 = distributeFfaRooms(players, 8, 'random_prng', 'seed-alpha');
    const drawB = distributeFfaRooms(players, 8, 'random_prng', 'seed-beta');
    expect(drawA1).toEqual(drawA2);
    expect(drawA1).not.toEqual(drawB);
  });

  it('supports best_round aggregation mode in FFA scoring', () => {
    const players = makeParticipants(2);
    const ranked = scoreFfaStage(
      players,
      [
        [
          { registrationId: 'reg-1', placement: 1, kills: 10, score: 10, winPoints: 0 },
          { registrationId: 'reg-2', placement: 2, kills: 8, score: 8, winPoints: 0 }
        ],
        [
          { registrationId: 'reg-1', placement: 2, kills: 1, score: 1, winPoints: 0 },
          { registrationId: 'reg-2', placement: 1, kills: 12, score: 12, winPoints: 0 }
        ]
      ],
      {
        placementPoints: { 1: 10, 2: 5 },
        killPoints: 1,
        winPoints: 0,
        aggregationMode: 'best_round'
      }
    );
    // reg-2 best round = 10+12 = 22; reg-1 best round = 10+10 = 20
    expect(ranked[0]?.registrationId).toBe('reg-2');
    expect(ranked[0]?.totalPoints).toBe(22);
  });

  it('resolves FFA tie-breakers deterministically via kills then best placement', () => {
    const players = makeParticipants(2);
    const ranked = scoreFfaStage(
      players,
      [
        [
          { registrationId: 'reg-1', placement: 2, kills: 5, score: 5, winPoints: 0 },
          { registrationId: 'reg-2', placement: 1, kills: 3, score: 3, winPoints: 0 }
        ]
      ],
      {
        placementPoints: { 1: 10, 2: 8 },
        killPoints: 1,
        winPoints: 0,
        aggregationMode: 'aggregate'
      }
    );
    expect(ranked[0]?.registrationId).toBe('reg-1');
    expect(ranked[1]?.registrationId).toBe('reg-2');
  });

  it('distributes 32 players into 4 balanced groups of 8 via snake seeding', () => {
    const groups = buildGroups(makeParticipants(32), 4, 'seeded_snake');
    expect(groups).toHaveLength(4);
    groups.forEach((g) => expect(g).toHaveLength(8));
    // Seed 1 in Group 1, Seed 4 in Group 4, Seed 5 snakes back into Group 4
    expect(groups[0]?.[0]?.registrationId).toBe('reg-1');
    expect(groups[3]?.[0]?.registrationId).toBe('reg-4');
    expect(groups[3]?.[1]?.registrationId).toBe('reg-5');
  });

  it('handles odd group size (5 teams) with 1 BYE per round and no self-play', () => {
    const pairings = generateRoundRobinPairings(makeParticipants(5));
    expect(pairings).toHaveLength(15);
    expect(pairings.filter((p) => p.awayRegistrationId === null)).toHaveLength(5);
    pairings.forEach((p) => expect(p.homeRegistrationId).not.toBe(p.awayRegistrationId));
  });

  it('handles minimum 2-participant knockout bracket and rejects < 2 participants', () => {
    const bracket = generateSingleEliminationBracket(makeParticipants(2));
    expect(bracket).toHaveLength(1);
    expect(bracket[0]?.isByeMatch).toBe(false);
    expect(() => generateSingleEliminationBracket(makeParticipants(1))).toThrow();
  });

  it('pads 13-participant knockout to 16 with 3 top-seed BYEs auto-advancing', () => {
    const bracket = generateSingleEliminationBracket(makeParticipants(13));
    expect(bracket).toHaveLength(15);
    const round1Byes = bracket.filter((m) => m.roundNumber === 1 && m.isByeMatch);
    expect(round1Byes).toHaveLength(3);
    expect(round1Byes[0]?.winnerRegistrationId).toBe('reg-1');
  });
});
