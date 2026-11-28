-- 0031: edit and delete stages. Deleting a stage that has scored results needs explicit confirmation; everything removed is counted and logged.
CREATE OR REPLACE FUNCTION admin_update_stage(p_stage_id uuid, p_name_ar text, p_name_en text, p_qualify_count integer) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_s stages%ROWTYPE;
BEGIN
  SELECT * INTO v_s FROM stages WHERE id = p_stage_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF auth.uid() IS NULL OR NOT is_tournament_staff(v_s.tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(trim(p_name_en)) < 1 OR length(trim(p_name_ar)) < 1 THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  IF p_qualify_count IS NULL OR p_qualify_count < 1 THEN RAISE EXCEPTION 'BAD_QUALIFY'; END IF;
  UPDATE stages SET name_ar = trim(p_name_ar), name_en = trim(p_name_en), qualify_count = p_qualify_count WHERE id = p_stage_id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'stage_update', 'stage', p_stage_id,
    jsonb_build_object('name_ar', v_s.name_ar, 'name_en', v_s.name_en, 'qualify_count', v_s.qualify_count),
    jsonb_build_object('name_ar', trim(p_name_ar), 'name_en', trim(p_name_en), 'qualify_count', p_qualify_count));
  RETURN jsonb_build_object('updated', true);
END $$;

CREATE OR REPLACE FUNCTION admin_delete_stage(p_stage_id uuid, p_confirm_results boolean DEFAULT false) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_s stages%ROWTYPE; v_rooms int; v_matches int; v_results int; v_i record;
BEGIN
  SELECT * INTO v_s FROM stages WHERE id = p_stage_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF auth.uid() IS NULL OR NOT is_tournament_staff(v_s.tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT count(*) INTO v_rooms FROM groups WHERE stage_id = p_stage_id;
  SELECT count(*) INTO v_matches FROM matches WHERE stage_id = p_stage_id;
  SELECT count(*) INTO v_results FROM match_results mr JOIN matches m ON m.id = mr.match_id WHERE m.stage_id = p_stage_id;
  IF v_results > 0 AND NOT COALESCE(p_confirm_results, false) THEN RAISE EXCEPTION 'STAGE_DELETE_NEEDS_CONFIRM'; END IF;
  DELETE FROM stages WHERE id = p_stage_id;
  -- close the gap in stage numbering (ascending so the order stays unique)
  FOR v_i IN SELECT id FROM stages WHERE tournament_id = v_s.tournament_id AND stage_order > v_s.stage_order ORDER BY stage_order LOOP
    UPDATE stages SET stage_order = stage_order - 1 WHERE id = v_i.id;
  END LOOP;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'stage_delete', 'stage', p_stage_id,
    jsonb_build_object('tournament_id', v_s.tournament_id, 'stage_order', v_s.stage_order, 'name_ar', v_s.name_ar, 'name_en', v_s.name_en, 'status', v_s.status),
    jsonb_build_object('rooms_removed', v_rooms, 'matches_removed', v_matches, 'result_rows_removed', v_results, 'confirmed', COALESCE(p_confirm_results, false)));
  RETURN jsonb_build_object('deleted', true, 'rooms', v_rooms, 'matches', v_matches, 'results', v_results);
END $$;
REVOKE ALL ON FUNCTION admin_update_stage(uuid, text, text, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION admin_delete_stage(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_update_stage(uuid, text, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_delete_stage(uuid, boolean) TO authenticated;
