-- 0022: is_test flag. Test tournaments stay reachable by direct link but are hidden from the public list and the home Featured slot.
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false;
UPDATE tournaments SET is_test = true WHERE slug IN ('test-registration', 'sd');

CREATE OR REPLACE FUNCTION admin_update_tournament(p_tournament_id uuid, p_patch jsonb) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
BEGIN
  IF NOT is_tournament_staff(p_tournament_id, ARRAY['tournament_manager']) THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  UPDATE tournaments SET
    title_ar = COALESCE(p_patch->>'title_ar', title_ar),
    title_en = COALESCE(p_patch->>'title_en', title_en),
    max_participants = COALESCE((p_patch->>'max_participants')::int, max_participants),
    room_size = COALESCE((p_patch->>'room_size')::int, room_size),
    requires_approval = COALESCE((p_patch->>'requires_approval')::boolean, requires_approval),
    is_test = COALESCE((p_patch->>'is_test')::boolean, is_test),
    contact_url = CASE WHEN p_patch ? 'contact_url' THEN NULLIF(p_patch->>'contact_url','') ELSE contact_url END,
    contact_label = CASE WHEN p_patch ? 'contact_label' THEN NULLIF(p_patch->>'contact_label','') ELSE contact_label END,
    starts_at = CASE WHEN p_patch ? 'starts_at' THEN NULLIF(p_patch->>'starts_at','')::timestamptz ELSE starts_at END,
    checkin_opens_at = CASE WHEN p_patch ? 'checkin_opens_at' THEN NULLIF(p_patch->>'checkin_opens_at','')::timestamptz ELSE checkin_opens_at END,
    checkin_closes_at = CASE WHEN p_patch ? 'checkin_closes_at' THEN NULLIF(p_patch->>'checkin_closes_at','')::timestamptz ELSE checkin_closes_at END,
    rules_sections = CASE WHEN p_patch ? 'rules_sections' THEN p_patch->'rules_sections' ELSE rules_sections END
  WHERE id = p_tournament_id;
END $$;
