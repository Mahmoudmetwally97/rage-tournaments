-- 0029: site-wide public display override/hide for a user's username (real account data never changes),
-- plus a flag-for-review blocklist for obviously offensive names (never auto-deletes or auto-hides).
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS public_name_override text;
ALTER TABLE player_profiles ADD COLUMN IF NOT EXISTS public_hidden boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION pub_username(p_user uuid) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT CASE WHEN public_hidden THEN '—' ELSE COALESCE(NULLIF(trim(public_name_override), ''), username) END
  FROM player_profiles WHERE id = p_user;
$$;
REVOKE ALL ON FUNCTION pub_username(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION pub_username(uuid) TO anon, authenticated;

-- public surfaces now go through the effective name
CREATE OR REPLACE FUNCTION public_profile(p_username text)
RETURNS TABLE (id uuid, username text, country text, bio text, avatar_url text, cover_url text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT pp.id, COALESCE(NULLIF(trim(pp.public_name_override), ''), pp.username)::text, pp.country, pp.bio, pp.avatar_url, pp.cover_url, pp.created_at
  FROM player_profiles pp
  WHERE (NOT pp.public_hidden OR pp.id = auth.uid())
    AND (lower(COALESCE(NULLIF(trim(pp.public_name_override), ''), pp.username)) = lower(p_username)
         OR (pp.id = auth.uid() AND lower(pp.username) = lower(p_username)))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public_team(p_team uuid)
RETURNS TABLE (id uuid, name text, tag text, logo_url text, cover_url text, country text, description text, contact_email text, captain_id uuid, captain_username text, member_count int, game_name_en text, game_name_ar text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.id, t.name, t.tag, t.logo_url, t.cover_url, t.country, t.description,
         CASE WHEN auth.uid() IS NOT NULL THEN t.contact_email END,
         t.captain_id, pub_username(t.captain_id),
         (SELECT count(*)::int FROM team_members m WHERE m.team_id = t.id AND m.invite_status = 'accepted'),
         g.name_en, g.name_ar, t.created_at
  FROM teams t JOIN games g ON g.id = t.game_id
  WHERE t.id = p_team;
$$;

CREATE OR REPLACE FUNCTION team_members_public(p_team uuid)
RETURNS TABLE (user_id uuid, username text, avatar_url text, is_captain boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT tm.user_id, pub_username(tm.user_id), CASE WHEN pp.public_hidden THEN NULL ELSE pp.avatar_url END, (t.captain_id = tm.user_id)
  FROM team_members tm JOIN teams t ON t.id = tm.team_id JOIN player_profiles pp ON pp.id = tm.user_id
  WHERE tm.team_id = p_team AND tm.invite_status = 'accepted'
  ORDER BY (t.captain_id = tm.user_id) DESC, tm.joined_at;
$$;

CREATE OR REPLACE FUNCTION profile_tournaments(p_user uuid)
RETURNS TABLE (slug text, title_en text, title_ar text, cover_image_url text, t_status text, starts_at timestamptz, competition_type text, reg_status text, reg_name text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT t.slug, t.title_en, t.title_ar, t.cover_image_url, t.status, t.starts_at, t.competition_type, r.status, COALESCE(NULLIF(trim(r.display_override), ''), r.ign_snapshot)
  FROM registrations r JOIN tournaments t ON t.id = r.tournament_id
  WHERE t.status <> 'draft'
    AND (r.user_id = p_user OR EXISTS (SELECT 1 FROM registration_roster_members rm WHERE rm.registration_id = r.id AND rm.user_id = p_user))
    AND ((auth.uid() = p_user AND r.status NOT IN ('cancelled')) OR (r.status IN ('confirmed', 'checked_in') AND NOT r.hidden_public))
  ORDER BY coalesce(t.starts_at, r.created_at) DESC;
$$;

CREATE OR REPLACE FUNCTION profile_matches(p_user uuid)
RETURNS TABLE (match_id uuid, slug text, title_en text, title_ar text, round_number int, match_number int, m_status text, scheduled_at timestamptz, reg_name text, score_a int, score_b int, my_slot int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT m.id, t.slug, t.title_en, t.title_ar, m.round_number, m.match_number, m.status, m.scheduled_at, COALESCE(NULLIF(trim(r.display_override), ''), r.ign_snapshot), m.score_a, m.score_b, mp.slot_number
  FROM match_participants mp
  JOIN registrations r ON r.id = mp.registration_id
  JOIN matches m ON m.id = mp.match_id
  JOIN stages s ON s.id = m.stage_id
  JOIN tournaments t ON t.id = s.tournament_id
  WHERE t.status <> 'draft' AND r.status IN ('confirmed', 'checked_in') AND (NOT r.hidden_public OR auth.uid() = p_user)
    AND (r.user_id = p_user OR EXISTS (SELECT 1 FROM registration_roster_members rm WHERE rm.registration_id = r.id AND rm.user_id = p_user))
  ORDER BY coalesce(m.scheduled_at, 'infinity'::timestamptz), m.round_number, m.match_number;
$$;

-- owner/admin only. Admins cannot touch admins or the owner; nobody changes themselves.
CREATE OR REPLACE FUNCTION admin_set_user_public_name(p_user uuid, p_name text, p_hidden boolean)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pp player_profiles%ROWTYPE; v_name text := NULLIF(trim(COALESCE(p_name, '')), '');
BEGIN
  IF auth.uid() IS NULL OR NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  SELECT * INTO pp FROM player_profiles WHERE id = p_user;
  IF NOT FOUND THEN RAISE EXCEPTION 'PLAYER_NOT_FOUND'; END IF;
  IF p_user = auth.uid() THEN RAISE EXCEPTION 'CANNOT_CHANGE_SELF'; END IF;
  IF EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user AND role = 'owner') THEN RAISE EXCEPTION 'OWNER_PROTECTED'; END IF;
  IF NOT is_owner() AND EXISTS (SELECT 1 FROM user_roles WHERE user_id = p_user AND role = 'super_admin') THEN RAISE EXCEPTION 'OWNER_ONLY'; END IF;
  IF v_name IS NOT NULL THEN
    IF length(v_name) < 2 OR length(v_name) > 24 THEN RAISE EXCEPTION 'INVALID_IGN'; END IF;
    IF EXISTS (SELECT 1 FROM player_profiles o WHERE o.id <> p_user AND (lower(o.username) = lower(v_name) OR lower(COALESCE(o.public_name_override, '')) = lower(v_name)))
       OR (lower(pp.username) <> lower(v_name) AND EXISTS (SELECT 1 FROM player_profiles o WHERE lower(o.username) = lower(v_name))) THEN
      RAISE EXCEPTION 'USERNAME_TAKEN';
    END IF;
  END IF;
  UPDATE player_profiles SET public_name_override = v_name, public_hidden = COALESCE(p_hidden, false) WHERE id = p_user;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, before_state, after_state)
  VALUES (auth.uid(), 'user_public_name_change', 'user', p_user,
    jsonb_build_object('username', pp.username, 'override', pp.public_name_override, 'hidden', pp.public_hidden),
    jsonb_build_object('username', pp.username, 'override', v_name, 'hidden', COALESCE(p_hidden, false)));
END $$;

-- blocklist: flag for review only
CREATE TABLE IF NOT EXISTS blocked_terms (term text PRIMARY KEY, whole_word boolean NOT NULL DEFAULT false);
CREATE TABLE IF NOT EXISTS name_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kind text NOT NULL CHECK (kind IN ('username', 'ign')),
  user_id uuid REFERENCES player_profiles(id) ON DELETE CASCADE,
  registration_id uuid REFERENCES registrations(id) ON DELETE CASCADE,
  name text NOT NULL,
  matched text NOT NULL,
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'dismissed', 'actioned')),
  created_at timestamptz NOT NULL DEFAULT now(),
  reviewed_by uuid REFERENCES player_profiles(id),
  reviewed_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_name_flags_open ON name_flags (kind, COALESCE(user_id, registration_id), lower(name)) WHERE status = 'open';
ALTER TABLE blocked_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE name_flags ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON blocked_terms, name_flags FROM anon, authenticated;

INSERT INTO blocked_terms (term, whole_word) VALUES
 ('fuck', false), ('shit', false), ('bitch', false), ('cunt', false), ('nigg', false), ('fagg', false), ('whore', false), ('slut', false),
 ('rapist', false), ('nazi', false), ('hitler', false), ('pussy', false), ('porn', false), ('bastard', false), ('asshole', false),
 ('dick', true), ('cock', true), ('ass', true), ('fag', true), ('rape', true), ('anal', true), ('cum', true),
 ('شرموط', false), ('متناك', false), ('منيوك', false), ('عرص', false), ('كسمك', false), ('كساميه', false), ('ابن الوسخه', false),
 ('كس', true), ('زب', true), ('طيز', true), ('نيك', true), ('عاهره', true), ('قحبه', true), ('خول', true)
ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION name_norm(t text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT regexp_replace(translate(translate(lower(COALESCE(t, '')), '0134578@$!', 'oieastbasi'), 'أإآىةـ', 'ااايه'), '[ً-ٟ]', '', 'g');
$$;

CREATE OR REPLACE FUNCTION name_flag_match(p_name text) RETURNS text LANGUAGE sql STABLE SET search_path = public AS $$
  WITH n AS (
    SELECT name_norm(p_name) AS norm,
           regexp_replace(name_norm(p_name), '[^a-z0-9؀-ۿ]', '', 'g') AS squashed,
           regexp_split_to_array(name_norm(p_name), '[^a-z0-9؀-ۿ]+') AS toks
  )
  SELECT b.term FROM blocked_terms b, n
  WHERE (NOT b.whole_word AND position(replace(b.term, ' ', '') IN n.squashed) > 0)
     OR (b.whole_word AND b.term = ANY (n.toks))
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION trg_flag_username() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text;
BEGIN
  m := name_flag_match(NEW.username);
  IF m IS NOT NULL THEN
    INSERT INTO name_flags (kind, user_id, name, matched) VALUES ('username', NEW.id, NEW.username, m) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS flag_username ON player_profiles;
CREATE TRIGGER flag_username AFTER INSERT OR UPDATE OF username ON player_profiles FOR EACH ROW EXECUTE FUNCTION trg_flag_username();

CREATE OR REPLACE FUNCTION trg_flag_ign() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE m text;
BEGIN
  m := name_flag_match(NEW.ign_snapshot);
  IF m IS NOT NULL THEN
    INSERT INTO name_flags (kind, registration_id, user_id, name, matched) VALUES ('ign', NEW.id, NEW.user_id, NEW.ign_snapshot, m) ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS flag_ign ON registrations;
CREATE TRIGGER flag_ign AFTER INSERT OR UPDATE OF ign_snapshot ON registrations FOR EACH ROW EXECUTE FUNCTION trg_flag_ign();

-- flag what already exists
INSERT INTO name_flags (kind, user_id, name, matched)
SELECT 'username', id, username, name_flag_match(username) FROM player_profiles WHERE name_flag_match(username) IS NOT NULL ON CONFLICT DO NOTHING;
INSERT INTO name_flags (kind, registration_id, user_id, name, matched)
SELECT 'ign', id, user_id, ign_snapshot, name_flag_match(ign_snapshot) FROM registrations WHERE name_flag_match(ign_snapshot) IS NOT NULL ON CONFLICT DO NOTHING;

CREATE OR REPLACE FUNCTION admin_list_name_flags()
RETURNS TABLE (id uuid, kind text, name text, matched text, created_at timestamptz, user_id uuid, username text, public_name_override text, public_hidden boolean, tournament_slug text, display_override text, hidden_public boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT f.id, f.kind, f.name, f.matched, f.created_at, f.user_id, pp.username::text, pp.public_name_override, pp.public_hidden,
         t.slug, r.display_override, r.hidden_public
  FROM name_flags f
  LEFT JOIN player_profiles pp ON pp.id = f.user_id
  LEFT JOIN registrations r ON r.id = f.registration_id
  LEFT JOIN tournaments t ON t.id = r.tournament_id
  WHERE f.status = 'open' ORDER BY f.created_at DESC LIMIT 50;
END $$;

CREATE OR REPLACE FUNCTION admin_resolve_name_flag(p_flag uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  IF p_status NOT IN ('dismissed', 'actioned', 'open') THEN RAISE EXCEPTION 'BAD_ROLE'; END IF;
  UPDATE name_flags SET status = p_status, reviewed_by = auth.uid(), reviewed_at = now() WHERE id = p_flag;
  INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, after_state)
  VALUES (auth.uid(), 'name_flag_' || p_status, 'name_flag', p_flag, jsonb_build_object('status', p_status));
END $$;

-- admin_list_users now also reports the public-name state
DROP FUNCTION IF EXISTS admin_list_users(text);
CREATE FUNCTION admin_list_users(p_q text DEFAULT '')
RETURNS TABLE (id uuid, username text, display_name text, role text, created_at timestamptz, public_name_override text, public_hidden boolean)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_super_admin() THEN RAISE EXCEPTION 'FORBIDDEN'; END IF;
  RETURN QUERY
  SELECT pp.id, pp.username::text, pp.display_name::text,
    CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'owner') THEN 'owner'
         WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'super_admin') THEN 'super_admin'
         WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'moderator') THEN 'moderator'
         ELSE 'player' END,
    pp.created_at, pp.public_name_override, pp.public_hidden
  FROM player_profiles pp
  WHERE (COALESCE(trim(p_q), '') = '' AND EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role IN ('owner','super_admin','moderator')))
     OR (COALESCE(trim(p_q), '') <> '' AND (pp.username ILIKE '%' || trim(p_q) || '%' OR pp.display_name ILIKE '%' || trim(p_q) || '%' OR pp.public_name_override ILIKE '%' || trim(p_q) || '%'))
  ORDER BY CASE WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'owner') THEN 0
                WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'super_admin') THEN 1
                WHEN EXISTS (SELECT 1 FROM user_roles r WHERE r.user_id = pp.id AND r.role = 'moderator') THEN 2 ELSE 3 END, pp.username LIMIT 30;
END $$;

REVOKE ALL ON FUNCTION admin_set_user_public_name(uuid,text,boolean), admin_list_name_flags(), admin_resolve_name_flag(uuid,text), admin_list_users(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION admin_set_user_public_name(uuid,text,boolean), admin_list_name_flags(), admin_resolve_name_flag(uuid,text), admin_list_users(text) TO authenticated;
REVOKE ALL ON FUNCTION name_norm(text), name_flag_match(text), trg_flag_username(), trg_flag_ign() FROM PUBLIC, anon, authenticated;
