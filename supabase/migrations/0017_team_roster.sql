-- 0017: roster usernames. player_profiles is own-row only under RLS, so members could not see each other's names.
CREATE OR REPLACE FUNCTION team_roster(p_team_id uuid)
RETURNS TABLE (user_id uuid, username text, invite_status text, role text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT tm.user_id, pp.username::text, tm.invite_status, tm.role
  FROM team_members tm JOIN player_profiles pp ON pp.id = tm.user_id
  WHERE tm.team_id = p_team_id
    AND EXISTS (SELECT 1 FROM team_members me WHERE me.team_id = p_team_id AND me.user_id = auth.uid()
                AND (me.invite_status = 'accepted' OR me.invite_status = 'pending'))
  ORDER BY tm.joined_at;
$$;
REVOKE ALL ON FUNCTION team_roster(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION team_roster(uuid) TO authenticated;
