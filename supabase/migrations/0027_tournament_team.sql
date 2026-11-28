-- 0027: per-tournament team. Only site admins/owner (super_admin) assign people to ONE tournament.
-- Level 'admin'     = tournament_manager row: full control inside that tournament.
-- Level 'moderator' = referee + moderator rows: enter results, check-in/approve/reject players, resolve disputes. No settings, rules, prizes, stages.
CREATE OR REPLACE FUNCTION admin_tournament_team(p_tournament uuid)
RETURNS TABLE (user_id uuid, username text, level text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT ta.user_id, pp.username::text,
    CASE WHEN bool_or(ta.role = 'tournament_manager') THEN 'admin' ELSE 'moderator' END
  FROM tournament_admins ta JOIN player_profiles pp ON pp.id = ta.user_id
  WHERE ta.tournament_id = p_tournament
  GROUP BY ta.user_id, pp.username ORDER BY 3, 2;
END $$;

CREATE OR REPLACE FUNCTION admin_set_tournament_role(p_tournament uuid, p_user uuid, p_level text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_title_en text; v_title_ar text; v_slug text; v_name text;
BEGIN
  IF auth.uid() IS NULL OR NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_level NOT IN ('admin', 'moderator', 'none') THEN RAISE EXCEPTION 'BAD_ROLE'; END IF;
  SELECT title_en, title_ar, slug INTO v_title_en, v_title_ar, v_slug FROM tournaments WHERE id = p_tournament;
  IF v_slug IS NULL THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  SELECT username INTO v_name FROM player_profiles WHERE id = p_user;
  IF v_name IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'CANNOT_CHANGE_SELF'; END IF;
  DELETE FROM tournament_admins WHERE tournament_id = p_tournament AND user_id = p_user;
  IF p_level = 'admin' THEN
    INSERT INTO tournament_admins (tournament_id, user_id, role, assigned_by) VALUES (p_tournament, p_user, 'tournament_manager', auth.uid());
  ELSIF p_level = 'moderator' THEN
    INSERT INTO tournament_admins (tournament_id, user_id, role, assigned_by) VALUES (p_tournament, p_user, 'referee', auth.uid()), (p_tournament, p_user, 'moderator', auth.uid());
  END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
  VALUES (auth.uid(), 'tournament_role_change', 'tournament', p_tournament, jsonb_build_object('user', p_user, 'username', v_name, 'level', p_level, 'slug', v_slug));
  IF p_level = 'none' THEN
    PERFORM notify_user(p_user, 'role_changed', 'Removed from a tournament team', 'تم شيلك من فريق بطولة',
      'You no longer help run ' || v_title_en || '.', 'مبقيتش مسؤول عن ' || v_title_ar || '.', '/dashboard', 'site', 'trole:' || gen_random_uuid());
  ELSE
    PERFORM notify_user(p_user, 'role_changed', 'You help run ' || v_title_en, 'بقيت من فريق إدارة ' || v_title_ar,
      CASE WHEN p_level = 'admin' THEN 'You have full control of this tournament.' ELSE 'You can enter results and check players in.' END,
      CASE WHEN p_level = 'admin' THEN 'عندك تحكم كامل في البطولة دي.' ELSE 'تقدر تدخل النتائج وتعمل تشيك إن للاعبين.' END,
      '/admin/' || v_slug, 'site', 'trole:' || gen_random_uuid());
  END IF;
END $$;

REVOKE ALL ON FUNCTION admin_tournament_team(uuid), admin_set_tournament_role(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_tournament_team(uuid), admin_set_tournament_role(uuid,uuid,text) TO authenticated;
