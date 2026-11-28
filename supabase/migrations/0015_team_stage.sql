-- 0015: team tournaments get a single-elimination bracket stage at creation.
CREATE OR REPLACE FUNCTION admin_make_team_stage(p_tournament_id uuid) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF EXISTS (SELECT 1 FROM stages WHERE tournament_id = p_tournament_id) THEN RAISE EXCEPTION 'STAGE_EXISTS'; END IF;
  INSERT INTO stages (tournament_id, stage_order, name_ar, name_en, format, participant_mode, qualify_count, advance_rule)
  VALUES (p_tournament_id, 1, 'خروج المغلوب', 'Knockout bracket', 'knockout', 'team', 1, 'bracket_winners')
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;
GRANT EXECUTE ON FUNCTION admin_make_team_stage(uuid) TO authenticated;
