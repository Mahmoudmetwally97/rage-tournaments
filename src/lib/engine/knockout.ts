import type { EngineParticipant, KnockoutSlot } from './types';

function nextPowerOfTwo(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

export function generateSingleEliminationBracket(
  participants: readonly EngineParticipant[]
): KnockoutSlot[] {
  if (participants.length < 2) {
    throw new Error('At least 2 participants are required for knockout bracket');
  }

  const sorted = [...participants].sort((a, b) => a.seed - b.seed || a.createdAtMs - b.createdAtMs);
  const bracketSize = nextPowerOfTwo(sorted.length);
  const totalRounds = Math.log2(bracketSize);
  const slots: KnockoutSlot[] = [];

  const round1MatchCount = bracketSize / 2;
  let globalMatchCounter = 1;
  const roundMatchOffsets = new Map<number, number>();

  // Pre-calculate starting matchNumber for each round
  let cursor = 1;
  for (let r = 1; r <= totalRounds; r++) {
    roundMatchOffsets.set(r, cursor);
    cursor += bracketSize / Math.pow(2, r);
  }

  // Round 1: Top seeds get BYEs when participant count < bracketSize
  for (let i = 0; i < round1MatchCount; i++) {
    const home = sorted[i]?.registrationId ?? null;
    const awayIndex = bracketSize - 1 - i;
    const away = sorted[awayIndex]?.registrationId ?? null;
    const isByeMatch = home !== null && away === null;
    const nextMatchNumber =
      totalRounds > 1
        ? (roundMatchOffsets.get(2) ?? 1) + Math.floor(i / 2)
        : null;

    slots.push({
      matchNumber: globalMatchCounter++,
      roundNumber: 1,
      homeRegistrationId: home,
      awayRegistrationId: away,
      isByeMatch,
      winnerRegistrationId: isByeMatch ? home : null,
      nextMatchNumber
    });
  }

  // Subsequent rounds
  for (let r = 2; r <= totalRounds; r++) {
    const count = bracketSize / Math.pow(2, r);
    const nextStart = roundMatchOffsets.get(r + 1);
    for (let i = 0; i < count; i++) {
      slots.push({
        matchNumber: globalMatchCounter++,
        roundNumber: r,
        homeRegistrationId: null,
        awayRegistrationId: null,
        isByeMatch: false,
        winnerRegistrationId: null,
        nextMatchNumber: r < totalRounds && nextStart ? nextStart + Math.floor(i / 2) : null
      });
    }
  }

  return slots;
}
