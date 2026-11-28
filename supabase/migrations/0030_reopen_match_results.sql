-- 0030: reopen a completed round to edit its results. Re-saving creates a new result version (old ones stay as history); standings and Final Results read the current version, so they recompute.
CREATE OR REPLACE FUNCTION admin_save_match_results(p_match_id uuid, p_rows jsonb) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tid uuid; v_rule tournament_scoring_rules%ROWTYPE; r jsonb; v_rank integer; v_kills integer;
  v_pts numeric; v_count integer := 0; v_prev text;
BEGIN
  SELECT s.tournament_id INTO v_tid FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = p_match_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'MATCH_NOT_FOUND'; END IF;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager','referee']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_rule FROM tournament_scoring_rules WHERE tournament_id = v_tid AND is_active
    ORDER BY version DESC LIMIT 1;
  SELECT status INTO v_prev FROM matches WHERE id = p_match_id;
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
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'match_results_save', 'match', p_match_id, jsonb_build_object('status', v_prev), jsonb_build_object('rows', v_count));
  RETURN jsonb_build_object('saved', v_count);
END $$;

CREATE OR REPLACE FUNCTION admin_reopen_match(p_match_id uuid, p_reason text DEFAULT NULL) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_tid uuid; v_stage uuid; v_order int; v_status text; v_next boolean;
BEGIN
  SELECT s.tournament_id, s.id, s.stage_order, m.status INTO v_tid, v_stage, v_order, v_status
  FROM matches m JOIN stages s ON s.id = m.stage_id WHERE m.id = p_match_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'MATCH_NOT_FOUND'; END IF;
  IF auth.uid() IS NULL OR NOT is_tournament_staff(v_tid, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_status <> 'completed' THEN RAISE EXCEPTION 'MATCH_NOT_COMPLETED'; END IF;
  UPDATE matches SET status = 'live' WHERE id = p_match_id;
  v_next := EXISTS (SELECT 1 FROM stages s2 JOIN matches m2 ON m2.stage_id = s2.id WHERE s2.tournament_id = v_tid AND s2.stage_order = v_order + 1);
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'match_reopen', 'match', p_match_id, jsonb_build_object('status', 'completed'), jsonb_build_object('status', 'live', 'reason', NULLIF(trim(p_reason), ''), 'next_stage_already_seeded', v_next));
  RETURN jsonb_build_object('reopened', true, 'next_stage_already_seeded', v_next);
END $$;
REVOKE ALL ON FUNCTION admin_reopen_match(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_reopen_match(uuid, text) TO authenticated;
