# RAGE TOURNAMENTS — RBAC Matrix

## 1. Official Roles (7 Roles)
| Role | Scope & Description |
| :--- | :--- |
| `guest` | Unauthenticated visitor (browse public tournaments, brackets, and leaderboards). |
| `player` | Authenticated user (register Solo, join teams, check in, submit own match results & disputes). |
| `team_leader` | Team captain (create/manage team, invite/remove members, register team when roster rules are met). |
| `referee` | Delegated match official (enter/approve results & manage matches **only** for assigned tournaments in `tournament_admins`). |
| `tournament_manager` | Organizer for assigned tournaments (edit tournament/stages, open/close registration, generate groups/brackets, manage check-ins). |
| `moderator` | Platform/tournament moderation (review disputes, violations, evidence, and RAGE link verifications). |
| `super_admin` | Full platform control (global settings, RBAC role management, all tournaments, audit logs). |

---

## 2. Permission Rules (Mandatory)
- A `player` **cannot** edit match results after approval.
- A `team_leader` **cannot** register a player into a team without the player accepting the invite.
- A `tournament_manager` **cannot** edit a tournament they are not assigned to in `tournament_admins` (unless `super_admin`).
- A `referee` **cannot** approve match results outside their assigned tournament scope.
- Every sensitive mutation (role change, tournament state change, result approval/override, dispute resolution, DQ) **must** write an immutable record to `audit_logs`.
- Only `super_admin` can modify global platform settings and grant/revoke staff roles.

---

## 3. Matrix Summary
| Capability | Guest | Player | Team Leader | Referee | Tournament Manager | Moderator | Super Admin |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Browse tournaments & leaderboards | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| Register Solo & Check-in | No | Yes | Yes | Yes | Yes | Yes | Yes |
| Create/Manage Team & Register Team | No | No | Yes | No | No | No | Yes |
| Submit own match result + evidence | No | Yes | Yes | No | No | No | Yes |
| Enter/Approve results (assigned scope) | No | No | No | Yes | Yes | No | Yes |
| Review disputes & violations | No | No | No | No | Yes (scoped) | Yes | Yes |
| Build/Edit/Seed assigned tournament | No | No | No | No | Yes | No | Yes |
| Global settings & RBAC management | No | No | No | No | No | No | Yes |
