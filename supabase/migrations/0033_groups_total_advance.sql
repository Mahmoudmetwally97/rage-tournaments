-- 0033: choose the number of groups when seeding (balanced snake or random split), and a "total N across groups" advance mode.
DO $$ DECLARE c text; BEGIN
  SELECT conname INTO c FROM pg_constraint WHERE conrelid = 'stages'::regclass AND contype = 'c' AND pg_get_constraintdef(oid) ILIKE '%advance_rule%';
  IF c IS NOT NULL THEN EXECUTE format('ALTER TABLE stages DROP CONSTRAINT %I', c); END IF;
  ALTER TABLE stages ADD CONSTRAINT stages_advance_rule_check CHECK (advance_rule IN ('top_n_per_group','top_n_overall','top_n_total','bracket_winners'));
END $$;

DROP FUNCTION IF EXISTS admin_seed_stage(uuid, integer);
CREATE OR REPLACE FUNCTION admin_seed_stage(p_tournament_id uuid, p_stage_order integer DEFAULT 1, p_groups integer DEFAULT NULL, p_mode text DEFAULT 'balanced') RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_t tournaments%ROWTYPE; v_stage stages%ROWTYPE; v_rooms integer; v_n integer;
  v_rounds integer; r record; g uuid; m uuid; i integer; rd integer;
  v_groups uuid[] := ARRAY[]::uuid[]; v_regs uuid[];
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO v_t FROM tournaments WHERE id = p_tournament_id;
  SELECT * INTO v_stage FROM stages WHERE tournament_id = p_tournament_id AND stage_order = p_stage_order;
  IF NOT FOUND THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM matches mm WHERE mm.stage_id = v_stage.id AND mm.status = 'completed') THEN
    RAISE EXCEPTION 'STAGE_HAS_RESULTS';
  END IF;
  IF p_stage_order = 1 THEN
    SELECT array_agg(id ORDER BY COALESCE(seed, 2147483647), created_at) INTO v_regs
      FROM registrations WHERE tournament_id = p_tournament_id AND status = 'checked_in';
  ELSE
    SELECT array_agg(sq.registration_id ORDER BY sq.rank_position) INTO v_regs
      FROM stage_qualifications sq WHERE sq.to_stage_id = v_stage.id;
  END IF;
  v_n := COALESCE(array_length(v_regs,1), 0);
  IF v_n < 1 THEN RAISE EXCEPTION 'NO_PLAYERS_FOR_STAGE'; END IF;
  DELETE FROM matches WHERE stage_id = v_stage.id;
  DELETE FROM groups WHERE stage_id = v_stage.id;
  IF p_mode = 'random' THEN
    SELECT array_agg(x ORDER BY random()) INTO v_regs FROM unnest(v_regs) AS x;
  END IF;
  v_rooms := ceil(v_n::numeric / v_t.room_size);
  IF p_groups IS NOT NULL AND p_groups > 0 THEN
    IF p_groups > v_n THEN RAISE EXCEPTION 'TOO_MANY_GROUPS'; END IF;
    IF ceil(v_n::numeric / p_groups) > v_t.room_size THEN RAISE EXCEPTION 'GROUP_TOO_BIG'; END IF;
    v_rooms := p_groups;
  END IF;
  SELECT COALESCE(max(round_count),1) INTO v_rounds FROM tournament_scoring_rules
    WHERE tournament_id = p_tournament_id AND is_active;
  FOR i IN 1..v_rooms LOOP
    INSERT INTO groups (stage_id, name, group_order) VALUES (v_stage.id, 'Room ' || i, i) RETURNING id INTO g;
    v_groups := v_groups || g;
    FOR rd IN 1..v_rounds LOOP
      INSERT INTO matches (stage_id, group_id, round_number, match_number) VALUES (v_stage.id, g, rd, i) RETURNING id INTO m;
    END LOOP;
  END LOOP;
  FOR i IN 0..v_n-1 LOOP
    DECLARE pos integer := i % (2 * v_rooms); idx integer;
    BEGIN
      idx := CASE WHEN pos < v_rooms THEN pos ELSE 2 * v_rooms - 1 - pos END;
      INSERT INTO group_participants (group_id, registration_id, seed_in_group) VALUES (v_groups[idx + 1], v_regs[i+1], i / v_rooms + 1);
      INSERT INTO match_participants (match_id, registration_id, slot_number)
        SELECT mm.id, v_regs[i+1], i / v_rooms + 1 FROM matches mm WHERE mm.group_id = v_groups[idx + 1];
    END;
  END LOOP;
  UPDATE stages SET status = 'active' WHERE id = v_stage.id;
  RETURN jsonb_build_object('rooms', v_rooms, 'players', v_n, 'rounds', v_rounds);
END $$;


REVOKE ALL ON FUNCTION admin_seed_stage(uuid, integer, integer, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_seed_stage(uuid, integer, integer, text) TO authenticated;

CREATE OR REPLACE FUNCTION admin_update_stage(p_stage_id uuid, p_name_ar text, p_name_en text, p_qualify_count integer, p_advance_rule text) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_s stages%ROWTYPE;
BEGIN
  SELECT * INTO v_s FROM stages WHERE id = p_stage_id;
  IF v_s.id IS NULL THEN RAISE EXCEPTION 'STAGE_NOT_FOUND'; END IF;
  IF auth.uid() IS NULL OR NOT is_tournament_staff(v_s.tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(trim(p_name_en)) < 1 OR length(trim(p_name_ar)) < 1 THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  IF p_qualify_count IS NULL OR p_qualify_count < 1 THEN RAISE EXCEPTION 'BAD_QUALIFY'; END IF;
  IF p_advance_rule NOT IN ('top_n_overall','top_n_per_group','top_n_total') THEN RAISE EXCEPTION 'BAD_ADVANCE_RULE'; END IF;
  UPDATE stages SET name_ar = trim(p_name_ar), name_en = trim(p_name_en), qualify_count = p_qualify_count, advance_rule = p_advance_rule WHERE id = p_stage_id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'stage_update', 'stage', p_stage_id,
    jsonb_build_object('name_ar', v_s.name_ar, 'name_en', v_s.name_en, 'qualify_count', v_s.qualify_count, 'advance_rule', v_s.advance_rule),
    jsonb_build_object('name_ar', trim(p_name_ar), 'name_en', trim(p_name_en), 'qualify_count', p_qualify_count, 'advance_rule', p_advance_rule));
  RETURN jsonb_build_object('updated', true);
END $$;

CREATE OR REPLACE FUNCTION admin_advance_stage(p_tournament_id uuid, p_from_order integer, p_top_n integer, p_rule text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_from stages%ROWTYPE; v_to stages%ROWTYPE; v_cnt integer; v_rule text; v_g integer; v_base integer;
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
  IF v_rule NOT IN ('top_n_overall','top_n_per_group','top_n_total') THEN v_rule := 'top_n_overall'; END IF;
  SELECT count(*) INTO v_g FROM groups WHERE stage_id = v_from.id;
  v_base := p_top_n / GREATEST(v_g, 1);
  DELETE FROM stage_qualifications WHERE from_stage_id = v_from.id AND to_stage_id = v_to.id;
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
  WHERE CASE v_rule
    WHEN 'top_n_per_group' THEN room_rn <= p_top_n
    WHEN 'top_n_total' THEN room_rn <= v_base OR registration_id IN (
      SELECT y.registration_id FROM (
        SELECT t2.registration_id, row_number() OVER (PARTITION BY t2.group_id ORDER BY t2.pts DESC, t2.kl DESC, t2.bp ASC NULLS LAST, t2.registration_id) AS rrn,
               row_number() OVER (ORDER BY t2.pts DESC, t2.kl DESC, t2.bp ASC NULLS LAST, t2.registration_id) AS arn
        FROM (
          SELECT gp2.registration_id, gp2.group_id, COALESCE(sum(mr2.points_awarded), 0) AS pts, COALESCE(sum(mr2.kills), 0) AS kl, min(mr2.placement) AS bp
          FROM group_participants gp2 JOIN groups g2 ON g2.id = gp2.group_id AND g2.stage_id = v_from.id
          LEFT JOIN matches m2 ON m2.group_id = gp2.group_id AND m2.stage_id = v_from.id
          LEFT JOIN match_results mr2 ON mr2.match_id = m2.id AND mr2.registration_id = gp2.registration_id AND mr2.is_current AND mr2.approval_status = 'approved'
          GROUP BY gp2.registration_id, gp2.group_id) t2
      ) y WHERE y.rrn > v_base ORDER BY y.arn LIMIT GREATEST(p_top_n - (v_base * v_g), 0))
    ELSE all_rn <= p_top_n END;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  UPDATE stages SET status = 'completed', qualify_count = p_top_n, advance_rule = v_rule WHERE id = v_from.id;
  RETURN jsonb_build_object('qualified', v_cnt, 'to_stage', v_to.stage_order, 'rule', v_rule, 'groups', v_g, 'per_group_base', v_base);
END $$;
