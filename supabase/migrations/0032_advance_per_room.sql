-- 0032: per-stage advance mode. 'top_n_overall' ranks everyone in the stage together; 'top_n_per_group' takes the top N of EACH room.
DROP FUNCTION IF EXISTS admin_update_stage(uuid, text, text, integer);
CREATE OR REPLACE FUNCTION admin_update_stage(p_stage_id uuid, p_name_ar text, p_name_en text, p_qualify_count integer, p_advance_rule text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_s stages%ROWTYPE;
BEGIN
  SELECT * INTO v_s FROM stages WHERE id = p_stage_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF auth.uid() IS NULL OR NOT is_tournament_staff(v_s.tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(trim(p_name_en)) < 1 OR length(trim(p_name_ar)) < 1 THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  IF p_qualify_count IS NULL OR p_qualify_count < 1 THEN RAISE EXCEPTION 'BAD_QUALIFY'; END IF;
  IF p_advance_rule NOT IN ('top_n_overall','top_n_per_group') THEN RAISE EXCEPTION 'BAD_ADVANCE_RULE'; END IF;
  UPDATE stages SET name_ar = trim(p_name_ar), name_en = trim(p_name_en), qualify_count = p_qualify_count, advance_rule = p_advance_rule WHERE id = p_stage_id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'stage_update', 'stage', p_stage_id,
    jsonb_build_object('name_ar', v_s.name_ar, 'name_en', v_s.name_en, 'qualify_count', v_s.qualify_count, 'advance_rule', v_s.advance_rule),
    jsonb_build_object('name_ar', trim(p_name_ar), 'name_en', trim(p_name_en), 'qualify_count', p_qualify_count, 'advance_rule', p_advance_rule));
  RETURN jsonb_build_object('updated', true);
END $$;
REVOKE ALL ON FUNCTION admin_update_stage(uuid, text, text, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_update_stage(uuid, text, text, integer, text) TO authenticated;

DROP FUNCTION IF EXISTS admin_advance_stage(uuid, integer, integer);
CREATE OR REPLACE FUNCTION admin_advance_stage(p_tournament_id uuid, p_from_order integer, p_top_n integer, p_rule text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_from stages%ROWTYPE; v_to stages%ROWTYPE; v_cnt integer; v_rule text;
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_top_n < 1 THEN RAISE EXCEPTION 'BAD_TOP_N'; END IF;
  SELECT * INTO v_from FROM stages WHERE tournament_id = p_tournament_id AND stage_order = p_from_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  SELECT * INTO v_to FROM stages WHERE tournament_id = p_tournament_id AND stage_order = p_from_order + 1;
  IF NOT FOUND THEN RAISE EXCEPTION 'NO_NEXT_STAGE'; END IF;
  IF NOT EXISTS (SELECT 1 FROM matches WHERE stage_id = v_from.id) THEN RAISE EXCEPTION 'STAGE_NOT_SEEDED'; END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = v_from.id AND status <> 'completed') THEN RAISE EXCEPTION 'STAGE_NOT_FINISHED'; END IF;
  IF EXISTS (SELECT 1 FROM matches WHERE stage_id = v_to.id AND status = 'completed') THEN RAISE EXCEPTION 'NEXT_STAGE_HAS_RESULTS'; END IF;
  v_rule := COALESCE(p_rule, v_from.advance_rule);
  IF v_rule NOT IN ('top_n_overall','top_n_per_group') THEN v_rule := 'top_n_overall'; END IF;
  DELETE FROM stage_qualifications WHERE from_stage_id = v_from.id AND to_stage_id = v_to.id;
  -- per player totals; room rank is within the player's own room
  INSERT INTO stage_qualifications (from_stage_id, to_stage_id, registration_id, rank_position)
  SELECT v_from.id, v_to.id, registration_id,
         row_number() OVER (ORDER BY pts DESC, kl DESC, bp ASC NULLS LAST, registration_id)
  FROM (
    SELECT t.*, row_number() OVER (PARTITION BY t.group_id ORDER BY t.pts DESC, t.kl DESC, t.bp ASC NULLS LAST, t.registration_id) AS room_rn,
           row_number() OVER (ORDER BY t.pts DESC, t.kl DESC, t.bp ASC NULLS LAST, t.registration_id) AS all_rn
    FROM (
      SELECT gp.registration_id, gp.group_id,
             COALESCE(sum(mr.points_awarded), 0) AS pts, COALESCE(sum(mr.kills), 0) AS kl, min(mr.placement) AS bp
      FROM group_participants gp
      JOIN groups g ON g.id = gp.group_id AND g.stage_id = v_from.id
      LEFT JOIN matches m ON m.group_id = gp.group_id AND m.stage_id = v_from.id
      LEFT JOIN match_results mr ON mr.match_id = m.id AND mr.registration_id = gp.registration_id AND mr.is_current AND mr.approval_status = 'approved'
      GROUP BY gp.registration_id, gp.group_id
    ) t
  ) x
  WHERE CASE WHEN v_rule = 'top_n_per_group' THEN room_rn <= p_top_n ELSE all_rn <= p_top_n END;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  UPDATE stages SET status = 'completed', qualify_count = p_top_n, advance_rule = v_rule WHERE id = v_from.id;
  RETURN jsonb_build_object('qualified', v_cnt, 'to_stage', v_to.stage_order, 'rule', v_rule);
END $$;
REVOKE ALL ON FUNCTION admin_advance_stage(uuid, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_advance_stage(uuid, integer, integer, text) TO authenticated;
