# RAGE TOURNAMENTS — QA & Test Plan

## 1. Verification Gates (Every Milestone)
1. `tsc --noEmit` (TypeScript `strict: true`)
2. `npm run lint`
3. `npm test` (Vitest unit & integration suites)
4. Playwright E2E suite (UI, RTL/LTR, RBAC flows)

---

## 2. Concrete Edge Cases (Mandatory Automated Test Coverage)
1. **Concurrent Capacity Race:** `max_participants = 16`, 30 simultaneous `register` RPC calls → exactly `16` `confirmed`, `14` `waitlisted` in deterministic order.
2. **Solo/Team XOR Violation:** Direct DB insert attempting both `user_id` AND `team_id`, or both `NULL` → rejected by `CHECK` constraint.
3. **Duplicate Registration:** Same user or same `IGN` registering twice in one tournament → rejected (`409 Conflict`).
4. **Multi-Team Same Tournament:** Player belongs to Team A and Team B for CrossFire; Team A registers for Tournament X, then Team B tries to register for Tournament X → rejected by `registration_roster_members(tournament_id, user_id)` unique constraint.
5. **Unaccepted Team Invite:** Team Leader tries to register a roster containing a member with `invite_status = 'pending'` → rejected.
6. **Odd Participant Knockout & BYE:** 13-participant Single Elimination → pads to 16, assigns 3 `BYE`s to top seeds (#1, #2, #3), auto-advances them to Round 2.
7. **Odd Group Round-Robin:** 5-team group → generates 5 rounds where each team plays 4 matches and gets 1 `BYE`.
8. **Deterministic Tie-Breaker:** Two FFA players tied on `total_points` → resolved deterministically via `total_kills` → `best_single_placement` → `seed` → `registration_created_at`.
9. **Stage Advancement Blocked by Open Dispute:** Stage 1 has 1 match with `disputes.status = 'under_review'`; Admin calls `/api/stages/[id]/advance` → rejected (`409 Conflict`).
10. **Approved Result Correction & Recalculation:** Referee approves result v1; within 30-min dispute window, `Tournament Manager` corrects to v2 → v1 marked `is_current = false`, v2 marked `is_current = true`, `audit_logs` written, Leaderboard recalculated.
11. **Live Config Freeze:** Tournament is `Live` (`config_locked = true`); `Tournament Manager` attempts to change `scoring_rules` or `format` → rejected (`409 Conflict`).
12. **Scoped RBAC Enforcement:** Referee assigned to Tournament A attempts to approve a match in Tournament B → rejected (`403 Forbidden`).
13. **Arabic RTL + BiDi Isolation:** Arabic UI (`dir="rtl"`) displaying English IGN `[EG]ProSniper#12` and score `15 - 12` renders without character/number reversal.

---

## 3. Pilot Tournament Acceptance Test
- **Format:** 32 players, 4 FFA groups of 8 players each, top 2 per group advance → 8-player Final.
- **Workflow:** Player-submitted results + screenshot evidence + Referee/Admin approval, verifying full lifecycle `Draft` → `Completed` → `Archived`.

---

## 4. Architecture Review — Resolved Issues
- Expanded test plan from high-level scenarios to 13 concrete, automated edge-case assertions covering DB constraints, concurrency, engine math, disputes, RBAC scope, and RTL BiDi.
