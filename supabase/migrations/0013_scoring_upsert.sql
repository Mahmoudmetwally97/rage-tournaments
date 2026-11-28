-- 0013: admin_set_scoring creates the active rule when the tournament has none
-- (new tournaments had no rule row, so match results failed to save).
CREATE OR REPLACE FUNCTION admin_set_scoring(p_tournament_id uuid, p_placement jsonb, p_kill numeric, p_rounds integer) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE tournament_scoring_rules
     SET placement_points = p_placement, kill_points = p_kill, round_count = GREATEST(p_rounds,1)
   WHERE tournament_id = p_tournament_id AND is_active;
  IF NOT FOUND THEN
    INSERT INTO tournament_scoring_rules (tournament_id, version, placement_points, kill_points, win_points, round_count, is_active)
    VALUES (p_tournament_id, 1, p_placement, p_kill, 0, GREATEST(p_rounds,1), true);
  END IF;
END $$;
-- backfill tournaments created without a rule
INSERT INTO tournament_scoring_rules (tournament_id, version, placement_points, kill_points, win_points, round_count, is_active)
SELECT t.id, 1, '{"1":10,"2":8,"3":6,"4":5,"5":4,"6":3,"7":2,"8":1}'::jsonb, 1, 0, 1, true
FROM tournaments t WHERE NOT EXISTS (SELECT 1 FROM tournament_scoring_rules r WHERE r.tournament_id = t.id AND r.is_active);
