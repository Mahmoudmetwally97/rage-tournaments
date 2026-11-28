-- 0025: "Team and roles" admin page. Only super_admins can list users, change roles, read the change log.
CREATE OR REPLACE FUNCTION admin_list_users(p_q text DEFAULT '')
RETURNS TABLE (id uuid, username text, display_name text, role text, created_at timestamptz)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT pp.id, pp.username::text, pp.display_name::text,
    CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'super_admin') THEN 'super_admin'
         WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'moderator') THEN 'moderator'
         ELSE 'player' END,
    pp.created_at
  FROM player_profiles pp
  WHERE COALESCE(trim(p_q), '') = '' AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role IN ('super_admin','moderator'))
     OR (COALESCE(trim(p_q), '') <> '' AND (pp.username ILIKE '%' || trim(p_q) || '%' OR pp.display_name ILIKE '%' || trim(p_q) || '%'))
  ORDER BY 4 DESC, pp.username LIMIT 30;
END $$;

CREATE OR REPLACE FUNCTION admin_set_role(p_user uuid, p_role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_old text; v_target text;
BEGIN
  IF auth.uid() IS NULL OR NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_role NOT IN ('super_admin', 'moderator', 'player') THEN RAISE EXCEPTION 'BAD_ROLE'; END IF;
  SELECT username INTO v_target FROM player_profiles WHERE id = p_user;
  IF v_target IS NULL THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'CANNOT_CHANGE_SELF'; END IF;
  SELECT CASE WHEN bool_or(role = 'super_admin') THEN 'super_admin' WHEN bool_or(role = 'moderator') THEN 'moderator' ELSE 'player' END
    INTO v_old FROM user_roles WHERE user_id = p_user;
  v_old := COALESCE(v_old, 'player');
  IF v_old = p_role THEN RETURN; END IF;
  IF v_old = 'super_admin' AND (SELECT count(DISTINCT user_id) FROM user_roles WHERE role = 'super_admin') <= 1 THEN
    RAISE EXCEPTION 'LAST_SUPER_ADMIN';
  END IF;
  DELETE FROM user_roles WHERE user_id = p_user AND role IN ('super_admin', 'moderator');
  IF p_role <> 'player' THEN
    INSERT INTO user_roles (user_id, role, granted_by) VALUES (p_user, p_role, auth.uid());
  END IF;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'role_change', 'user_role', p_user, jsonb_build_object('role', v_old, 'username', v_target), jsonb_build_object('role', p_role, 'username', v_target));
  IF p_role = 'player' THEN
    PERFORM notify_user(p_user, 'role_changed', 'Admin access removed', 'تم إلغاء صلاحيات الإدارة',
      'Your staff role was removed.', 'تم إلغاء دورك في الإدارة.', '/dashboard', 'site', 'role:' || gen_random_uuid());
  ELSE
    PERFORM notify_user(p_user, 'role_changed', 'You are now ' || CASE WHEN p_role = 'super_admin' THEN 'an admin' ELSE 'a moderator' END,
      CASE WHEN p_role = 'super_admin' THEN 'بقيت أدمن' ELSE 'بقيت مشرف' END,
      'You can open the admin console from the menu.', 'تقدر تفتح لوحة الإدارة من القائمة.', '/admin', 'site', 'role:' || gen_random_uuid());
  END IF;
END $$;

CREATE OR REPLACE FUNCTION admin_role_changes()
RETURNS TABLE (created_at timestamptz, actor text, target text, old_role text, new_role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT a.created_at, pa.username::text, COALESCE(a.after_state->>'username', pt.username::text), a.before_state->>'role', a.after_state->>'role'
  FROM audit_logs a LEFT JOIN player_profiles pa ON pa.id = a.actor_id LEFT JOIN player_profiles pt ON pt.id = a.entity_id
  WHERE a.action = 'role_change' ORDER BY a.created_at DESC LIMIT 20;
END $$;

REVOKE ALL ON FUNCTION admin_list_users(text), admin_set_role(uuid,text), admin_role_changes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_list_users(text), admin_set_role(uuid,text), admin_role_changes() TO authenticated;
