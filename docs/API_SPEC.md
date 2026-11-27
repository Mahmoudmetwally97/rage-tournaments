# RAGE TOURNAMENTS — API Specification

All endpoints live under `/api/*`, validate payloads with `zod`, verify Supabase Auth sessions on the server, enforce RBAC + `tournament_admins` scope, and log sensitive mutations to `audit_logs`.

---

## 1. Module Structure
| Module | Base Path | Key Endpoints |
| :--- | :--- | :--- |
| **Auth** | `/api/auth/*` | Session callback, email verification, `POST /api/auth/link-rage` (feature-flagged) |
| **Players** | `/api/players/*` | `GET /api/players/me`, `PATCH /api/players/me`, `GET /api/players/[username]` |
| **Teams** | `/api/teams/*` | `POST /api/teams`, `POST /api/teams/[id]/invite`, `POST /api/teams/invites/[id]/accept`, `DELETE /api/teams/[id]/members/[userId]` |
| **Tournaments** | `/api/tournaments/*` | `GET /api/tournaments` (paginated), `POST /api/tournaments`, `GET /api/tournaments/[id]`, `PATCH /api/tournaments/[id]`, `POST /api/tournaments/[id]/transition` |
| **Registrations** | `/api/registrations/*` | `POST /api/tournaments/[id]/register`, `POST /api/tournaments/[id]/check-in`, `POST /api/registrations/[id]/withdraw` |
| **Stages** | `/api/stages/*` | `POST /api/stages/[id]/generate-groups`, `POST /api/stages/[id]/advance` |
| **Matches** | `/api/matches/*` | `GET /api/matches/[id]`, `POST /api/matches/[id]/submit-result`, `POST /api/matches/[id]/admin-result`, `POST /api/matches/[id]/dispute` |
| **Results** | `/api/results/*` | `POST /api/results/[id]/approve`, `POST /api/results/[id]/reject` |
| **Disputes** | `/api/disputes/*` | `GET /api/disputes`, `PATCH /api/disputes/[id]` (`accept`, `reject`, `request_evidence`, `correct_result`, `reopen`) |
| **Rankings** | `/api/rankings/*` | `GET /api/rankings/tournaments/[id]` (Tournament Leaderboard), `GET /api/rankings/global` (P2) |
| **Admin** | `/api/admin/*` | `GET /api/admin/audit-logs`, `POST /api/admin/roles`, `GET /api/admin/tournaments/[id]/export` |

---

## 2. Pagination & Privacy Rules
- All list endpoints (`players`, `registrations`, `matches`, `audit-logs`) enforce `page` & `limit` pagination (default `limit=20`, max `100`).
- Public endpoints never return `email`, `whatsapp_number`, `discord_handle`, or `audit_logs`.
