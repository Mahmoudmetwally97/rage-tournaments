-- 0018: player profile fields, team identity fields, profile images bucket, public read RPCs.
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS cover_url text;
ALTER TABLE teams ADD COLUMN IF NOT EXISTS contact_email text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pp_bio') THEN
    ALTER TABLE player_profiles ADD CONSTRAINT chk_pp_bio CHECK (bio IS NULL OR length(bio) <= 300);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_pp_country') THEN
    ALTER TABLE player_profiles ADD CONSTRAINT chk_pp_country CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_team_desc') THEN
    ALTER TABLE teams ADD CONSTRAINT chk_team_desc CHECK (description IS NULL OR length(description) <= 500);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_team_country') THEN
    ALTER TABLE teams ADD CONSTRAINT chk_team_country CHECK (country IS NULL OR country ~ '^[A-Z]{2}$');
  END IF;
END $$;

-- team cover images live in team-logos next to the logo; allow up to 3 MB
UPDATE storage.buckets SET file_size_limit = 3145728 WHERE id = 'team-logos';

-- profile images: <user_id>/<file>, public read, owner write
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('profile-images', 'profile-images', true, 3145728, ARRAY['image/jpeg','image/png','image/webp'])
ON CONFLICT (id) DO UPDATE SET public = true, file_size_limit = 3145728, allowed_mime_types = ARRAY['image/jpeg','image/png','image/webp'];

DROP POLICY IF EXISTS "Owner uploads profile image" ON storage.objects;
DROP POLICY IF EXISTS "Owner reads profile image" ON storage.objects;
DROP POLICY IF EXISTS "Owner updates profile image" ON storage.objects;
DROP POLICY IF EXISTS "Owner deletes profile image" ON storage.objects;
CREATE POLICY "Owner uploads profile image" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'profile-images' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Owner reads profile image" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'profile-images' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Owner updates profile image" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'profile-images' AND split_part(name, '/', 1) = auth.uid()::text)
  WITH CHECK (bucket_id = 'profile-images' AND split_part(name, '/', 1) = auth.uid()::text);
CREATE POLICY "Owner deletes profile image" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'profile-images' AND split_part(name, '/', 1) = auth.uid()::text);

-- username change with validation + case-insensitive uniqueness
CREATE OR REPLACE FUNCTION update_username(p_username text) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v text := trim(p_username);
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'UNAUTHORIZED'; END IF;
  IF v !~ '^[A-Za-z0-9_.]{3,20}$' THEN RAISE EXCEPTION 'USERNAME_INVALID'; END IF;
  IF EXISTS (SELECT 1 FROM player_profiles WHERE lower(username) = lower(v) AND id <> auth.uid()) THEN RAISE EXCEPTION 'USERNAME_TAKEN'; END IF;
  UPDATE player_profiles SET username = v, display_name = CASE WHEN display_name = username THEN v ELSE display_name END, updated_at = now() WHERE id = auth.uid();
END $$;

-- public profile (safe fields only)
CREATE OR REPLACE FUNCTION public_profile(p_username text)
RETURNS TABLE (id uuid, username text, country text, bio text, avatar_url text, cover_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT pp.id, pp.username::text, pp.country, pp.bio, pp.avatar_url, pp.cover_url, pp.created_at
  FROM player_profiles pp WHERE lower(pp.username) = lower(p_username) LIMIT 1;
$$;

-- teams a user belongs to (accepted), with member counts
CREATE OR REPLACE FUNCTION profile_teams(p_user uuid)
RETURNS TABLE (id uuid, name text, tag text, logo_url text, cover_url text, country text, member_count int, game_name_en text, game_name_ar text, is_captain boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.id, t.name, t.tag, t.logo_url, t.cover_url, t.country,
         (SELECT count(*)::int FROM team_members m WHERE m.team_id = t.id AND m.invite_status = 'accepted'),
         g.name_en, g.name_ar, (t.captain_id = p_user)
  FROM teams t JOIN team_members me ON me.team_id = t.id AND me.user_id = p_user AND me.invite_status = 'accepted'
  JOIN games g ON g.id = t.game_id
  ORDER BY t.created_at;
$$;

-- one team, public
CREATE OR REPLACE FUNCTION public_team(p_team uuid)
RETURNS TABLE (id uuid, name text, tag text, logo_url text, cover_url text, country text, description text, contact_email text, captain_id uuid, captain_username text, member_count int, game_name_en text, game_name_ar text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.id, t.name, t.tag, t.logo_url, t.cover_url, t.country, t.description,
         CASE WHEN auth.uid() IS NOT NULL THEN t.contact_email END,
         t.captain_id, pp.username::text,
         (SELECT count(*)::int FROM team_members m WHERE m.team_id = t.id AND m.invite_status = 'accepted'),
         g.name_en, g.name_ar, t.created_at
  FROM teams t JOIN games g ON g.id = t.game_id JOIN player_profiles pp ON pp.id = t.captain_id
  WHERE t.id = p_team;
$$;

-- accepted roster of a team, public (usernames and avatars only)
CREATE OR REPLACE FUNCTION team_members_public(p_team uuid)
RETURNS TABLE (user_id uuid, username text, avatar_url text, is_captain boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT tm.user_id, pp.username::text, pp.avatar_url, (t.captain_id = tm.user_id)
  FROM team_members tm JOIN teams t ON t.id = tm.team_id JOIN player_profiles pp ON pp.id = tm.user_id
  WHERE tm.team_id = p_team AND tm.invite_status = 'accepted'
  ORDER BY (t.captain_id = tm.user_id) DESC, tm.joined_at;
$$;

-- tournaments a user joined (own: all live registrations; others: accepted ones only)
CREATE OR REPLACE FUNCTION profile_tournaments(p_user uuid)
RETURNS TABLE (slug text, title_en text, title_ar text, cover_image_url text, t_status text, starts_at timestamptz, competition_type text, reg_status text, reg_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.slug, t.title_en, t.title_ar, t.cover_image_url, t.status, t.starts_at, t.competition_type, r.status, r.ign_snapshot
  FROM registrations r JOIN tournaments t ON t.id = r.tournament_id
  WHERE t.status <> 'draft'
    AND (r.user_id = p_user OR EXISTS (SELECT 1 FROM registration_roster_members rm WHERE rm.registration_id = r.id AND rm.user_id = p_user))
    AND ((auth.uid() = p_user AND r.status NOT IN ('cancelled')) OR r.status IN ('confirmed', 'checked_in'))
  ORDER BY coalesce(t.starts_at, r.created_at) DESC;
$$;

-- matches a user plays in (directly or through a team registration)
CREATE OR REPLACE FUNCTION profile_matches(p_user uuid)
RETURNS TABLE (match_id uuid, slug text, title_en text, title_ar text, round_number int, match_number int, m_status text, scheduled_at timestamptz, reg_name text, score_a int, score_b int, my_slot int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.id, t.slug, t.title_en, t.title_ar, m.round_number, m.match_number, m.status, m.scheduled_at, r.ign_snapshot, m.score_a, m.score_b, mp.slot_number
  FROM match_participants mp
  JOIN registrations r ON r.id = mp.registration_id
  JOIN matches m ON m.id = mp.match_id
  JOIN stages s ON s.id = m.stage_id
  JOIN tournaments t ON t.id = s.tournament_id
  WHERE t.status <> 'draft' AND r.status IN ('confirmed', 'checked_in')
    AND (r.user_id = p_user OR EXISTS (SELECT 1 FROM registration_roster_members rm WHERE rm.registration_id = r.id AND rm.user_id = p_user))
  ORDER BY coalesce(m.scheduled_at, 'infinity'::timestamptz), m.round_number, m.match_number;
$$;

REVOKE ALL ON FUNCTION update_username(text), profile_teams(uuid), public_team(uuid), team_members_public(uuid), profile_tournaments(uuid), profile_matches(uuid), public_profile(text) FROM public;
GRANT EXECUTE ON FUNCTION update_username(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public_profile(text), profile_teams(uuid), public_team(uuid), team_members_public(uuid), profile_tournaments(uuid), profile_matches(uuid) TO anon, authenticated;
