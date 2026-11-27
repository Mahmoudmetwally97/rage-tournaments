import type { EngineParticipant, SeedingMode } from './types';

function hashSeed(seedText: string): number {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) {
    h ^= seedText.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function createSeededPrng(seedText: string): () => number {
  let a = hashSeed(seedText) || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function orderParticipants(
  participants: readonly EngineParticipant[],
  mode: SeedingMode,
  randomSeed = 'rage-default-seed'
): EngineParticipant[] {
  const copy = [...participants].sort((a, b) => a.seed - b.seed || a.createdAtMs - b.createdAtMs);
  if (mode === 'seeded_snake') {
    return copy;
  }
  const rand = createSeededPrng(randomSeed);
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = copy[i];
    const target = copy[j];
    if (tmp && target) {
      copy[i] = target;
      copy[j] = tmp;
    }
  }
  return copy;
}

export function distributeSnake<T>(items: readonly T[], groupCount: number): T[][] {
  if (groupCount <= 0) throw new Error('groupCount must be >= 1');
  const groups: T[][] = Array.from({ length: groupCount }, () => []);
  items.forEach((item, index) => {
    const cycle = Math.floor(index / groupCount);
    const offset = index % groupCount;
    const targetIdx = cycle % 2 === 0 ? offset : groupCount - 1 - offset;
    groups[targetIdx]?.push(item);
  });
  return groups;
}
