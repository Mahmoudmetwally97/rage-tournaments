# RAGE TOURNAMENTS — API Specification

All endpoints live under `/api/*`, validate payloads with `zod`, verify Supabase Auth sessions on the server, enforce RBAC + `tournament_admins` scope (never relying on UI hiding), and log sensitive mutations to `audit_logs`.

---

## 1. Module Structure
| Module | Base Path | Key Endpoints |
| :--- | :--- | :--- |
| **Auth** | `/api/auth/*` | Session callback, email verification, `POST /api/auth/link-rage` (feature-flagged) |
| **Players** | `/api/players/*` | `GET /api/players/me`, `PATCH /api/players/me`, `PUT /api/players/me/games/[gameId]`, `GET /api/players/[username]` |
| **Teams** | `/api/teams/*` | `POST /api/teams`, `POST /api/teams/[id]/invite`, `POST /api/teams/invites/[id]/accept`, `DELETE /api/teams/[id]/members/[userId]` |
| **Tournaments** | `/api/tournaments/*` | `GET /api/tournaments` (paginated), `POST /api/tournaments`, `GET /api/tournaments/[id]`, `PATCH /api/tournaments/[id]`, `POST /api/tournaments/[id]/transition` |
| **Registrations** | `/api/registrations/*` | `POST /api/tournaments/[id]/register`, `POST /api/tournaments/[id]/check-in`, `POST /api/registrations/[id]/withdraw` |
| **Stages** | `/api/stages/*` | `POST /api/stages/[id]/generate-groups`, `POST /api/stages/[id]/advance` |
| **Matches** | `/api/matches/*` | `GET /api/matches/[id]`, `POST /api/matches/[id]/submit-result`, `POST /api/matches/[id]/admin-result`, `POST /api/matches/[id]/dispute` |
| **Results** | `/api/results/*` | `POST /api/results/[id]/approve`, `POST /api/results/[id]/reject`, `POST /api/results/[id]/correct`, `POST /api/results/[id]/reopen` |
| **Disputes** | `/api/disputes/*` | `GET /api/disputes`, `PATCH /api/disputes/[id]` (`accept`, `reject`, `request_evidence`, `correct_result`, `reopen`) |
| **Rankings** | `/api/rankings/*` | `GET /api/rankings/tournaments/[id]` (Tournament Leaderboard), `GET /api/rankings/global` (P2) |
| **Admin** | `/api/admin/*` | `GET /api/admin/audit-logs`, `POST /api/admin/roles`, `GET /api/admin/tournaments/[id]/export` |

---

## 2. Server-Side Guards & Invariants
- `POST /api/stages/[id]/advance` **rejects** (`409 Conflict`) if any required match is incomplete or any dispute in that stage is `submitted` or `under_review`.
- `POST /api/matches/[id]/dispute` enforces `now() <= approved_at + dispute_window_minutes` and blocks if the stage has already advanced.
- `PATCH /api/tournaments/[id]` blocks structural edits when `config_locked = true` (`Live` state), allowing only `Tournament Manager` / `Super Admin` permitted live adjustments with `audit_logs`.
- All list endpoints enforce `page` & `limit` pagination (`default=20`, `max=100`); private fields (`email`, `whatsapp_number`, `discord_handle`, `audit_logs`) are never exposed publicly.

---

## 3. Architecture Review — Resolved Issues
- Added `PUT /api/players/me/games/[gameId]` for progressive per-game IGN profiling.
- Added `POST /api/results/[id]/correct` and `/reopen` with immutable versioning and leaderboard recalculation.
- Enforced `409 Conflict` guards on stage advancement with open disputes and live configuration freeze checks.
