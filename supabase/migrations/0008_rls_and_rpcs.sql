-- 0008_rls_and_rpcs.sql
-- Security & Database Hardening: Full RLS coverage + auth.uid()-verified SECURITY DEFINER RPCs

-- 1. Enable Row Level Security on ALL public tables
ALTER TABLE games ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_game_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_scoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_roster_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE registration_checkins ENABLE ROW LEVEL SECURITY;
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE group_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_qualifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE result_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 2. Security-Hardened Role Helper Functions
CREATE OR REPLACE FUNCTION is_super_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  );
$$;

CREATE OR REPLACE FUNCTION is_global_moderator() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE user_id = auth.uid() AND role IN ('moderator', 'super_admin')
  );
$$;

CREATE OR REPLACE FUNCTION is_tournament_staff(p_tournament_id uuid, p_roles text[] DEFAULT ARRAY['tournament_manager','referee','moderator']) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT is_super_admin() OR EXISTS (
    SELECT 1 FROM tournament_admins
    WHERE tournament_id = p_tournament_id
      AND user_id = auth.uid()
      AND role = ANY(p_roles)
  );
$$;

-- 3. RLS Policies
-- Public catalog & tournament structure (non-draft)
CREATE POLICY "Public read active games" ON games FOR SELECT USING (is_active = true);
CREATE POLICY "Super admin manage games" ON games FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Public read non-draft tournaments" ON tournaments FOR SELECT USING (status != 'draft' OR is_tournament_staff(id));
CREATE POLICY "Admins insert tournaments" ON tournaments FOR INSERT WITH CHECK (is_super_admin());
CREATE POLICY "Scoped managers update tournaments" ON tournaments FOR UPDATE USING (is_tournament_staff(id, ARRAY['tournament_manager']));

CREATE POLICY "Public read stages" ON stages FOR SELECT USING (true);
CREATE POLICY "Managers manage stages" ON stages FOR ALL USING (is_tournament_staff(tournament_id, ARRAY['tournament_manager'])) WITH CHECK (is_tournament_staff(tournament_id, ARRAY['tournament_manager']));

CREATE POLICY "Public read scoring rules" ON tournament_scoring_rules FOR SELECT USING (true);
CREATE POLICY "Managers manage scoring rules" ON tournament_scoring_rules FOR ALL USING (is_tournament_staff(tournament_id, ARRAY['tournament_manager'])) WITH CHECK (is_tournament_staff(tournament_id, ARRAY['tournament_manager']));

CREATE POLICY "Public read announcements" ON tournament_announcements FOR SELECT USING (true);
CREATE POLICY "Managers manage announcements" ON tournament_announcements FOR ALL USING (is_tournament_staff(tournament_id, ARRAY['tournament_manager'])) WITH CHECK (is_tournament_staff(tournament_id, ARRAY['tournament_manager']));

CREATE POLICY "Public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public read group_participants" ON group_participants FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read match_participants" ON match_participants FOR SELECT USING (true);
CREATE POLICY "Public read stage_qualifications" ON stage_qualifications FOR SELECT USING (true);

-- Profiles & Private Contacts (never expose private contacts publicly)
CREATE POLICY "Users read own profile" ON player_profiles FOR SELECT USING (auth.uid() = id OR is_global_moderator());
CREATE POLICY "Users insert own profile" ON player_profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users update own profile" ON player_profiles FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "Public read game profiles" ON player_game_profiles FOR SELECT USING (true);
CREATE POLICY "Users manage own game profiles" ON player_game_profiles FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own account links" ON account_links FOR SELECT USING (auth.uid() = user_id OR is_global_moderator());
CREATE POLICY "Users request own account link" ON account_links FOR INSERT WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Moderators verify account links" ON account_links FOR UPDATE USING (is_global_moderator());

-- RBAC & Audit Logs
CREATE POLICY "Users read own roles" ON user_roles FOR SELECT USING (auth.uid() = user_id OR is_super_admin());
CREATE POLICY "Super admin manage roles" ON user_roles FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Staff read tournament admins" ON tournament_admins FOR SELECT USING (auth.uid() = user_id OR is_tournament_staff(tournament_id, ARRAY['tournament_manager']));
CREATE POLICY "Super admin manage tournament admins" ON tournament_admins FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "Admins read audit logs" ON audit_logs FOR SELECT USING (is_super_admin());

-- Teams & Members (teams.captain_id is single source of truth)
CREATE POLICY "Public read teams" ON teams FOR SELECT USING (true);
CREATE POLICY "Authenticated create own team" ON teams FOR INSERT WITH CHECK (auth.uid() = captain_id);
CREATE POLICY "Captain updates own team" ON teams FOR UPDATE USING (auth.uid() = captain_id) WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Team members read membership" ON team_members FOR SELECT USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.captain_id = auth.uid())
);
CREATE POLICY "Captain invites team members" ON team_members FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.captain_id = auth.uid()) AND invite_status = 'pending'
);
CREATE POLICY "Invited user responds or captain updates" ON team_members FOR UPDATE USING (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM teams t WHERE t.id = team_id AND t.captain_id = auth.uid())
);

-- Registrations, Rosters & Check-ins (writes go through SECURITY DEFINER RPCs)
CREATE POLICY "Public read active registrations" ON registrations FOR SELECT USING (status NOT IN ('rejected', 'cancelled') OR auth.uid() = user_id OR is_tournament_staff(tournament_id));
CREATE POLICY "Public read roster members" ON registration_roster_members FOR SELECT USING (true);
CREATE POLICY "Staff and owners read checkins" ON registration_checkins FOR SELECT USING (
  EXISTS (SELECT 1 FROM registrations r WHERE r.id = registration_id AND (r.user_id = auth.uid() OR is_tournament_staff(r.tournament_id)))
);

-- Results, Evidence & Disputes
CREATE POLICY "Public read approved results" ON match_results FOR SELECT USING (
  approval_status = 'approved' OR auth.uid() = submitted_by OR EXISTS (
    SELECT 1 FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = match_id AND is_tournament_staff(s.tournament_id)
  )
);
CREATE POLICY "Participants submit match results" ON match_results FOR INSERT WITH CHECK (
  auth.uid() = submitted_by AND source = 'player_submission' AND approval_status = 'pending_review'
);
CREATE POLICY "Staff review or enter results" ON match_results FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = match_id AND is_tournament_staff(s.tournament_id, ARRAY['tournament_manager','referee']))
);

CREATE POLICY "Participants and staff read evidence" ON result_evidence FOR SELECT USING (
  auth.uid() = uploaded_by OR EXISTS (
    SELECT 1 FROM match_results mr JOIN matches m ON m.id = mr.match_id JOIN stages s ON s.id = m.stage_id
    WHERE mr.id = match_result_id AND is_tournament_staff(s.tournament_id)
  )
);
CREATE POLICY "Submitter uploads own evidence" ON result_evidence FOR INSERT WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Match participants and staff read disputes" ON disputes FOR SELECT USING (
  auth.uid() = raised_by OR EXISTS (
    SELECT 1 FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = match_id AND is_tournament_staff(s.tournament_id)
  )
);
CREATE POLICY "Match participants raise disputes" ON disputes FOR INSERT WITH CHECK (
  auth.uid() = raised_by AND EXISTS (
    SELECT 1 FROM match_participants mp
    JOIN registrations r ON r.id = mp.registration_id
    LEFT JOIN teams t ON t.id = r.team_id
    WHERE mp.match_id = match_id AND (r.user_id = auth.uid() OR t.captain_id = auth.uid())
  )
);
CREATE POLICY "Staff resolve disputes" ON disputes FOR UPDATE USING (
  EXISTS (SELECT 1 FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = match_id AND is_tournament_staff(s.tournament_id, ARRAY['tournament_manager','moderator']))
);

-- Notifications
CREATE POLICY "Users manage own notification prefs" ON notification_preferences FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users mark own notifications read" ON notifications FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Hardened Transactional RPCs
CREATE OR REPLACE FUNCTION register_solo_participant(
  p_tournament_id uuid,
  p_ign_snapshot text,
  p_registration_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_tournament tournaments%ROWTYPE;
  v_active_count integer;
  v_waitlist_pos integer;
  v_status text;
  v_reg_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;

  IF v_tournament.status != 'registration_open' THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED';
  END IF;

  IF v_tournament.competition_type != 'solo' THEN
    RAISE EXCEPTION 'NOT_A_SOLO_TOURNAMENT';
  END IF;

  SELECT count(*) INTO v_active_count
  FROM registrations
  WHERE tournament_id = p_tournament_id
    AND status IN ('confirmed', 'checked_in');

  IF v_tournament.max_participants > 0 AND v_active_count >= v_tournament.max_participants THEN
    v_status := 'waitlisted';
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_pos
    FROM registrations
    WHERE tournament_id = p_tournament_id AND status = 'waitlisted';
  ELSE
    v_status := 'confirmed';
    v_waitlist_pos := NULL;
  END IF;

  INSERT INTO registrations (
    tournament_id, user_id, ign_snapshot, registration_code, status, waitlist_position
  ) VALUES (
    p_tournament_id, v_user_id, p_ign_snapshot, p_registration_code, v_status, v_waitlist_pos
  )
  RETURNING id INTO v_reg_id;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'status', v_status,
    'waitlist_position', v_waitlist_pos
  );
END;
$$;

CREATE OR REPLACE FUNCTION register_team_participant(
  p_tournament_id uuid,
  p_team_id uuid,
  p_starter_ids uuid[],
  p_sub_ids uuid[],
  p_registration_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid := auth.uid();
  v_tournament tournaments%ROWTYPE;
  v_team teams%ROWTYPE;
  v_active_count integer;
  v_waitlist_pos integer;
  v_status text;
  v_reg_id uuid;
  v_uid uuid;
BEGIN
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'UNAUTHORIZED';
  END IF;

  SELECT * INTO v_team FROM teams WHERE id = p_team_id;
  IF NOT FOUND OR v_team.captain_id != v_caller_id THEN
    RAISE EXCEPTION 'FORBIDDEN_NOT_TEAM_CAPTAIN';
  END IF;

  SELECT * INTO v_tournament
  FROM tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND';
  END IF;

  IF v_tournament.status != 'registration_open' THEN
    RAISE EXCEPTION 'REGISTRATION_CLOSED';
  END IF;

  IF v_tournament.competition_type != 'team' THEN
    RAISE EXCEPTION 'NOT_A_TEAM_TOURNAMENT';
  END IF;

  IF v_team.game_id != v_tournament.game_id THEN
    RAISE EXCEPTION 'TEAM_GAME_MISMATCH';
  END IF;

  IF COALESCE(array_length(p_starter_ids, 1), 0) != v_tournament.team_size THEN
    RAISE EXCEPTION 'INVALID_STARTER_COUNT';
  END IF;

  IF COALESCE(array_length(p_sub_ids, 1), 0) > v_tournament.substitute_slots THEN
    RAISE EXCEPTION 'TOO_MANY_SUBSTITUTES';
  END IF;

  IF NOT (v_team.captain_id = ANY(p_starter_ids)) THEN
    RAISE EXCEPTION 'CAPTAIN_MUST_BE_IN_STARTERS';
  END IF;

  -- Verify all non-captain starters & subs have accepted membership in this team
  FOREACH v_uid IN ARRAY p_starter_ids || COALESCE(p_sub_ids, ARRAY[]::uuid[])
  LOOP
    IF v_uid != v_team.captain_id AND NOT EXISTS (
      SELECT 1 FROM team_members tm
      WHERE tm.team_id = p_team_id AND tm.user_id = v_uid AND tm.invite_status = 'accepted'
    ) THEN
      RAISE EXCEPTION 'UNACCEPTED_ROSTER_MEMBER';
    END IF;
  END LOOP;

  SELECT count(*) INTO v_active_count
  FROM registrations
  WHERE tournament_id = p_tournament_id
    AND status IN ('confirmed', 'checked_in');

  IF v_tournament.max_participants > 0 AND v_active_count >= v_tournament.max_participants THEN
    v_status := 'waitlisted';
    SELECT COALESCE(MAX(waitlist_position), 0) + 1 INTO v_waitlist_pos
    FROM registrations
    WHERE tournament_id = p_tournament_id AND status = 'waitlisted';
  ELSE
    v_status := 'confirmed';
    v_waitlist_pos := NULL;
  END IF;

  INSERT INTO registrations (
    tournament_id, team_id, ign_snapshot, registration_code, status, waitlist_position
  ) VALUES (
    p_tournament_id, p_team_id, v_team.tag || ' ' || v_team.name, p_registration_code, v_status, v_waitlist_pos
  )
  RETURNING id INTO v_reg_id;

  FOREACH v_uid IN ARRAY p_starter_ids
  LOOP
    INSERT INTO registration_roster_members (tournament_id, registration_id, user_id, roster_role)
    VALUES (
      p_tournament_id,
      v_reg_id,
      v_uid,
      CASE WHEN v_uid = v_team.captain_id THEN 'leader' ELSE 'starter' END
    );
  END LOOP;

  FOREACH v_uid IN ARRAY COALESCE(p_sub_ids, ARRAY[]::uuid[])
  LOOP
    INSERT INTO registration_roster_members (tournament_id, registration_id, user_id, roster_role)
    VALUES (p_tournament_id, v_reg_id, v_uid, 'sub');
  END LOOP;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'status', v_status,
    'waitlist_position', v_waitlist_pos
  );
END;
$$;

REVOKE ALL ON FUNCTION register_solo_participant(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_solo_participant(uuid, text, text) TO authenticated;

REVOKE ALL ON FUNCTION register_team_participant(uuid, uuid, uuid[], uuid[], text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_team_participant(uuid, uuid, uuid[], uuid[], text) TO authenticated;
