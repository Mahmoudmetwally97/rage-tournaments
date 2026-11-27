-- 0003_teams_and_members.sql
CREATE TABLE IF NOT EXISTS teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL REFERENCES games(id),
  name text NOT NULL,
  tag text NOT NULL,
  captain_id uuid NOT NULL REFERENCES player_profiles(id),
  logo_url text,
  region text NOT NULL DEFAULT 'EG / MENA',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'sub')),
  invite_status text NOT NULL DEFAULT 'pending' CHECK (invite_status IN ('pending', 'accepted', 'declined')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id)
);
