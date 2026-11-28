-- 0007_groups_matches_and_results.sql
CREATE TABLE IF NOT EXISTS groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  name text NOT NULL,
  group_order integer NOT NULL CHECK (group_order >= 1)
);

CREATE TABLE IF NOT EXISTS group_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  seed_in_group integer NOT NULL DEFAULT 1,
  UNIQUE (group_id, registration_id)
);

CREATE TABLE IF NOT EXISTS matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  round_number integer NOT NULL DEFAULT 1,
  match_number integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'scheduled' CHECK (
    status IN ('scheduled', 'live', 'pending_review', 'completed', 'disputed')
  ),
  next_match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  scheduled_at timestamptz
);

CREATE TABLE IF NOT EXISTS match_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  slot_number integer NOT NULL DEFAULT 1,
  UNIQUE (match_id, registration_id)
);

CREATE TABLE IF NOT EXISTS stage_qualifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  to_stage_id uuid NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  rank_position integer NOT NULL,
  qualified_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (from_stage_id, to_stage_id, registration_id)
);

CREATE TABLE IF NOT EXISTS match_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  placement integer,
  kills integer NOT NULL DEFAULT 0,
  score numeric NOT NULL DEFAULT 0,
  points_awarded numeric NOT NULL DEFAULT 0,
  source text NOT NULL CHECK (source IN ('player_submission', 'admin_entry')),
  approval_status text NOT NULL DEFAULT 'pending_review' CHECK (
    approval_status IN ('pending_review', 'approved', 'rejected')
  ),
  is_current boolean NOT NULL DEFAULT true,
  submitted_by uuid REFERENCES player_profiles(id),
  approved_by uuid REFERENCES player_profiles(id),
  approved_at timestamptz,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS result_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_result_id uuid NOT NULL REFERENCES match_results(id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  mime_type text NOT NULL,
  uploaded_by uuid REFERENCES player_profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  raised_by uuid NOT NULL REFERENCES player_profiles(id),
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'under_review', 'resolved')),
  resolution_action text CHECK (
    resolution_action IN ('accept', 'reject', 'request_evidence', 'correct_result', 'reopen')
  ),
  resolved_by uuid REFERENCES player_profiles(id),
  resolution_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS notification_preferences (
  user_id uuid PRIMARY KEY REFERENCES player_profiles(id) ON DELETE CASCADE,
  in_app_enabled boolean NOT NULL DEFAULT true,
  discord_enabled boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
