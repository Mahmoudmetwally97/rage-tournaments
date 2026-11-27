-- 0008_rls_and_rpcs.sql
-- Enable Row Level Security on all public tables
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

-- Public read policies for non-sensitive catalog/tournament data
CREATE POLICY "Public read active games" ON games FOR SELECT USING (is_active = true);
CREATE POLICY "Public read non-draft tournaments" ON tournaments FOR SELECT USING (status != 'draft');
CREATE POLICY "Public read stages" ON stages FOR SELECT USING (true);
CREATE POLICY "Public read groups" ON groups FOR SELECT USING (true);
CREATE POLICY "Public read group_participants" ON group_participants FOR SELECT USING (true);
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);

-- Player owns own profile & notifications
CREATE POLICY "Users read own profile" ON player_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON player_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users read own notifications" ON notifications FOR SELECT USING (auth.uid() = user_id);

-- Transactional Solo Registration RPC with FOR UPDATE lock
CREATE OR REPLACE FUNCTION register_solo_participant(
  p_tournament_id uuid,
  p_user_id uuid,
  p_ign_snapshot text,
  p_registration_code text
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tournament tournaments%ROWTYPE;
  v_active_count integer;
  v_waitlist_pos integer;
  v_status text;
  v_reg_id uuid;
BEGIN
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
    p_tournament_id, p_user_id, p_ign_snapshot, p_registration_code, v_status, v_waitlist_pos
  )
  RETURNING id INTO v_reg_id;

  RETURN jsonb_build_object(
    'registration_id', v_reg_id,
    'status', v_status,
    'waitlist_position', v_waitlist_pos
  );
END;
$$;
