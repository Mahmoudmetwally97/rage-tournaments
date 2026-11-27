# RAGE TOURNAMENTS — Decisions Log & Unresolved Questions

## 1. Architectural & Product Decisions

| ID | Date | Decision | Rationale | Status |
| :--- | :--- | :--- | :--- | :--- |
| **DEC-001** | Nov 2026 | **Dedicated Repository (`rage-tournaments`)** | Isolate from `serene-curie` portfolio repo to prevent overwrites and keep Git history clean. | Approved |
| **DEC-002** | Nov 2026 | **Next.js App Router + TypeScript `strict: true` + Supabase** | Unified full-stack TypeScript, SSR/RSC for SEO, PostgreSQL + Auth + Storage + RLS. | Approved |
| **DEC-003** | Nov 2026 | **3-Step Sign Up + Progressive Profiling (`player_game_profiles`)** | Eliminates onboarding fatigue; collects per-game `IGN` only when joining the first tournament for that game. | Resolved (Review) |
| **DEC-004** | Nov 2026 | **Derived `team_leader` + Scoped `tournament_admins`** | `team_leader` derives from team ownership; `tournament_manager` & `referee` are scoped per tournament; `user_roles` holds global roles only. | Resolved (Review) |
| **DEC-005** | Nov 2026 | **Multi-Team Allowed Globally, 1 Team Per Tournament** | Players can belong to multiple teams per game, but `registration_roster_members` enforces max 1 team per tournament. | Resolved (Review) |
| **DEC-006** | Nov 2026 | **`team_size` Includes Captain + Extra `substitute_slots`** | Eliminates roster-count ambiguity (e.g., 5v5 = Captain + 4 starters, plus optional bench subs). | Resolved (Review) |
| **DEC-007** | Nov 2026 | **30-Min Default Dispute Window & Stage Advancement Gate** | Approved results can be disputed within `dispute_window_minutes` (default 30); stages cannot advance with open disputes or missing results. | Resolved (Review) |
| **DEC-008** | Nov 2026 | **Live Configuration Freeze (`config_locked`)** | Core format/scoring freezes at `Live`; only logged schedule/DQ adjustments allowed. | Resolved (Review) |

---

## 2. Decisions Still Requiring External Approval

| ID | Topic | Decision Needed | Default Proposed |
| :--- | :--- | :--- | :--- |
| **APP-001** | **Hosting Provider** | Choose Vercel vs. self-hosted VPS/Docker (`Hosting: Undecided`). | Vercel + Supabase |
| **APP-002** | **Dispute Window Duration** | Confirm default `dispute_window_minutes` after Referee approval. | `30 minutes` |
| **APP-003** | **Multi-Team Participation Policy** | Confirm allowing players in multiple teams globally while restricting to 1 team per tournament. | Allowed globally, 1 per tournament |
| **APP-004** | **RAGE Account Linking** | Inspect existing RAGE server auth/DB to confirm if verified linking is possible; keep deferred until verified. | Deferred / Independent Auth first |
| **APP-005** | **GitHub Remote Repository** | Create GitHub repo and provide remote URL so `feat/project-foundation` can be pushed for direct GitHub review. | Pending user repo creation |

---

## 3. Architecture Review — Resolved Issues
- Documented all resolutions from the Pre-Stage 3 Architecture Hardening review (`DEC-003` through `DEC-008`) and isolated remaining approval items (`APP-001` through `APP-005`).
