# RAGE TOURNAMENTS — Database Schema (PostgreSQL / Supabase)

## 1. Database Rules
- Use **UUID** primary keys for all entities. Never use player names/IGNs as primary keys.
- Separate authentication accounts (`auth.users`) from `player_profiles` and per-game identities (`player_game_profiles`).
- Enforce Foreign Keys, `CHECK` constraints, and partial `UNIQUE` indexes at the database level.
- Use **UTC** (`timestamptz`) for all stored dates/times.
- Use `jsonb` only for flexible stage/scoring configurations—never as a replacement for relational tables.
- Preserve historical versions of match results (`match_results` versioning + `audit_logs`).
- Execute critical operations inside PostgreSQL transactions (`SELECT ... FOR UPDATE` row locking in RPCs).

---

## 2. Proposed Migration Sequence (Dependency-Safe Order)
1. **`0001_games_and_profiles.sql`**: `games`, `player_profiles`, `player_game_profiles`, `account_links`
2. **`0002_rbac_and_audit.sql`**: `user_roles` (global roles only), `audit_logs`
3. **`0003_teams_and_members.sql`**: `teams`, `team_members`
4. **`0004_tournaments_and_stages.sql`**: `tournaments`, `tournament_admins`, `stages`, `tournament_announcements`
5. **`0005_scoring_rules.sql`**: `tournament_scoring_rules` *(created AFTER `stages` so `stage_id FK -> stages(id)` resolves cleanly)*
6. **`0006_registrations_and_rosters.sql`**: `registrations`, `registration_roster_members`, `registration_checkins`
7. **`0007_groups_matches_and_results.sql`**: `groups`, `group_participants`, `matches`, `match_participants`, `stage_qualifications`, `match_results`, `result_evidence`, `disputes`, `notifications`, `notification_preferences`
8. **`0008_rls_and_rpcs.sql`**: Row-Level Security policies + transactional RPCs (`register_solo`, `register_team`, `promote_waitlist`, `advance_stage`, `commit_match_result`)

---

## 3. Core Tables, Constraints & Indexes

### Multi-Game Registry & Identity
- `games`: `id (uuid PK)`, `slug (text UNIQUE NOT NULL)`, `name_en`, `name_ar`, `default_team_size (int DEFAULT 5)`, `supported_formats (jsonb)`, `is_active (bool DEFAULT true)`.
- `player_profiles`: `id (uuid PK, FK -> auth.users)`, `username (UNIQUE NOT NULL)`, `display_name`, `preferred_locale ('ar'|'en')`, `discord_handle`, `whatsapp_number`, `created_at`, `updated_at`.
- `player_game_profiles`: `id (uuid PK)`, `user_id (FK -> player_profiles ON DELETE CASCADE)`, `game_id (FK -> games)`, `ign (text NOT NULL)`, `ign_lower (generated)`, `is_verified (bool DEFAULT false)`.
  - `UNIQUE (user_id, game_id)`
- `account_links`: `id (uuid PK)`, `user_id (FK)`, `provider ('rage_crossfire')`, `external_identifier`, `external_identifier_lower (generated)`, `status ('pending'|'verified'|'revoked')`, `verified_by (FK NULL)`, `verified_at`.
  - `UNIQUE (provider, external_identifier_lower) WHERE status != 'revoked'`

### RBAC & Scoped Administration
- `user_roles` (Global roles only): `id (uuid PK)`, `user_id (FK)`, `role ('player'|'moderator'|'super_admin')`, `granted_by (FK)`. `UNIQUE (user_id, role)`.
- `tournament_admins` (Tournament-scoped roles): `id (uuid PK)`, `tournament_id (FK)`, `user_id (FK)`, `role ('tournament_manager'|'referee'|'moderator')`, `assigned_by (FK)`. `UNIQUE (tournament_id, user_id, role)`.
  - *(Note: `team_leader` is NOT a global role; it is derived from `teams.captain_id` / `team_members.role = 'leader'`.)*

### Teams & Membership Rules
- `teams`: `id (uuid PK)`, `game_id (FK -> games)`, `name`, `tag`, `captain_id (FK -> player_profiles)`, `logo_url`, `region`, `created_at`.
- `team_members`: `id (uuid PK)`, `team_id (FK -> teams ON DELETE CASCADE)`, `user_id (FK -> player_profiles ON DELETE CASCADE)`, `role ('leader'|'member'|'sub')`, `invite_status ('pending'|'accepted'|'declined')`, `joined_at`.
  - `UNIQUE (team_id, user_id)` — prevents duplicate members in the same team.
  - Players **may** belong to multiple teams for the same game, but **cannot** compete on two teams in the same tournament (enforced by `registration_roster_members`).

### Tournaments, Lifecycle & Team Size Rules
- `tournaments`: `id (uuid PK)`, `slug (UNIQUE)`, `game_id (FK -> games)`, `competition_type ('solo'|'team')`, `status ('draft'|'published'|'registration_open'|'registration_closed'|'check_in'|'ready'|'live'|'completed'|'archived'|'cancelled'|'suspended')`, `config_locked (bool DEFAULT false)`, `min_participants (int)`, `max_participants (int DEFAULT 0)` (`0` = unlimited), `team_size (int DEFAULT 1)` (**includes Team Leader**), `substitute_slots (int DEFAULT 0)` (**additional** bench slots beyond `team_size`), `dispute_window_minutes (int DEFAULT 30)`, `registration_deadline (timestamptz)`, `checkin_opens_at (timestamptz)`, `checkin_closes_at (timestamptz)`, `starts_at (timestamptz)`, `timezone (text DEFAULT 'Africa/Cairo')`, `created_by (FK)`.

### Registrations & Capacity Enforcement
- `registrations`: `id (uuid PK)`, `tournament_id (FK)`, `user_id (FK NULL)`, `team_id (FK NULL)`, `ign_snapshot (text NOT NULL)`, `registration_code (text UNIQUE NOT NULL)`, `status ('pending'|'confirmed'|'checked_in'|'waitlisted'|'rejected'|'cancelled'|'disqualified')`, `waitlist_position (int NULL)`, `roster_locked_at (timestamptz NULL)`, `created_at`.
  - **XOR Constraint:** `CHECK ((user_id IS NOT NULL AND team_id IS NULL) OR (user_id IS NULL AND team_id IS NOT NULL))`
  - **Duplicate Prevention:**
    - `CREATE UNIQUE INDEX uq_reg_solo ON registrations(tournament_id, user_id) WHERE user_id IS NOT NULL AND status NOT IN ('cancelled','rejected');`
    - `CREATE UNIQUE INDEX uq_reg_team ON registrations(tournament_id, team_id) WHERE team_id IS NOT NULL AND status NOT IN ('cancelled','rejected');`
- `registration_roster_members`: `id (uuid PK)`, `tournament_id (FK)`, `registration_id (FK -> registrations ON DELETE CASCADE)`, `user_id (FK)`, `roster_role ('leader'|'starter'|'sub')`.
  - `UNIQUE (tournament_id, user_id)` — guarantees no player competes on two teams in the same tournament.

### Reusable Stages, Groups, Matches, Results & Disputes
- `stages`: `id (uuid PK)`, `tournament_id (FK)`, `stage_order (int)`, `format ('ffa'|'points'|'groups'|'knockout')`, `participant_mode ('solo'|'team')`, `seeding_mode ('seeded_snake'|'random_prng')`, `random_seed (text NULL)`, `qualify_count (int)`, `advance_rule ('top_n_per_group'|'top_n_overall'|'bracket_winners')`, `config (jsonb)`, `status ('pending'|'active'|'completed')`. `UNIQUE (tournament_id, stage_order)`.
- `tournament_scoring_rules`: `id (uuid PK)`, `tournament_id (FK)`, `stage_id (FK -> stages NULL)`, `version (int)`, `placement_points (jsonb)`, `kill_points (numeric)`, `win_points (numeric)`, `round_count (int)`, `aggregation_mode ('aggregate'|'best_round')`, `tie_breaker_rules (jsonb)`, `is_active (bool)`.
- `groups`: `id (uuid PK)`, `stage_id (FK)`, `name`, `group_order`.
- `group_participants`: `id (uuid PK)`, `group_id (FK)`, `registration_id (FK)`, `seed_in_group (int)`. `UNIQUE (group_id, registration_id)`. *(Canonical source of truth for group membership & standings.)*
- `matches`: `id (uuid PK)`, `stage_id (FK)`, `group_id (FK NULL)`, `round_number`, `match_number`, `status ('scheduled'|'live'|'pending_review'|'completed'|'disputed')`, `next_match_id (FK NULL)`, `scheduled_at (timestamptz)`.
- `match_participants`: `id (uuid PK)`, `match_id (FK)`, `registration_id (FK)`, `slot_number`. `UNIQUE (match_id, registration_id)`.
- `stage_qualifications`, `match_results` (with `version`, `is_current`, `approval_status`, `approved_by`, `reason`), `result_evidence`, `disputes`, `notifications`, `audit_logs`.

---

## 4. Architecture Review — Resolved Issues
- **XOR Registration Integrity:** Added strict `CHECK` constraint ensuring every row in `registrations` belongs to either `user_id` OR `team_id`, never both or neither.
- **Duplicate Prevention & Multi-Team Rules:** Added partial unique indexes on `(tournament_id, user_id)`, `(tournament_id, team_id)`, `(team_id, user_id)`, plus `registration_roster_members` with `UNIQUE (tournament_id, user_id)` so a player can join multiple teams globally but only compete for one team per tournament.
- **Team Size & Substitutes:** Clarified `team_size` includes the Team Leader; `substitute_slots` are additional bench slots; rosters lock at `Ready` / `Check-in` close.
- **Concurrency:** Transactional capacity check via `SELECT ... FOR UPDATE` in PostgreSQL RPCs.
- **Migration Ordering & Group Membership:** Ordered `tournament_scoring_rules` (`0005`) after `stages` (`0004`), and added `group_participants` as the canonical group-membership table.
