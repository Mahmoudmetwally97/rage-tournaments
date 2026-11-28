-- 0011: tournament cover images. Public-read bucket, writes only by tournament managers / super_admin.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('tournament-covers', 'tournament-covers', true, 3145728, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 3145728, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

-- Object path convention: <tournament_id>/<file>. Folder must be a uuid of a tournament the caller manages.
CREATE OR REPLACE FUNCTION can_manage_cover(p_name text) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN split_part(p_name, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    THEN is_tournament_staff(split_part(p_name, '/', 1)::uuid, ARRAY['tournament_manager']) ELSE false END;
$$;

DROP POLICY IF EXISTS "Managers upload covers" ON storage.objects;
DROP POLICY IF EXISTS "Managers read covers" ON storage.objects;
DROP POLICY IF EXISTS "Managers update covers" ON storage.objects;
DROP POLICY IF EXISTS "Managers delete covers" ON storage.objects;
CREATE POLICY "Managers upload covers" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'tournament-covers' AND can_manage_cover(name));
CREATE POLICY "Managers read covers" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'tournament-covers' AND can_manage_cover(name));
CREATE POLICY "Managers update covers" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'tournament-covers' AND can_manage_cover(name))
  WITH CHECK (bucket_id = 'tournament-covers' AND can_manage_cover(name));
CREATE POLICY "Managers delete covers" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'tournament-covers' AND can_manage_cover(name));
