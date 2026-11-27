export type CompetitionMode = 'solo' | 'team';
export type StageFormat = 'ffa' | 'points' | 'groups' | 'knockout';
export type SeedingMode = 'seeded_snake' | 'random_prng';

export interface EngineParticipant {
  registrationId: string;
  displayName: string;
  seed: number;
  createdAtMs: number;
}

export interface FfaRoom {
  roomNumber: number;
  participants: EngineParticipant[];
}

export interface MatchScoreInput {
  registrationId: string;
  placement: number | null;
  kills: number;
  score: number;
  winPoints: number;
}

export interface ScoringRulesConfig {
  placementPoints: Record<number, number>;
  killPoints: number;
  winPoints: number;
  aggregationMode: 'aggregate' | 'best_round';
}

export interface RankedParticipant {
  registrationId: string;
  displayName: string;
  totalPoints: number;
  totalKills: number;
  bestPlacement: number;
  seed: number;
  createdAtMs: number;
  rank: number;
}

export interface RoundRobinPairing {
  round: number;
  homeRegistrationId: string;
  awayRegistrationId: string | null; // null represents a BYE
}

export interface KnockoutSlot {
  matchNumber: number;
  roundNumber: number;
  homeRegistrationId: string | null;
  awayRegistrationId: string | null;
  isByeMatch: boolean;
  winnerRegistrationId: string | null;
  nextMatchNumber: number | null;
}
