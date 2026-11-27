# RAGE TOURNAMENTS — RBAC Matrix

## 1. Global Roles vs. Tournament-Scoped Roles vs. Derived Ownership
To eliminate ambiguity between `user_roles` and `tournament_admins`:

1. **Global Roles (`user_roles` table):**
   - `player`: Default authenticated user.
   - `moderator`: Platform-wide moderation (disputes, violations, RAGE link verification).
   - `super_admin`: Full platform control (global settings, RBAC role grants, all tournaments, audit logs).
2. **Tournament-Scoped Roles (`tournament_admins` table, scoped to `tournament_id`):**
   - `tournament_manager`: Full management of **only** their assigned tournament(s).
   - `referee`: Match management & result entry/approval **only** for their assigned tournament(s).
   - `moderator` (optional scoped assignment): Dispute & evidence review for assigned tournament(s).
3. **Derived Ownership (NOT a global role):**
   - `team_leader`: Derived dynamically on the server from `teams.captain_id = auth.uid()` or `team_members.role = 'leader' AND invite_status = 'accepted'`.
   - `guest`: Unauthenticated visitor.

---

## 2. Server-Side Authorization Rules (Mandatory)
- **Never** rely on hiding UI buttons as a security control. Every Route Handler and Server Action must verify session + role/scope on the server, backed by PostgreSQL RLS.
- A `player` **cannot** edit match results after approval.
- A `team_leader` **cannot** register a player into a team without `invite_status = 'accepted'`.
- A `tournament_manager` **cannot** edit a tournament without a matching row in `tournament_admins` (unless `super_admin`).
- A `referee` **cannot** approve match results outside their assigned `tournament_id`.
- Every sensitive mutation writes an immutable record to `audit_logs`.

---

## 3. Permission Matrix
| Capability | Guest | Player | Team Leader (Derived) | Referee (Scoped) | Tournament Manager (Scoped) | Moderator | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Browse public tournaments & leaderboards | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Register Solo & Check-in | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Create/Manage Own Team & Register Team | No | Yes (create) | Yes (own team) | No | No | No | Yes |
| Submit own match result + evidence | No | Yes | Yes | No | No | No | Yes |
| Enter/Approve results (assigned tournament) | No | No | No | Yes | Yes | No | Yes |
| Reopen approved result / Override | No | No | No | No | Yes | No | Yes |
| Review disputes & violations | No | No | No | No | Yes (scoped) | Yes | Yes |
| Build/Edit/Seed assigned tournament | No | No | No | No | Yes | No | Yes |
| Global settings & RBAC role management | No | No | No | No | No | No | Yes |

---

## 4. Architecture Review — Resolved Issues
- Resolved inconsistency between `RBAC_MATRIX.md` and `DATABASE_SCHEMA.md`: `team_leader` is now explicitly a **derived team-ownership permission**, not a global `user_roles` entry.
- Clearly separated global `user_roles` (`player`, `moderator`, `super_admin`) from tournament-scoped `tournament_admins` (`tournament_manager`, `referee`, `moderator`).
- Enforced server-side authorization + RLS as mandatory; UI hiding is strictly cosmetic.
