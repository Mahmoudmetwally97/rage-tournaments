-- 0009_ffa_admin_prizes_claims.sql
-- Rage Cup FFA system: settings, prizes, bonuses, rules sections, claims, issues,
-- staff-guarded RPCs for approval, check-in, seeding and score entry, standings view.

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS requires_approval boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS contact_url text,
  ADD COLUMN IF NOT EXISTS contact_label text,
  ADD COLUMN IF NOT EXISTS room_size integer NOT NULL DEFAULT 25 CHECK (room_size >= 2),
  ADD COLUMN IF NOT EXISTS rules_sections jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Prize pools by rank range, with several rewards per pool.
CREATE TABLE IF NOT EXISTS prize_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  rank_from integer NOT NULL CHECK (rank_from >= 1),
  rank_to integer NOT NULL CHECK (rank_to >= rank_from),
  label_ar text NOT NULL DEFAULT '',
  label_en text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS prize_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES prize_pools(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('cash','coins','voucher','other')),
  amount numeric,
  currency text,
  text_ar text,
  text_en text,
  note text,
  is_placeholder boolean NOT NULL DEFAULT true
);
CREATE TABLE IF NOT EXISTS tournament_bonuses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  title_ar text NOT NULL,
  title_en text NOT NULL,
  description_ar text,
  description_en text,
  kind text NOT NULL DEFAULT 'other' CHECK (kind IN ('cash','coins','voucher','other')),
  amount numeric,
  is_placeholder boolean NOT NULL DEFAULT true
);

-- Prize claims and support issues raised by players.
CREATE TABLE IF NOT EXISTS prize_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  pool_id uuid REFERENCES prize_pools(id) ON DELETE SET NULL,
  payout_contact text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','paid','rejected')),
  staff_note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, registration_id)
);
CREATE TABLE IF NOT EXISTS tournament_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  subject text NOT NULL,
  body text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  staff_reply text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE prize_pools ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_bonuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournament_issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read prize pools" ON prize_pools FOR SELECT USING (true);
CREATE POLICY "Staff manage prize pools" ON prize_pools FOR ALL
  USING (is_tournament_staff(tournament_id, ARRAY['tournament_manager']))
  WITH CHECK (is_tournament_staff(tournament_id, ARRAY['tournament_manager']));
CREATE POLICY "Public read prize rewards" ON prize_rewards FOR SELECT USING (true);
CREATE POLICY "Staff manage prize rewards" ON prize_rewards FOR ALL
  USING (EXISTS (SELECT 1 FROM prize_pools p WHERE p.id = pool_id AND is_tournament_staff(p.tournament_id, ARRAY['tournament_manager'])))
  WITH CHECK (EXISTS (SELECT 1 FROM prize_pools p WHERE p.id = pool_id AND is_tournament_staff(p.tournament_id, ARRAY['tournament_manager'])));
CREATE POLICY "Public read bonuses" ON tournament_bonuses FOR SELECT USING (true);
CREATE POLICY "Staff manage bonuses" ON tournament_bonuses FOR ALL
  USING (is_tournament_staff(tournament_id, ARRAY['tournament_manager']))
  WITH CHECK (is_tournament_staff(tournament_id, ARRAY['tournament_manager']));

CREATE POLICY "Owner or staff read claims" ON prize_claims FOR SELECT
  USING (auth.uid() = user_id OR is_tournament_staff(tournament_id));
CREATE POLICY "Staff update claims" ON prize_claims FOR UPDATE
  USING (is_tournament_staff(tournament_id, ARRAY['tournament_manager']));
CREATE POLICY "Owner or staff read issues" ON tournament_issues FOR SELECT
  USING (auth.uid() = user_id OR is_tournament_staff(tournament_id));
CREATE POLICY "Owner opens issue" ON tournament_issues FOR INSERT
  WITH CHECK (auth.uid() = user_id AND status = 'open' AND staff_reply IS NULL);
CREATE POLICY "Staff reply issues" ON tournament_issues FOR UPDATE
  USING (is_tournament_staff(tournament_id));

-- Staff may edit stages, scoring, registrations (status only through RPC), matches.
CREATE POLICY "Staff manage matches" ON matches FOR ALL
  USING (EXISTS (SELECT 1 FROM stages s WHERE s.id = stage_id AND is_tournament_staff(s.tournament_id, ARRAY['tournament_manager','referee'])))
  WITH CHECK (EXISTS (SELECT 1 FROM stages s WHERE s.id = stage_id AND is_tournament_staff(s.tournament_id, ARRAY['tournament_manager','referee'])));

-- Registration: new players are pending when the tournament requires approval.
CREATE OR REPLACE FUNCTION register_solo_participant(
  p_tournament_id uuid, p_ign_snapshot text, p_registration_code text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_t tournaments%ROWTYPE;
  v_active integer; v_pos integer; v_status text; v_reg uuid;
BEGIN
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF v_t.status != 'registration_open' THEN RAISE EXCEPTION 'REGISTRATION_CLOSED'; END IF;
  IF v_t.competition_type != 'solo' THEN RAISE EXCEPTION 'NOT_A_SOLO_TOURNAMENT'; END IF;
  IF length(trim(p_ign_snapshot)) < 2 THEN RAISE EXCEPTION 'INVALID_IGN'; END IF;
  SELECT count(*) INTO v_active FROM registrations
    WHERE tournament_id = p_tournament_id AND status IN ('pending','confirmed','checked_in');
  IF v_t.max_participants > 0 AND v_active >= v_t.max_participants THEN
    v_status := 'waitlisted';
    SELECT COALESCE(MAX(waitlist_position),0)+1 INTO v_pos FROM registrations
      WHERE tournament_id = p_tournament_id AND status = 'waitlisted';
  ELSE
    v_status := CASE WHEN v_t.requires_approval THEN 'pending' ELSE 'confirmed' END;
  END IF;
  INSERT INTO registrations (tournament_id, user_id, ign_snapshot, registration_code, status, waitlist_position)
  VALUES (p_tournament_id, v_user_id, trim(p_ign_snapshot), p_registration_code, v_status, v_pos)
  RETURNING id INTO v_reg;
  RETURN jsonb_build_object('registration_id', v_reg, 'status', v_status, 'waitlist_position', v_pos);
END $$;

-- Player cancels own registration before the tournament goes live.
CREATE OR REPLACE FUNCTION cancel_my_registration(p_tournament_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF (SELECT status FROM tournaments WHERE id = p_tournament_id) IN ('live','completed','archived') THEN
    RAISE EXCEPTION 'TOURNAMENT_STARTED';
  END IF;
  UPDATE registrations SET status = 'cancelled'
   WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
     AND status IN ('pending','confirmed','checked_in','waitlisted');
END $$;

-- Player check-in (only while the tournament is in check_in).
CREATE OR REPLACE FUNCTION player_check_in(p_tournament_id uuid) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_t tournaments%ROWTYPE; v_reg registrations%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'TOURNAMENT_NOT_FOUND'; END IF;
  IF v_t.status != 'check_in' THEN RAISE EXCEPTION 'CHECKIN_CLOSED'; END IF;
  SELECT * INTO v_reg FROM registrations WHERE tournament_id = p_tournament_id AND user_id = auth.uid()
    AND status IN ('confirmed','checked_in');
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ACCEPTED'; END IF;
  UPDATE registrations SET status = 'checked_in' WHERE id = v_reg.id;
  INSERT INTO registration_checkins (registration_id, checked_in_by) VALUES (v_reg.id, auth.uid())
    ON CONFLICT (registration_id) DO NOTHING;
END $$;

-- Staff: approve/reject/ban/check-in/revert.
CREATE OR REPLACE FUNCTION admin_set_registration_status(p_registration_id uuid, p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_tid uuid;
BEGIN
  SELECT tournament_id INTO v_tid FROM registrations WHERE id = p_registration_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager','moderator']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_status NOT IN ('pending','confirmed','checked_in','waitlisted','rejected','disqualified') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;
  UPDATE registrations SET status = p_status WHERE id = p_registration_id;
  IF p_status = 'checked_in' THEN
    INSERT INTO registration_checkins (registration_id, checked_in_by) VALUES (p_registration_id, auth.uid())
      ON CONFLICT (registration_id) DO NOTHING;
  ELSE
    DELETE FROM registration_checkins WHERE registration_id = p_registration_id;
  END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
    VALUES (auth.uid(), 'registration_status', 'registration', p_registration_id, jsonb_build_object('status', p_status));
END $$;

-- Staff: lifecycle status.
CREATE OR REPLACE FUNCTION admin_set_tournament_status(p_tournament_id uuid, p_status text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_status NOT IN ('draft','published','registration_open','registration_closed','check_in','ready','live','completed','archived','cancelled','suspended') THEN
    RAISE EXCEPTION 'BAD_STATUS';
  END IF;
  UPDATE tournaments SET status = p_status WHERE id = p_tournament_id;
END $$;

-- Staff: seed stage 1 into rooms (snake by seed then signup time) and create matches.
CREATE OR REPLACE FUNCTION admin_seed_stage(p_tournament_id uuid, p_stage_order integer DEFAULT 1) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_t tournaments%ROWTYPE; v_stage stages%ROWTYPE; v_rooms integer; v_n integer;
  v_rounds integer; r record; g uuid; m uuid; i integer; rd integer;
  v_groups uuid[] := ARRAY[]::uuid[];
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;
  SELECT * INTO v_stage FROM stages WHERE tournament_id = p_tournament_id AND stage_order = p_stage_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM matches mm WHERE mm.stage_id = v_stage.id AND mm.status = 'completed') THEN
    RAISE EXCEPTION 'STAGE_HAS_RESULTS';
  END IF;
  DELETE FROM matches WHERE stage_id = v_stage.id;
  DELETE FROM groups WHERE stage_id = v_stage.id;
  SELECT count(*) INTO v_n FROM registrations WHERE tournament_id = p_tournament_id AND status = 'checked_in';
  IF v_n < 1 THEN RAISE EXCEPTION 'NO_CHECKED_IN_PLAYERS'; END IF;
  v_rooms := ceil(v_n::numeric / v_t.room_size);
  SELECT COALESCE(max(round_count),1) INTO v_rounds FROM tournament_scoring_rules
    WHERE tournament_id = p_tournament_id AND is_active;
  FOR i IN 1..v_rooms LOOP
    INSERT INTO groups (stage_id, name, group_order) VALUES (v_stage.id, 'Room ' || i, i) RETURNING id INTO g;
    v_groups := v_groups || g;
    FOR rd IN 1..v_rounds LOOP
      INSERT INTO matches (stage_id, group_id, round_number, match_number)
        VALUES (v_stage.id, g, rd, i) RETURNING id INTO m;
    END LOOP;
  END LOOP;
  i := 0;
  FOR r IN SELECT id FROM registrations WHERE tournament_id = p_tournament_id AND status = 'checked_in'
           ORDER BY COALESCE(seed, 2147483647), created_at LOOP
    DECLARE pos integer := i % (2 * v_rooms); idx integer;
    BEGIN
      idx := CASE WHEN pos < v_rooms THEN pos ELSE 2 * v_rooms - 1 - pos END;
      INSERT INTO group_participants (group_id, registration_id, seed_in_group)
        VALUES (v_groups[idx + 1], r.id, i / v_rooms + 1);
      INSERT INTO match_participants (match_id, registration_id, slot_number)
        SELECT mm.id, r.id, i / v_rooms + 1 FROM matches mm WHERE mm.group_id = v_groups[idx + 1];
    END;
    i := i + 1;
  END LOOP;
  UPDATE stages SET status = 'active' WHERE id = v_stage.id;
  RETURN jsonb_build_object('rooms', v_rooms, 'players', v_n, 'rounds', v_rounds);
END $$;

-- Staff: save one match's results (rank + kills per player). Points = placement points + kills * kill points.
CREATE OR REPLACE FUNCTION admin_save_match_results(p_match_id uuid, p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tid uuid; v_rule tournament_scoring_rules%ROWTYPE; r jsonb; v_rank integer; v_kills integer;
  v_pts numeric; v_count integer := 0;
BEGIN
  SELECT s.tournament_id INTO v_tid FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = p_match_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'MATCH_NOT_FOUND'; END IF;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager','referee']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_rule FROM tournament_scoring_rules WHERE tournament_id = v_tid AND is_active
    ORDER BY version DESC LIMIT 1;
  UPDATE match_results SET is_current = false WHERE match_id = p_match_id AND is_current;
  FOR r IN SELECT * FROM jsonb_array_elements(p_rows) LOOP
    v_rank := NULLIF(r->>'rank','')::integer;
    v_kills := COALESCE(NULLIF(r->>'kills','')::integer, 0);
    IF v_kills < 0 THEN RAISE EXCEPTION 'BAD_KILLS'; END IF;
    IF NOT EXISTS (SELECT 1 FROM match_participants WHERE match_id = p_match_id AND registration_id = (r->>'registration_id')::uuid) THEN
      RAISE EXCEPTION 'NOT_IN_MATCH';
    END IF;
    v_pts := COALESCE((v_rule.placement_points ->> v_rank::text)::numeric, 0) + v_kills * v_rule.kill_points;
    INSERT INTO match_results (match_id, registration_id, version, placement, kills, score, points_awarded,
      source, approval_status, is_current, submitted_by, approved_by, approved_at)
    VALUES (p_match_id, (r->>'registration_id')::uuid,
      COALESCE((SELECT max(version) FROM match_results WHERE match_id = p_match_id), 0) + 1,
      v_rank, v_kills, v_pts, v_pts, 'admin_entry', 'approved', true, auth.uid(), auth.uid(), now());
    v_count := v_count + 1;
  END LOOP;
  UPDATE matches SET status = 'completed' WHERE id = p_match_id;
  RETURN jsonb_build_object('saved', v_count);
END $$;

-- Staff: update scoring rule values (placement table, kill points).
CREATE OR REPLACE FUNCTION admin_set_scoring(p_tournament_id uuid, p_placement jsonb, p_kill numeric, p_rounds integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE tournament_scoring_rules
     SET placement_points = p_placement, kill_points = p_kill, round_count = GREATEST(p_rounds,1)
   WHERE tournament_id = p_tournament_id AND is_active;
END $$;

-- Staff: update tournament settings.
CREATE OR REPLACE FUNCTION admin_update_tournament(p_tournament_id uuid, p_patch jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE tournaments SET
    title_ar = COALESCE(p_patch->>'title_ar', title_ar),
    title_en = COALESCE(p_patch->>'title_en', title_en),
    max_participants = COALESCE((p_patch->>'max_participants')::int, max_participants),
    room_size = COALESCE((p_patch->>'room_size')::int, room_size),
    requires_approval = COALESCE((p_patch->>'requires_approval')::boolean, requires_approval),
    contact_url = CASE WHEN p_patch ? 'contact_url' THEN NULLIF(p_patch->>'contact_url','') ELSE contact_url END,
    contact_label = CASE WHEN p_patch ? 'contact_label' THEN NULLIF(p_patch->>'contact_label','') ELSE contact_label END,
    starts_at = CASE WHEN p_patch ? 'starts_at' THEN NULLIF(p_patch->>'starts_at','')::timestamptz ELSE starts_at END,
    checkin_opens_at = CASE WHEN p_patch ? 'checkin_opens_at' THEN NULLIF(p_patch->>'checkin_opens_at','')::timestamptz ELSE checkin_opens_at END,
    checkin_closes_at = CASE WHEN p_patch ? 'checkin_closes_at' THEN NULLIF(p_patch->>'checkin_closes_at','')::timestamptz ELSE checkin_closes_at END,
    rules_sections = CASE WHEN p_patch ? 'rules_sections' THEN p_patch->'rules_sections' ELSE rules_sections END
  WHERE id = p_tournament_id;
END $$;

-- Player claim and issue.
CREATE OR REPLACE FUNCTION player_claim_prize(p_tournament_id uuid, p_contact text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_reg uuid; v_rank integer; v_pool uuid; v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF (SELECT status FROM tournaments WHERE id = p_tournament_id) NOT IN ('completed','archived') THEN
    RAISE EXCEPTION 'NOT_COMPLETED';
  END IF;
  SELECT id INTO v_reg FROM registrations WHERE tournament_id = p_tournament_id AND user_id = auth.uid() AND status = 'checked_in';
  IF v_reg IS NULL THEN RAISE EXCEPTION 'NOT_PARTICIPANT'; END IF;
  SELECT rank INTO v_rank FROM tournament_standings WHERE tournament_id = p_tournament_id AND registration_id = v_reg;
  SELECT id INTO v_pool FROM prize_pools WHERE tournament_id = p_tournament_id AND v_rank BETWEEN rank_from AND rank_to LIMIT 1;
  IF v_pool IS NULL THEN RAISE EXCEPTION 'NO_PRIZE_FOR_RANK'; END IF;
  IF length(trim(p_contact)) < 3 THEN RAISE EXCEPTION 'CONTACT_REQUIRED'; END IF;
  INSERT INTO prize_claims (tournament_id, registration_id, user_id, pool_id, payout_contact)
  VALUES (p_tournament_id, v_reg, auth.uid(), v_pool, trim(p_contact)) RETURNING id INTO v_id;
  RETURN jsonb_build_object('claim_id', v_id, 'rank', v_rank);
END $$;

-- Standings: approved current results per registration, ranked by points, kills, best placement, seed.
CREATE OR REPLACE VIEW tournament_standings WITH (security_invoker = true) AS
SELECT tournament_id, registration_id, ign, total_points, total_kills, best_placement, matches_played,
       row_number() OVER (PARTITION BY tournament_id ORDER BY total_points DESC, total_kills DESC, best_placement ASC NULLS LAST, ign) AS rank
FROM (
  SELECT s.tournament_id, mr.registration_id, r.ign_snapshot AS ign,
         sum(mr.points_awarded) AS total_points, sum(mr.kills) AS total_kills,
         min(mr.placement) AS best_placement, count(*) AS matches_played
  FROM match_results mr
  JOIN matches m ON m.id = mr.match_id
  JOIN stages s ON s.id = m.stage_id
  JOIN registrations r ON r.id = mr.registration_id
  WHERE mr.is_current AND mr.approval_status = 'approved'
  GROUP BY s.tournament_id, mr.registration_id, r.ign_snapshot
) t;
GRANT SELECT ON tournament_standings TO anon, authenticated;


-- Seed placeholders for the Rage Cup (clearly placeholders: user decides real values last).
DO $$
DECLARE v_t uuid; p1 uuid; p2 uuid; p3 uuid;
BEGIN
  SELECT id INTO v_t FROM tournaments WHERE slug = 'rage-cup';
  IF v_t IS NULL OR EXISTS (SELECT 1 FROM prize_pools WHERE tournament_id = v_t) THEN RETURN; END IF;
  INSERT INTO prize_pools (tournament_id, rank_from, rank_to, label_ar, label_en, sort_order) VALUES (v_t,1,1,'المركز الأول','1st place',1) RETURNING id INTO p1;
  INSERT INTO prize_pools (tournament_id, rank_from, rank_to, label_ar, label_en, sort_order) VALUES (v_t,2,2,'المركز الثاني','2nd place',2) RETURNING id INTO p2;
  INSERT INTO prize_pools (tournament_id, rank_from, rank_to, label_ar, label_en, sort_order) VALUES (v_t,3,3,'المركز الثالث','3rd place',3) RETURNING id INTO p3;
  INSERT INTO prize_rewards (pool_id, kind, text_ar, text_en, note) VALUES
    (p1,'other','جائزة قيد التحديد','Prize TBD','PLACEHOLDER'),
    (p2,'other','جائزة قيد التحديد','Prize TBD','PLACEHOLDER'),
    (p3,'other','جائزة قيد التحديد','Prize TBD','PLACEHOLDER');
  INSERT INTO tournament_bonuses (tournament_id, title_ar, title_en, description_ar, description_en, kind)
    VALUES (v_t,'مكافأة أكثر كيلز','Most kills bonus','قيد التحديد','TBD','other');
  UPDATE tournaments SET rules_sections = jsonb_build_array(
    jsonb_build_object('title_ar','نظام التسجيل','title_en','Registration','body_ar','التسجيل بموافقة المنظم ثم تشيك إن قبل البداية.','body_en','Registration needs organizer approval, then check-in before start.'),
    jsonb_build_object('title_ar','نظام النقاط','title_en','Scoring','body_ar','النقاط = نقاط المركز + الكيلز.','body_en','Points = placement points + kills.'),
    jsonb_build_object('title_ar','السلوك','title_en','Conduct','body_ar','قيد التحديد','body_en','TBD')
  ) WHERE id = v_t;
END $$;
