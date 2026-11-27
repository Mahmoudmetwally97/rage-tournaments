# RAGE TOURNAMENTS — Database Schema (PostgreSQL / Supabase)

## 1. Database Rules
- Use **UUID** primary keys for all entities. Never use player names/IGNs as primary keys.
- Separate authentication accounts (`auth.users`) from `player_profiles` and per-game identities (`player_game_profiles`).
- Enforce Foreign Keys, Unique Constraints, and `CHECK` constraints at the database level.
- Use **UTC** (`timestamptz`) for all stored dates/times.
- Use `jsonb` only for flexible stage/scoring configurations—never as a replacement for relational tables.
- Preserve historical versions of match results (`match_results` versioning + `audit_logs`).
- Execute critical operations inside PostgreSQL transactions (`FOR UPDATE` row locking in RPCs).

---

## 2. Core & Extended Tables

### Multi-Game Registry & Identity
- `games`: `id (uuid PK)`, `slug (text UNIQUE NOT NULL)` (initial seed: `'crossfire-rage'`), `name_en (text NOT NULL)`, `name_ar (text NOT NULL)`, `default_team_size (integer DEFAULT 5)`, `supported_formats (jsonb DEFAULT '["ffa","points","groups","knockout"]')`, `is_active (boolean DEFAULT true)`, `created_at`.
- `player_profiles`: `id (uuid PK, FK -> auth.users)`, `username (unique)`, `display_name`, `preferred_locale ('ar'|'en')`, `discord_handle`, `whatsapp_number`, `created_at`, `updated_at`.
- `player_game_profiles`: `id (uuid PK)`, `user_id (FK -> player_profiles ON DELETE CASCADE)`, `game_id (FK -> games)`, `ign (text NOT NULL)`, `ign_lower (generated)`, `is_verified (boolean DEFAULT false)`, `created_at`, `updated_at`. Unique `(user_id, game_id)`. *(Enables multi-game support without redesigning profiles.)*
- `account_links`: `id (uuid PK)`, `user_id (FK -> player_profiles)`, `provider ('rage_crossfire')`, `external_identifier (text)`, `external_identifier_lower (generated unique per provider)`, `status ('pending'|'verified'|'revoked')`, `verified_by (FK NULL)`, `verified_at`. *(Prevents one RAGE account from linking to multiple platform accounts.)*

### RBAC & Scoped Administration
- `user_roles`: `id (uuid PK)`, `user_id (FK)`, `role ('player'|'team_leader'|'referee'|'tournament_manager'|'moderator'|'super_admin')`, `granted_by (FK)`.
- `tournament_admins`: `id (uuid PK)`, `tournament_id (FK)`, `user_id (FK)`, `role ('tournament_manager'|'referee'|'moderator')`, `assigned_by (FK)`. *(Enforces scoped authorization per tournament.)*

### Teams
- `teams`: `id (uuid PK)`, `game_id (FK -> games)`, `name`, `tag`, `captain_id (FK -> player_profiles)`, `logo_url`, `region`, `created_at`.
- `team_members`: `id (uuid PK)`, `team_id (FK)`, `user_id (FK)`, `role ('leader'|'member'|'sub')`, `invite_status ('pending'|'accepted'|'declined')`, `joined_at`. *(Prevents Team Leader from registering a player without acceptance.)*

### Tournaments, Lifecycle & Builder Config
- `tournaments`: `id (uuid PK)`, `slug (unique)`, `game_id (FK -> games NOT NULL)`, `game_version`, `title_ar`, `title_en`, `description_ar`, `description_en`, `cover_image_url`, `rules_url`, `rules_text_ar`, `rules_text_en`, `competition_type ('solo'|'team')`, `language ('ar'|'en'|'both')`, `status ('draft'|'published'|'registration_open'|'registration_closed'|'check_in'|'ready'|'live'|'completed'|'archived'|'cancelled'|'suspended')`, `min_participants`, `max_participants (0 = unlimited)`, `team_size`, `substitute_slots`, `registration_deadline (timestamptz)`, `checkin_opens_at (timestamptz)`, `checkin_closes_at (timestamptz)`, `starts_at (timestamptz)`, `timezone (text DEFAULT 'Africa/Cairo')`, `created_by (FK)`.
- `tournament_scoring_rules`: `id (uuid PK)`, `tournament_id (FK)`, `stage_id (FK NULL)`, `version (integer)`, `placement_points (jsonb)`, `kill_points (numeric)`, `win_points (numeric)`, `round_count (integer)`, `aggregation_mode ('aggregate'|'best_round')`, `tie_breaker_rules (jsonb)`, `is_active (boolean)`.
- `tournament_announcements`: `id (uuid PK)`, `tournament_id (FK)`, `title`, `body`, `created_by (FK)`, `created_at`.

### Registrations & Check-in
- `registrations`: `id (uuid PK)`, `tournament_id (FK)`, `user_id (FK NULL)`, `team_id (FK NULL)`, `ign_snapshot`, `registration_code (unique)`, `status ('pending'|'confirmed'|'checked_in'|'waitlisted'|'rejected'|'cancelled'|'disqualified')`, `waitlist_position (integer NULL)`, `created_at`.
- `registration_checkins`: `id (uuid PK)`, `registration_id (FK UNIQUE)`, `checked_in_by (FK)`, `checked_in_at (timestamptz)`.

### Reusable Stages, Groups, Matches & Qualifications
- `stages`: `id (uuid PK)`, `tournament_id (FK)`, `stage_order`, `name_ar`, `name_en`, `format ('ffa'|'points'|'groups'|'knockout')`, `participant_mode ('solo'|'team')`, `config (jsonb)`, `qualify_count (integer)`, `advance_rule ('top_n_per_group'|'top_n_overall'|'bracket_winners')`, `status ('pending'|'active'|'completed')`, `starts_at (timestamptz)`. *(Custom tournaments compose ordered rows of reusable `stages` with explicit `advance_rule` and `participant_mode`.)*
- `groups`: `id (uuid PK)`, `stage_id (FK)`, `name`, `group_order`.
- `matches`: `id (uuid PK)`, `stage_id (FK)`, `group_id (FK NULL)`, `round_number`, `match_number`, `status ('scheduled'|'live'|'pending_review'|'completed'|'disputed')`, `next_match_id (FK NULL)`, `scheduled_at (timestamptz)`.
- `match_participants`: `id (uuid PK)`, `match_id (FK)`, `registration_id (FK)`, `slot_number`.
- `stage_qualifications`: `id (uuid PK)`, `from_stage_id (FK)`, `to_stage_id (FK)`, `registration_id (FK)`, `rank_position`, `qualified_at`.

### Results, Evidence, Disputes & Audit
- `match_results`: `id (uuid PK)`, `match_id (FK)`, `registration_id (FK)`, `version (integer)`, `placement (integer NULL)`, `kills (integer DEFAULT 0)`, `score (numeric DEFAULT 0)`, `points_awarded (numeric DEFAULT 0)`, `source ('player_submission'|'admin_entry')`, `approval_status ('pending_review'|'approved'|'rejected')`, `is_current (boolean)`, `submitted_by (FK)`, `approved_by (FK NULL)`, `reason (text)`, `created_at`. *(Preserves full edit history before/after changes.)*
- `result_evidence`: `id (uuid PK)`, `match_result_id (FK)`, `storage_path`, `mime_type`, `uploaded_by (FK)`, `created_at`.
- `disputes`: `id (uuid PK)`, `match_id (FK)`, `raised_by (FK)`, `reason`, `status ('submitted'|'under_review'|'resolved')`, `resolution_action ('accept'|'reject'|'request_evidence'|'correct_result'|'reopen' NULL)`, `resolved_by (FK NULL)`, `resolution_note`, `created_at`, `resolved_at`.
- `notification_preferences` & `notifications`: In-app notification feed + user preferences.
- `audit_logs`: `id (uuid PK)`, `actor_id (FK)`, `action`, `entity_type`, `entity_id (uuid)`, `before_state (jsonb)`, `after_state (jsonb)`, `created_at`.
