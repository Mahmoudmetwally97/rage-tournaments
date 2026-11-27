# RAGE TOURNAMENTS — Competition Engine Specification

## 1. Pure Domain Separation
All scoring, seeding, group distribution, qualification, and bracket logic lives in `src/lib/engine/` as pure TypeScript functions—isolated from UI components and database clients.

---

## 2. Engine Modules
1. **FFA Engine (`ffa.ts`):**
   - Supports Individual Participants, Match Rooms, Multiple Rounds, Placement Scores, Kill Scores, Total Score, `aggregate` or `best_round` scoring, and deterministic tiebreakers.
2. **Points Engine (`points.ts`):**
   - Evaluates configurable `tournament_scoring_rules` (Placement + Kill + Win points) and deterministic tiebreaker chains.
3. **Team & Groups Engine (`groups.ts`):**
   - Supports Team Registration & Roster validation, Team vs Team pairings, Group Stage (Round-Robin), and Team Standings.
4. **Knockout Engine (`knockout.ts`):**
   - Single Elimination bracket generation with power-of-2 padding, `BYE` placement, and automatic winner advancement (`next_match_id`).
   - Designed for future Double Elimination extension.
5. **Custom Stage Pipeline (`pipeline.ts`):**
   - Custom tournaments are **not** arbitrary unvalidated scripts; they are ordered pipelines (`stages` table: `stage_order = 1..N`) composed from the 4 reusable stage engines (`ffa`, `points`, `groups`, `knockout`).
   - Each stage defines `format`, `participant_mode` (`solo` | `team`), `qualify_count`, `advance_rule` (`top_n_per_group` | `top_n_overall` | `bracket_winners`), and `config` JSONB.
   - Example: `Stage 1: ffa (32 -> top 8)` → `Stage 2: ffa (8 -> top 1 Winner)`.
   - Cross-type transitions (e.g., Solo Stage → Team Stage) require explicit conversion rules configured and validated before `Ready` state.
