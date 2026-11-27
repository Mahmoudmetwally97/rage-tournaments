# RAGE TOURNAMENTS — QA & Test Plan

## 1. Verification Gates (Every Milestone)
1. `tsc --noEmit` (TypeScript `strict: true`)
2. `npm run lint`
3. `npm test` (Vitest unit & integration suites)
4. Playwright E2E suite (for UI/flow milestones)

---

## 2. Mandatory Functional Test Scenarios (Section 20)
1. FFA tournament with **32 players**.
2. FFA tournament with **256 players** (pagination & performance).
3. Open-capacity tournament (`max_participants = 0`).
4. Capped tournament reaching max capacity (overflow to `waitlisted` + ordered promotion on cancel).
5. Duplicate registration attempt by the same player/IGN (rejected).
6. Team registration with incomplete roster (`< min_team_size`, rejected).
7. Participant failing to complete `Check-in` (excluded per tournament rules).
8. Player submitting an incorrect/invalid result (rejected by moderator/admin with reason).
9. Admin editing an already-approved result (preserves version history + writes `audit_logs`).
10. Two players tied on points (resolved deterministically via tiebreaker rules).
11. Concurrent registration burst (dozens of simultaneous requests never exceed `max_participants`).
12. Arabic RTL UI displaying English `IGN`s and numeric scores without BiDi reversal.

---

## 3. Pilot Tournament Acceptance Test
- **Format:** 32 players, 4 FFA groups of 8 players each, top 2 per group advance → 8-player Final.
- **Workflow:** Player-submitted results + screenshot evidence + Admin approval, verifying the full lifecycle from `Draft` → `Completed` and `Archived`.
