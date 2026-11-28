-- 0028: staff can override or hide how a registration shows publicly. The real IGN (ign_snapshot) and the account are never changed.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS display_override text;
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS hidden_public boolean NOT NULL DEFAULT false;

-- public standings use the override and skip hidden registrations
CREATE OR REPLACE VIEW tournament_standings WITH (security_invoker = true) AS
SELECT tournament_id, registration_id, ign, total_points, total_kills, best_placement, matches_played,
       row_number() OVER (PARTITION BY tournament_id ORDER BY total_points DESC, total_kills DESC, best_placement ASC NULLS LAST, ign) AS rank
FROM (
  SELECT s.tournament_id, mr.registration_id, COALESCE(NULLIF(trim(r.display_override), ''), r.ign_snapshot) AS ign,
         sum(mr.points_awarded) AS total_points, sum(mr.kills) AS total_kills,
         min(mr.placement) AS best_placement, count(*) AS matches_played
  FROM match_results mr
  JOIN matches m ON m.id = mr.match_id
  JOIN stages s ON s.id = m.stage_id
  JOIN registrations r ON r.id = mr.registration_id
  WHERE mr.is_current AND mr.approval_status = 'approved' AND NOT r.hidden_public
  GROUP BY s.tournament_id, mr.registration_id, COALESCE(NULLIF(trim(r.display_override), ''), r.ign_snapshot)
) t;
GRANT SELECT ON tournament_standings TO anon, authenticated;

-- p_name empty = no override. p_hidden true = hide from public leaderboards and brackets. (name '' + hidden false = undo)
CREATE OR REPLACE FUNCTION admin_set_public_name(p_registration uuid, p_name text, p_hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r registrations%ROWTYPE; v_name text := NULLIF(trim(COALESCE(p_name, '')), '');
BEGIN
  SELECT * INTO r FROM registrations WHERE id = p_registration;
  IF NOT FOUND THEN RAISE EXCEPTION 'NOT_FOUND'; END IF;
  IF auth.uid() IS NULL OR NOT is_tournament_staff(r.tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF v_name IS NOT NULL AND (length(v_name) < 2 OR length(v_name) > 32) THEN RAISE EXCEPTION 'INVALID_IGN'; END IF;
  UPDATE registrations SET display_override = v_name, hidden_public = COALESCE(p_hidden, false) WHERE id = p_registration;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'public_name_change', 'registration', p_registration,
    jsonb_build_object('ign', r.ign_snapshot, 'override', r.display_override, 'hidden', r.hidden_public),
    jsonb_build_object('ign', r.ign_snapshot, 'override', v_name, 'hidden', COALESCE(p_hidden, false), 'tournament_id', r.tournament_id));
END $$;
REVOKE ALL ON FUNCTION admin_set_public_name(uuid, text, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_set_public_name(uuid, text, boolean) TO authenticated;
