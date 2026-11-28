-- 0014: Teams (SD) mode: team creation, invites, team registration/check-in,
-- single-elimination bracket with automatic advancement.
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS score_a integer,
  ADD COLUMN IF NOT EXISTS score_b integer,
  ADD COLUMN IF NOT EXISTS winner_registration_id uuid REFERENCES registrations(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_team
  ON registrations(tournament_id, team_id)
  WHERE team_id IS NOT NULL AND status NOT IN ('cancelled', 'rejected');

-- ---------- teams ----------
CREATE OR REPLACE FUNCTION create_team(p_game_id uuid, p_name text, p_tag text) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF length(trim(p_name)) < 2 THEN RAISE EXCEPTION 'TEAM_NAME_TOO_SHORT'; END IF;
  IF length(trim(p_tag)) < 2 OR length(trim(p_tag)) > 5 THEN RAISE EXCEPTION 'TEAM_TAG_2_TO_5'; END IF;
  IF EXISTS (SELECT 1 FROM teams WHERE game_id = p_game_id AND lower(name) = lower(trim(p_name))) THEN
    RAISE EXCEPTION 'TEAM_NAME_TAKEN';
  END IF;
  IF (SELECT count(*) FROM teams WHERE captain_id = auth.uid()) >= 3 THEN RAISE EXCEPTION 'TOO_MANY_TEAMS'; END IF;
  INSERT INTO teams (game_id, name, tag, captain_id) VALUES (p_game_id, trim(p_name), upper(trim(p_tag)), auth.uid())
    RETURNING id INTO v_id;
  INSERT INTO team_members (team_id, user_id, role, invite_status) VALUES (v_id, auth.uid(), 'member', 'accepted');
  RETURN v_id;
END $$;

CREATE OR REPLACE FUNCTION team_invite(p_team_id uuid, p_username text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_uid uuid;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND captain_id = auth.uid()) THEN RAISE EXCEPTION 'FORBIDDEN_NOT_TEAM_CAPTAIN'; END IF;
  SELECT id INTO v_uid FROM player_profiles WHERE lower(username) = lower(trim(p_username));
  IF v_uid IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF (SELECT count(*) FROM team_members WHERE team_id = p_team_id AND invite_status <> 'declined') >= 10 THEN RAISE EXCEPTION 'TEAM_FULL'; END IF;
  INSERT INTO team_members (team_id, user_id, role, invite_status) VALUES (p_team_id, v_uid, 'member', 'pending')
  ON CONFLICT (team_id, user_id) DO UPDATE SET invite_status = 'pending' WHERE team_members.invite_status = 'declined';
END $$;

CREATE OR REPLACE FUNCTION team_respond(p_team_id uuid, p_accept boolean) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  UPDATE team_members SET invite_status = CASE WHEN p_accept THEN 'accepted' ELSE 'declined' END, joined_at = now()
   WHERE team_id = p_team_id AND user_id = auth.uid() AND invite_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_INVITE'; END IF;
END $$;

CREATE OR REPLACE FUNCTION team_remove_member(p_team_id uuid, p_user_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND captain_id = auth.uid()) AND p_user_id <> auth.uid() THEN
    RAISE EXCEPTION 'FORBIDDEN_NOT_TEAM_CAPTAIN';
  END IF;
  IF EXISTS (SELECT 1 FROM teams WHERE id = p_team_id AND captain_id = p_user_id) THEN RAISE EXCEPTION 'CAPTAIN_CANNOT_LEAVE'; END IF;
  IF EXISTS (SELECT 1 FROM registration_roster_members rm JOIN registrations r ON r.id = rm.registration_id
             WHERE r.team_id = p_team_id AND rm.user_id = p_user_id AND r.status NOT IN ('cancelled','rejected')) THEN
    RAISE EXCEPTION 'ROSTER_LOCKED';
  END IF;
  DELETE FROM team_members WHERE team_id = p_team_id AND user_id = p_user_id;
END $$;

-- Team leader registers the team: roster = captain + accepted members, locked at registration.
CREATE OR REPLACE FUNCTION register_team(p_tournament_id uuid, p_team_id uuid, p_registration_code text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_t tournaments%ROWTYPE; v_team teams%ROWTYPE; v_active integer; v_pos integer; v_status text; v_reg uuid;
  v_ids uuid[]; v_uid uuid; i integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  IF NOT FOUND OR v_team.captain_id <> auth.uid() THEN RAISE EXCEPTION 'FORBIDDEN_NOT_TEAM_CAPTAIN'; END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF v_t.status <> 'registration_open' THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
  IF v_t.competition_type <> 'team' THEN RAISE EXCEPTION 'NOT_A_TEAM_TOURNAMENT'; END IF;
  IF v_team.game_id <> v_t.game_id THEN RAISE EXCEPTION 'TEAM_GAME_MISMATCH'; END IF;
  SELECT array_agg(user_id ORDER BY (user_id = v_team.captain_id) DESC, joined_at) INTO v_ids
    FROM team_members WHERE team_id = p_team_id AND invite_status = 'accepted';
  IF COALESCE(array_length(v_ids,1),0) < v_t.team_size THEN RAISE EXCEPTION 'TEAM_NOT_FULL'; END IF;
  IF array_length(v_ids,1) > v_t.team_size + v_t.substitute_slots THEN RAISE EXCEPTION 'TOO_MANY_PLAYERS'; END IF;
  SELECT count(*) INTO v_active FROM registrations WHERE tournament_id = p_tournament_id AND status IN ('pending','confirmed','checked_in');
  IF v_t.max_participants > 0 AND v_active >= v_t.max_participants THEN
    v_status := 'waitlisted';
    SELECT COALESCE(MAX(waitlist_position),0)+1 INTO v_pos FROM registrations WHERE tournament_id = p_tournament_id AND status = 'waitlisted';
  ELSE
    v_status := CASE WHEN v_t.requires_approval THEN 'pending' ELSE 'confirmed' END;
  END IF;
  BEGIN
    INSERT INTO registrations (tournament_id, team_id, ign_snapshot, registration_code, status, waitlist_position)
    VALUES (p_tournament_id, p_team_id, v_team.tag || ' ' || v_team.name, p_registration_code, v_status, v_pos) RETURNING id INTO v_reg;
    FOREACH v_uid IN ARRAY v_ids LOOP
      i := i + 1;
      INSERT INTO registration_roster_members (tournament_id, registration_id, user_id, roster_role)
      VALUES (p_tournament_id, v_reg, v_uid,
        CASE WHEN v_uid = v_team.captain_id THEN 'leader' WHEN i <= v_t.team_size THEN 'starter' ELSE 'sub' END);
    END LOOP;
  EXCEPTION WHEN unique_violation THEN
    RAISE EXCEPTION 'ALREADY_REGISTERED_OR_PLAYER_IN_ANOTHER_TEAM';
  END;
  RETURN jsonb_build_object('registration_id', v_reg, 'status', v_status);
END $$;

-- Check-in: the captain checks the team in (solo path unchanged).
CREATE OR REPLACE FUNCTION player_check_in(p_tournament_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_t tournaments%ROWTYPE; v_reg registrations%ROWTYPE; v_open boolean;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  v_open := v_t.status = 'check_in'
    OR (v_t.starts_at IS NOT NULL AND v_t.status IN ('registration_open','registration_closed','ready')
        AND now() >= v_t.starts_at - interval '40 minutes' AND now() < v_t.starts_at + interval '6 hours');
  IF NOT v_open THEN RAISE EXCEPTION 'CHECKIN_CLOSED'; END IF;
  SELECT * INTO v_reg FROM registrations WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
    AND status IN ('confirmed','checked_in');
  IF NOT FOUND THEN
    SELECT r.* INTO v_reg FROM registrations r JOIN teams t ON t.id = r.team_id
     WHERE r.tournament_id = p_tournament_id AND t.captain_id = auth.uid() AND r.status IN ('confirmed','checked_in');
  END IF;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ACCEPTED'; END IF;
  UPDATE registrations SET status = 'checked_in' WHERE id = v_reg.id;
  INSERT INTO registration_checkins (registration_id, checked_in_by) VALUES (v_reg.id, auth.uid())
    ON CONFLICT (registration_id) DO NOTHING;
END $$;

-- ---------- bracket ----------
CREATE OR REPLACE FUNCTION _bracket_advance(p_match_id uuid, p_winner uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE m matches%ROWTYPE; v_slot integer;
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match_id;
  UPDATE matches SET winner_registration_id = p_winner, status = 'completed' WHERE id = p_match_id;
  IF m.next_match_id IS NOT NULL THEN
    v_slot := ((m.match_number - 1) % 2) + 1;
    DELETE FROM match_participants WHERE match_id = m.next_match_id AND slot_number = v_slot;
    INSERT INTO match_participants (match_id, registration_id, slot_number) VALUES (m.next_match_id, p_winner, v_slot);
  ELSE
    UPDATE stages SET status = 'completed' WHERE id = m.stage_id;
  END IF;
END $$;

CREATE OR REPLACE FUNCTION admin_seed_bracket(p_tournament_id uuid, p_stage_order integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_stage stages%ROWTYPE; v_regs uuid[]; v_n integer; v_size integer := 1; v_rounds integer := 0;
  v_order integer[] := ARRAY[1]; v_new integer[]; x integer; r integer; k integer;
  v_ids uuid[][]; v_mid uuid[]; v_prev uuid[]; v_a uuid; v_b uuid; v_m uuid;
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_stage FROM stages WHERE tournament_id = p_tournament_id AND stage_order = p_stage_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM matches mm WHERE mm.stage_id = v_stage.id AND mm.status = 'completed') THEN RAISE EXCEPTION 'STAGE_HAS_RESULTS'; END IF;
  SELECT array_agg(id ORDER BY COALESCE(seed, 2147483647), created_at) INTO v_regs
    FROM registrations WHERE tournament_id = p_tournament_id AND status = 'checked_in' AND team_id IS NOT NULL;
  v_n := COALESCE(array_length(v_regs,1),0);
  IF v_n < 2 THEN RAISE EXCEPTION 'NEED_AT_LEAST_2_TEAMS'; END IF;
  WHILE v_size < v_n LOOP v_size := v_size * 2; v_rounds := v_rounds + 1; END LOOP;
  DELETE FROM matches WHERE stage_id = v_stage.id;
  -- standard seeding order (1 v size, 2 v size-1, ...)
  WHILE array_length(v_order,1) < v_size LOOP
    v_new := ARRAY[]::integer[];
    FOREACH x IN ARRAY v_order LOOP v_new := v_new || x || (2 * array_length(v_order,1) + 1 - x); END LOOP;
    v_order := v_new;
  END LOOP;
  -- build rounds from the final backwards so next_match_id exists
  v_prev := ARRAY[]::uuid[];
  FOR r IN REVERSE v_rounds..1 LOOP
    v_mid := ARRAY[]::uuid[];
    FOR k IN 1..(v_size / (2 ^ r)::integer) LOOP
      INSERT INTO matches (stage_id, round_number, match_number, next_match_id)
      VALUES (v_stage.id, r, k, CASE WHEN r = v_rounds THEN NULL ELSE v_prev[(k + 1) / 2] END) RETURNING id INTO v_m;
      v_mid := v_mid || v_m;
    END LOOP;
    v_prev := v_mid;
  END LOOP;
  -- round 1 participants
  FOR k IN 1..(v_size / 2) LOOP
    SELECT id INTO v_m FROM matches WHERE stage_id = v_stage.id AND round_number = 1 AND match_number = k;
    x := v_order[2*k-1]; v_a := CASE WHEN x <= v_n THEN v_regs[x] END;
    x := v_order[2*k];   v_b := CASE WHEN x <= v_n THEN v_regs[x] END;
    IF v_a IS NOT NULL THEN INSERT INTO match_participants (match_id, registration_id, slot_number) VALUES (v_m, v_a, 1); END IF;
    IF v_b IS NOT NULL THEN INSERT INTO match_participants (match_id, registration_id, slot_number) VALUES (v_m, v_b, 2); END IF;
    IF v_a IS NOT NULL AND v_b IS NULL THEN PERFORM _bracket_advance(v_m, v_a); END IF;
  END LOOP;
  UPDATE stages SET status = 'active' WHERE id = v_stage.id;
  RETURN jsonb_build_object('teams', v_n, 'rounds', v_rounds, 'byes', v_size - v_n);
END $$;

CREATE OR REPLACE FUNCTION admin_save_team_match(p_match_id uuid, p_score_a integer, p_score_b integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE m matches%ROWTYPE; v_tid uuid; v_a uuid; v_b uuid; v_w uuid; v_old uuid;
BEGIN
  SELECT * INTO m FROM matches WHERE id = p_match_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'MATCH_NOT_FOUND'; END IF;
  SELECT tournament_id INTO v_tid FROM stages WHERE id = m.stage_id;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager','referee']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_score_a IS NULL OR p_score_b IS NULL OR p_score_a < 0 OR p_score_b < 0 THEN RAISE EXCEPTION 'BAD_SCORE'; END IF;
  IF p_score_a = p_score_b THEN RAISE EXCEPTION 'NO_DRAWS'; END IF;
  SELECT registration_id INTO v_a FROM match_participants WHERE match_id = p_match_id AND slot_number = 1;
  SELECT registration_id INTO v_b FROM match_participants WHERE match_id = p_match_id AND slot_number = 2;
  IF v_a IS NULL OR v_b IS NULL THEN RAISE EXCEPTION 'WAITING_FOR_TEAMS'; END IF;
  IF m.next_match_id IS NOT NULL AND (SELECT status FROM matches WHERE id = m.next_match_id) = 'completed' THEN
    RAISE EXCEPTION 'RESULT_LOCKED';
  END IF;
  v_old := m.winner_registration_id;
  v_w := CASE WHEN p_score_a > p_score_b THEN v_a ELSE v_b END;
  UPDATE matches SET score_a = p_score_a, score_b = p_score_b WHERE id = p_match_id;
  PERFORM _bracket_advance(p_match_id, v_w);
  RETURN jsonb_build_object('winner', v_w, 'changed', v_old IS DISTINCT FROM v_w);
END $$;

REVOKE ALL ON FUNCTION _bracket_advance(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION create_team(uuid,text,text), team_invite(uuid,text), team_respond(uuid,boolean),
  team_remove_member(uuid,uuid), register_team(uuid,uuid,text), player_check_in(uuid),
  admin_seed_bracket(uuid,integer), admin_save_team_match(uuid,integer,integer) TO authenticated;
