-- 0012: registration code becomes rage-<username>; registration stores a contact Gmail.
ALTER TABLE registrations ADD COLUMN IF NOT EXISTS contact_email text;

-- rage-<username> repeats across tournaments, so uniqueness is per tournament.
ALTER TABLE registrations DROP CONSTRAINT IF EXISTS registrations_registration_code_key;
CREATE UNIQUE INDEX IF NOT EXISTS uq_reg_code_per_tournament
  ON registrations(tournament_id, registration_code)
  WHERE status NOT IN ('cancelled', 'rejected');

CREATE OR REPLACE FUNCTION register_solo_participant(
  p_tournament_id uuid, p_ign_snapshot text, p_registration_code text, p_contact_email text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v jsonb;
BEGIN
  IF p_contact_email IS NULL OR p_contact_email !~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'INVALID_EMAIL';
  END IF;
  v := register_solo_participant(p_tournament_id, p_ign_snapshot, p_registration_code);
  UPDATE registrations SET contact_email = lower(trim(p_contact_email))
    WHERE id = (v->>'registration_id')::uuid AND user_id = auth.uid();
  RETURN v;
END $$;
REVOKE ALL ON FUNCTION register_solo_participant(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION register_solo_participant(uuid, text, text, text) TO authenticated;
