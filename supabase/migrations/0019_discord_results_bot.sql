-- 0011_discord_results_bot.sql
-- Discord results bot: screenshot submissions are stored as PENDING. Nothing touches
-- match_results / standings / brackets until an organizer approves.

-- Channel -> tournament link (set with /rage link in Discord).
CREATE TABLE IF NOT EXISTS bot_channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guild_id text NOT NULL,
  channel_id text NOT NULL UNIQUE,
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  room_hint text,                         -- optional fixed room name, e.g. 'Room 2'
  linked_by_discord_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Discord users allowed to approve results (organizers). Mapped to a staff profile.
CREATE TABLE IF NOT EXISTS bot_approvers (
  discord_user_id text PRIMARY KEY,
  user_id uuid REFERENCES player_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS bot_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
  match_id uuid REFERENCES matches(id) ON DELETE SET NULL,
  guild_id text,
  channel_id text,
  message_id text,
  bot_message_id text,
  submitted_by_discord_id text,
  image_url text NOT NULL,
  image_sha256 text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,   -- raw model output
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,        -- [{registration_id, ign, rank, kills, confidence, match_score}]
  confidence numeric NOT NULL DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  issues jsonb NOT NULL DEFAULT '[]'::jsonb,      -- human-readable problems found by validation
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'unreadable', 'ignored')),
  decided_by_discord_id text,
  decided_by uuid REFERENCES player_profiles(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bot_sub_tournament_status ON bot_submissions(tournament_id, status, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bot_sub_message ON bot_submissions(channel_id, message_id, image_url);
CREATE INDEX IF NOT EXISTS idx_bot_sub_sha ON bot_submissions(tournament_id, image_sha256);

ALTER TABLE bot_channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_approvers ENABLE ROW LEVEL SECURITY;
ALTER TABLE bot_submissions ENABLE ROW LEVEL SECURITY;

-- Staff can read submissions of their tournament; all writes go through the functions below
-- or the service role (the bot API).
DROP POLICY IF EXISTS bot_submissions_staff_read ON bot_submissions;
CREATE POLICY bot_submissions_staff_read ON bot_submissions FOR SELECT
  USING (tournament_id IS NOT NULL AND is_tournament_staff(tournament_id));
DROP POLICY IF EXISTS bot_channels_staff_read ON bot_channels;
CREATE POLICY bot_channels_staff_read ON bot_channels FOR SELECT
  USING (is_tournament_staff(tournament_id));

ALTER TABLE match_results DROP CONSTRAINT IF EXISTS match_results_source_check;
ALTER TABLE match_results ADD CONSTRAINT match_results_source_check
  CHECK (source IN ('player_submission', 'admin_entry', 'discord_bot'));

-- Core apply: writes the approved result for a match exactly like admin_save_match_results,
-- but for a given actor. Internal only (not granted to clients).
CREATE OR REPLACE FUNCTION _apply_bot_submission(p_submission_id uuid, p_actor uuid, p_actor_discord text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  s bot_submissions%ROWTYPE; v_rule tournament_scoring_rules%ROWTYPE; r jsonb;
  v_rank integer; v_kills integer; v_pts numeric; v_count integer := 0; v_ver integer;
BEGIN
  SELECT * INTO s FROM bot_submissions WHERE id = p_submission_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'SUBMISSION_NOT_FOUND'; END IF;
  IF s.status <> 'pending' THEN RAISE EXCEPTION 'SUBMISSION_NOT_PENDING'; END IF;
  IF s.match_id IS NULL THEN RAISE EXCEPTION 'SUBMISSION_NO_MATCH'; END IF;
  SELECT * INTO v_rule FROM tournament_scoring_rules WHERE tournament_id = s.tournament_id AND is_active
    ORDER BY version DESC LIMIT 1;
  UPDATE match_results SET is_current = false WHERE match_id = s.match_id AND is_current;
  SELECT COALESCE(max(version), 0) + 1 INTO v_ver FROM match_results WHERE match_id = s.match_id;
  FOR r IN SELECT * FROM jsonb_array_elements(s.rows) LOOP
    IF (r->>'registration_id') IS NULL THEN CONTINUE; END IF;
    v_rank := NULLIF(r->>'rank','')::integer;
    v_kills := COALESCE(NULLIF(r->>'kills','')::integer, 0);
    IF v_kills < 0 THEN RAISE EXCEPTION 'BAD_KILLS'; END IF;
    IF NOT EXISTS (SELECT 1 FROM match_participants WHERE match_id = s.match_id AND registration_id = (r->>'registration_id')::uuid) THEN
      RAISE EXCEPTION 'NOT_IN_MATCH';
    END IF;
    v_pts := COALESCE((v_rule.placement_points ->> v_rank::text)::numeric, 0) + v_kills * COALESCE(v_rule.kill_points, 0);
    INSERT INTO match_results (match_id, registration_id, version, placement, kills, score, points_awarded,
      source, approval_status, is_current, submitted_by, approved_by, approved_at, reason)
    VALUES (s.match_id, (r->>'registration_id')::uuid, v_ver, v_rank, v_kills, v_pts, v_pts,
      'discord_bot', 'approved', true, NULL, p_actor, now(), 'bot submission ' || s.id::text);
    v_count := v_count + 1;
  END LOOP;
  UPDATE matches SET status = 'completed' WHERE id = s.match_id;
  UPDATE bot_submissions SET status = 'approved', decided_by = p_actor, decided_by_discord_id = p_actor_discord, decided_at = now()
    WHERE id = s.id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
    VALUES (p_actor, 'bot_result_approved', 'bot_submission', s.id,
            jsonb_build_object('match_id', s.match_id, 'rows', v_count, 'discord_user', p_actor_discord));
  RETURN jsonb_build_object('saved', v_count, 'match_id', s.match_id);
END $$;
REVOKE ALL ON FUNCTION _apply_bot_submission(uuid, uuid, text) FROM PUBLIC;

-- Dashboard approve: an organizer signed in on the site.
CREATE OR REPLACE FUNCTION admin_approve_bot_submission(p_submission_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_tid uuid;
BEGIN
  SELECT tournament_id INTO v_tid FROM bot_submissions WHERE id = p_submission_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'SUBMISSION_NOT_FOUND'; END IF;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager','referee']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN _apply_bot_submission(p_submission_id, auth.uid(), NULL);
END $$;

CREATE OR REPLACE FUNCTION admin_reject_bot_submission(p_submission_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_tid uuid;
BEGIN
  SELECT tournament_id INTO v_tid FROM bot_submissions WHERE id = p_submission_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'SUBMISSION_NOT_FOUND'; END IF;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager','referee']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE bot_submissions SET status = 'rejected', decided_by = auth.uid(), decided_at = now()
    WHERE id = p_submission_id AND status = 'pending';
END $$;

REVOKE ALL ON FUNCTION admin_approve_bot_submission(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION admin_reject_bot_submission(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_approve_bot_submission(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reject_bot_submission(uuid) TO authenticated;
-- The service role (bot API) calls _apply_bot_submission directly after checking bot_approvers.
GRANT EXECUTE ON FUNCTION _apply_bot_submission(uuid, uuid, text) TO service_role;
