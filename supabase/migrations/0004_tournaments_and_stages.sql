-- 0004_tournaments_and_stages.sql
CREATE TABLE IF NOT EXISTS tournaments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  game_id uuid NOT NULL REFERENCES games(id),
  game_version text,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text NOT NULL DEFAULT '',
  description_en text NOT NULL DEFAULT '',
  cover_image_url text,
  rules_url text,
  rules_text_ar text NOT NULL DEFAULT '',
  rules_text_en text NOT NULL DEFAULT '',
  competition_type text NOT NULL CHECK (competition_type IN ('solo', 'team')),
  language text NOT NULL DEFAULT 'both' CHECK (language IN ('ar', 'en', 'both')),
  status text NOT NULL DEFAULT 'draft' CHECK (
    status IN (
      'draft', 'published', 'registration_open', 'registration_closed',
      'check_in', 'ready', 'live', 'completed', 'archived', 'cancelled', 'suspended'
    )
  ),
  config_locked boolean NOT NULL DEFAULT false,
  min_participants integer NOT NULL DEFAULT 2 CHECK (min_participants >= 1),
  max_participants integer NOT NULL DEFAULT 0 CHECK (max_participants >= 0),
  team_size integer NOT NULL DEFAULT 1 CHECK (team_size >= 1),
  substitute_slots integer NOT NULL DEFAULT 0 CHECK (substitute_slots >= 0),
  dispute_window_minutes integer NOT NULL DEFAULT 30 CHECK (dispute_window_minutes >= 0),
  prize_summary_ar text,
  prize_summary_en text,
  registration_deadline timestamptz,
  checkin_opens_at timestamptz,
  checkin_closes_at timestamptz,
  starts_at timestamptz,
  timezone text NOT NULL DEFAULT 'Africa/Cairo',
  created_by uuid REFERENCES player_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS tournament_admins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('tournament_manager', 'referee', 'moderator')),
  assigned_by uuid REFERENCES player_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, user_id, role)
);

CREATE TABLE IF NOT EXISTS stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_order integer NOT NULL CHECK (stage_order >= 1),
  name_ar text NOT NULL,
  name_en text NOT NULL,
  format text NOT NULL CHECK (format IN ('ffa', 'points', 'groups', 'knockout')),
  participant_mode text NOT NULL CHECK (participant_mode IN ('solo', 'team')),
  seeding_mode text NOT NULL DEFAULT 'seeded_snake' CHECK (seeding_mode IN ('seeded_snake', 'random_prng')),
  random_seed text,
  qualify_count integer NOT NULL DEFAULT 1 CHECK (qualify_count >= 1),
  advance_rule text NOT NULL DEFAULT 'top_n_per_group' CHECK (
    advance_rule IN ('top_n_per_group', 'top_n_overall', 'bracket_winners')
  ),
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'completed')),
  starts_at timestamptz,
  UNIQUE (tournament_id, stage_order)
);

CREATE TABLE IF NOT EXISTS tournament_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  created_by uuid REFERENCES player_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
