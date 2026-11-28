-- 0010: multi-stage (create, advance top N, seed from qualifiers) and organizer room moves.

CREATE OR REPLACE FUNCTION admin_create_stage(p_tournament_id uuid, p_name_ar text, p_name_en text, p_qualify_count integer DEFAULT 1)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_order integer; v_id uuid;
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF length(trim(p_name_en)) < 1 OR length(trim(p_name_ar)) < 1 THEN RAISE EXCEPTION 'NAME_REQUIRED'; END IF;
  SELECT COALESCE(max(stage_order),0)+1 INTO v_order FROM stages WHERE tournament_id = p_tournament_id;
  INSERT INTO stages (tournament_id, stage_order, name_ar, name_en, format, participant_mode, qualify_count, advance_rule)
  VALUES (p_tournament_id, v_order, trim(p_name_ar), trim(p_name_en), 'ffa', 'solo', GREATEST(p_qualify_count,1), 'top_n_overall')
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('stage_id', v_id, 'stage_order', v_order);
END $$;

-- Advance the top N (by points, kills, best placement) of a finished stage into the next stage.
CREATE OR REPLACE FUNCTION admin_advance_stage(p_tournament_id uuid, p_from_order integer, p_top_n integer)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_from stages%ROWTYPE; v_to stages%ROWTYPE; v_cnt integer;
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
  DELETE FROM stage_qualifications WHERE from_stage_id = v_from.id AND to_stage_id = v_to.id;
  INSERT INTO stage_qualifications (from_stage_id, to_stage_id, registration_id, rank_position)
  SELECT v_from.id, v_to.id, registration_id, rn FROM (
    SELECT mr.registration_id,
           row_number() OVER (ORDER BY sum(mr.points_awarded) DESC, sum(mr.kills) DESC, min(mr.placement) ASC NULLS LAST, mr.registration_id) AS rn
    FROM match_results mr JOIN matches m ON m.id = mr.match_id
    WHERE m.stage_id = v_from.id AND mr.is_current AND mr.approval_status = 'approved'
    GROUP BY mr.registration_id
  ) t WHERE rn <= p_top_n;
  GET DIAGNOSTICS v_cnt = ROW_COUNT;
  UPDATE stages SET status = 'completed', qualify_count = p_top_n WHERE id = v_from.id;
  RETURN jsonb_build_object('qualified', v_cnt, 'to_stage', v_to.stage_order);
END $$;

-- Seed: stage 1 uses checked-in players; later stages use qualifiers from the previous stage.
CREATE OR REPLACE FUNCTION admin_seed_stage(p_tournament_id uuid, p_stage_order integer DEFAULT 1) RETURNS jsonb
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
  v_rooms := ceil(v_n::numeric / v_t.room_size);
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

-- Organizer drag and drop: move a player to another room of the same stage.
CREATE OR REPLACE FUNCTION admin_move_player(p_registration_id uuid, p_to_group_id uuid) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_tid uuid; v_stage uuid; v_from uuid; v_size integer; v_cnt integer; v_slot integer;
BEGIN
  SELECT s.tournament_id, g.stage_id INTO v_tid, v_stage FROM groups g JOIN stages s ON s.id = g.stage_id WHERE g.id = p_to_group_id;
  IF v_tid IS NULL THEN RAISE EXCEPTION 'GROUP_NOT_FOUND'; END IF;
  IF NOT is_tournament_staff(v_tid, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT gp.group_id INTO v_from FROM group_participants gp JOIN groups g ON g.id = gp.group_id
    WHERE gp.registration_id = p_registration_id AND g.stage_id = v_stage;
  IF v_from IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_IN_STAGE'; END IF;
  IF v_from = p_to_group_id THEN RETURN jsonb_build_object('moved', false); END IF;
  IF EXISTS (SELECT 1 FROM match_results mr JOIN matches m ON m.id = mr.match_id WHERE m.group_id IN (v_from, p_to_group_id))
     OR EXISTS (SELECT 1 FROM matches WHERE group_id IN (v_from, p_to_group_id) AND status = 'completed') THEN
    RAISE EXCEPTION 'ROOM_HAS_RESULTS';
  END IF;
  SELECT room_size INTO v_size FROM tournaments WHERE id = v_tid;
  SELECT count(*) INTO v_cnt FROM group_participants WHERE group_id = p_to_group_id;
  IF v_cnt >= v_size THEN RAISE EXCEPTION 'ROOM_FULL'; END IF;
  DELETE FROM match_participants WHERE registration_id = p_registration_id AND match_id IN (SELECT id FROM matches WHERE group_id = v_from);
  DELETE FROM group_participants WHERE group_id = v_from AND registration_id = p_registration_id;
  v_slot := v_cnt + 1;
  INSERT INTO group_participants (group_id, registration_id, seed_in_group) VALUES (p_to_group_id, p_registration_id, v_slot);
  INSERT INTO match_participants (match_id, registration_id, slot_number)
    SELECT id, p_registration_id, v_slot FROM matches WHERE group_id = p_to_group_id;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
    VALUES (auth.uid(), 'move_player', 'registration', p_registration_id, jsonb_build_object('from', v_from, 'to', p_to_group_id));
  RETURN jsonb_build_object('moved', true);
END $$;

GRANT EXECUTE ON FUNCTION admin_create_stage(uuid,text,text,integer), admin_advance_stage(uuid,integer,integer), admin_seed_stage(uuid,integer), admin_move_player(uuid,uuid) TO authenticated;

-- Check-in opens automatically 40 minutes before start (when a start time is set); manual 'check_in' status still works.
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
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_ACCEPTED'; END IF;
  UPDATE registrations SET status = 'checked_in' WHERE id = v_reg.id;
  INSERT INTO registration_checkins (registration_id, checked_in_by) VALUES (v_reg.id, auth.uid())
    ON CONFLICT (registration_id) DO NOTHING;
END $$;
