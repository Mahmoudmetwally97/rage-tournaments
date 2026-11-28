-- 0006_registrations_and_rosters.sql
CREATE TABLE IF NOT EXISTS registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid REFERENCES player_profiles(id) ON DELETE CASCADE,
  team_id uuid REFERENCES teams(id) ON DELETE CASCADE,
  ign_snapshot text NOT NULL,
  registration_code text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CHECK (
    status IN ('pending', 'confirmed', 'checked_in', 'waitlisted', 'rejected', 'cancelled', 'disqualified')
  ),
  waitlist_position integer,
  seed integer,
  roster_locked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_registration_xor_participant CHECK (
    (user_id IS NOT NULL AND team_id IS NULL) OR
    (user_id IS NULL AND team_id IS NOT NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_solo
  ON registrations(tournament_id, user_id)
  WHERE user_id IS NOT NULL AND status NOT IN ('cancelled', 'rejected');

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_team
  ON registrations(tournament_id, team_id)
  WHERE team_id IS NOT NULL AND status NOT IN ('cancelled', 'rejected');

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_ign
  ON registrations(tournament_id, lower(ign_snapshot))
  WHERE status NOT IN ('cancelled', 'rejected', 'disqualified');

CREATE TABLE IF NOT EXISTS registration_roster_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  roster_role text NOT NULL CHECK (roster_role IN ('leader', 'starter', 'sub')),
  UNIQUE (tournament_id, user_id)
);

CREATE TABLE IF NOT EXISTS registration_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  registration_id uuid UNIQUE NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  checked_in_by uuid REFERENCES player_profiles(id),
  checked_in_at timestamptz NOT NULL DEFAULT now()
);
