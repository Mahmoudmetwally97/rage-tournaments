-- 0016: team logos. Public-read bucket; only the team captain writes, under <team_id>/.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('team-logos', 'team-logos', true, 2097152, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 2097152, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

CREATE OR REPLACE FUNCTION is_team_captain_path(p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN EXISTS (SELECT 1 FROM teams WHERE id = split_part(p_name, '/', 1)::uuid AND captain_id = auth.uid()) ELSE false END;
$$;

DROP POLICY IF EXISTS "Captain uploads team logo" ON storage.objects;
DROP POLICY IF EXISTS "Captain updates team logo" ON storage.objects;
DROP POLICY IF EXISTS "Captain deletes team logo" ON storage.objects;
DROP POLICY IF EXISTS "Captain reads team logo" ON storage.objects;
CREATE POLICY "Captain uploads team logo" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'team-logos' AND is_team_captain_path(name));
CREATE POLICY "Captain reads team logo" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'team-logos' AND is_team_captain_path(name));
CREATE POLICY "Captain updates team logo" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'team-logos' AND is_team_captain_path(name))
  WITH CHECK (bucket_id = 'team-logos' AND is_team_captain_path(name));
CREATE POLICY "Captain deletes team logo" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'team-logos' AND is_team_captain_path(name));
