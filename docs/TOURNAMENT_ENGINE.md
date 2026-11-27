# RAGE TOURNAMENTS — Competition Engine Specification

## 1. Pure Domain Separation & Mode Isolation
All competition logic lives in `src/lib/engine/` as pure TypeScript functions—zero UI or DB dependencies.
- **Solo Mode (`solo/`):** Operates on individual `registration_id`s (FFA rooms, Solo Points, Solo Groups, Solo Knockout).
- **Team Mode (`team/`):** Operates on team `registration_id`s with roster-size validation (`team_size` including captain + optional `substitute_slots`), Team vs Team pairings, Group Stage, and Team Brackets.

---

## 2. Deterministic Distribution, Odd Counts & BYE Handling
1. **Group / Room Distribution:**
   - `seeded_snake`: Participants sorted by `seed ASC` and distributed across `G` groups/rooms in snake order (`1..G, G..1`).
   - `random_prng`: Shuffled using a deterministic PRNG (`mulberry32`) seeded with `stages.random_seed` stored in DB, ensuring any draw can be audited and reproduced identically.
2. **Odd Counts & BYE Handling:**
   - **Knockout:** Pads to next power of 2 (`2^r`). `BYE` slots are placed against top seeds; Round 1 `BYE` matches auto-complete and advance the opponent immediately.
   - **Groups (Round-Robin):** Odd group count inserts a virtual `BYE` per round (one team/player rests each round).
   - **FFA Rooms:** Distributes `N` participants across `R = ceil(N / roomSize)` rooms evenly (`floor(N/R)` to `ceil(N/R)` per room) so no room has an unplayable 1–2 player remainder.

---

## 3. Tie-Breaker Evaluation Order
Evaluated deterministically in strict order from `tournament_scoring_rules.tie_breaker_rules`:
- **FFA / Points Default Chain:**
  1. `total_points DESC`
  2. `total_kills DESC`
  3. `best_single_placement ASC`
  4. `seed ASC`
  5. `registration_created_at ASC`
- **Groups / Team Default Chain:**
  1. `match_points DESC`
  2. `head_to_head` (among tied teams)
  3. `score_diff DESC`
  4. `seed ASC`

---

## 4. Result Lifecycle, Locking & Freeze Rules
1. **Configuration Freeze:** When a tournament transitions to `Live`, `tournaments.config_locked = true`. Stage formats, scoring rules, and team sizes are **frozen**.
2. **Allowed Live Adjustments:** Only `Tournament Manager` (for assigned tournament) or `Super Admin` may update match schedules, room notes, or disqualify/withdraw a participant—all recorded in `audit_logs`, never silently altering past approved results.
3. **Result States:**
   - `Player Submission` → `pending_review` → `approved` or `rejected` (with reason).
   - `Referee / Tournament Manager Entry` → `approved` (opens configurable `dispute_window_minutes`, default 30 min).
   - **Correction / Reopen:** Creates a new `match_results` row (`version + 1`, `is_current = true`), sets prior version `is_current = false`, writes `audit_logs`, and triggers **recalculation** of stage standings/leaderboard.
4. **Stage Advancement Gate (Strict):**
   - A stage **cannot** advance to the next stage while any required match in that stage is not `completed` OR while any `disputes` row for that stage is `submitted` or `under_review`.

---

## 5. Architecture Review — Resolved Issues
- Separated `Solo` and `Team` engine contracts cleanly.
- Specified deterministic `seeded_snake` and `random_prng` distribution with stored `random_seed`.
- Defined `BYE` handling for Knockout, Round-Robin Groups, and balanced FFA rooms.
- Defined strict tie-breaker evaluation chains, `Live` configuration freeze rules, `audit_logs` requirements, and the Stage Advancement Gate blocking progression on unresolved results or open disputes.
