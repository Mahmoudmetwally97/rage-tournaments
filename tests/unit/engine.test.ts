import { describe, expect, it } from 'vitest';
import { distributeFfaRooms, scoreFfaStage } from '@/lib/engine/ffa';
import { generateRoundRobinPairings } from '@/lib/engine/groups';
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

describe('Competition Engine', () => {
  it('distributes 35 FFA players evenly across 3 rooms (no 3-player stranded room)', () => {
    const rooms = distributeFfaRooms(makeParticipants(35), 16, 'seeded_snake');
    expect(rooms).toHaveLength(3);
    const counts = rooms.map((r) => r.participants.length);
    expect(counts).toEqual([11, 12, 12]);
  });

  it('produces reproducible random_prng draws for the same seed', () => {
    const players = makeParticipants(16);
    const drawA = distributeFfaRooms(players, 8, 'random_prng', 'stage-1-seed');
    const drawB = distributeFfaRooms(players, 8, 'random_prng', 'stage-1-seed');
    expect(drawA).toEqual(drawB);
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
    // Both have 13 points: reg-1 has 8+5=13 (5 kills), reg-2 has 10+3=13 (3 kills)
    expect(ranked[0]?.registrationId).toBe('reg-1');
    expect(ranked[1]?.registrationId).toBe('reg-2');
  });

  it('handles odd group size (5 teams) with 1 BYE per round', () => {
    const pairings = generateRoundRobinPairings(makeParticipants(5));
    expect(pairings).toHaveLength(15); // 5 rounds * 3 slots (2 matches + 1 BYE)
    const byeMatches = pairings.filter((p) => p.awayRegistrationId === null);
    expect(byeMatches).toHaveLength(5);
  });

  it('pads 13-participant knockout to 16 with 3 top-seed BYEs auto-advancing', () => {
    const bracket = generateSingleEliminationBracket(makeParticipants(13));
    expect(bracket).toHaveLength(15); // 8 + 4 + 2 + 1
    const round1Byes = bracket.filter((m) => m.roundNumber === 1 && m.isByeMatch);
    expect(round1Byes).toHaveLength(3);
    expect(round1Byes[0]?.winnerRegistrationId).toBe('reg-1');
  });
});
