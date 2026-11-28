-- 0020: in-site notifications (bell). Written by DB triggers, by sync_my_notifications() (time-based check-in), and by the Discord bot (service role).
-- 0007 created an unused, empty notifications table with a different shape. Replace it only if it is still the old one.
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'is_read')
     AND NOT EXISTS (SELECT 1 FROM notifications) THEN
    DROP TABLE notifications;
  END IF;
END $$;
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  kind text NOT NULL,
  source text NOT NULL DEFAULT 'site' CHECK (source IN ('site', 'discord_bot')),
  title_en text NOT NULL,
  title_ar text NOT NULL,
  body_en text NOT NULL DEFAULT '',
  body_ar text NOT NULL DEFAULT '',
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, dedupe_key)
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS notifications_select_own ON notifications;
CREATE POLICY notifications_select_own ON notifications FOR SELECT USING (user_id = auth.uid());
REVOKE ALL ON notifications FROM anon, authenticated;
GRANT SELECT ON notifications TO authenticated;

CREATE OR REPLACE FUNCTION notify_user(p_user uuid, p_kind text, p_title_en text, p_title_ar text, p_body_en text, p_body_ar text, p_link text, p_source text, p_dedupe text)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO notifications (user_id, kind, source, title_en, title_ar, body_en, body_ar, link, dedupe_key)
  VALUES (p_user, p_kind, COALESCE(p_source, 'site'), p_title_en, p_title_ar, COALESCE(p_body_en, ''), COALESCE(p_body_ar, ''), p_link, p_dedupe)
  ON CONFLICT (user_id, dedupe_key) DO NOTHING;
$$;
REVOKE ALL ON FUNCTION notify_user(uuid,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION notify_user(uuid,text,text,text,text,text,text,text,text) TO service_role;

-- recipients of a registration: the player, or the team captain (+ accepted members when p_all)
CREATE OR REPLACE FUNCTION reg_recipients(p_reg registrations, p_all boolean)
RETURNS TABLE(uid uuid) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT p_reg.user_id WHERE p_reg.user_id IS NOT NULL
  UNION SELECT t.captain_id FROM teams t WHERE t.id = p_reg.team_id
  UNION SELECT tm.user_id FROM team_members tm WHERE p_all AND tm.team_id = p_reg.team_id AND tm.invite_status = 'accepted';
$$;
REVOKE ALL ON FUNCTION reg_recipients(registrations, boolean) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION trg_notify_registration() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE t tournaments%ROWTYPE; r record; v_link text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  SELECT * INTO t FROM tournaments WHERE id = NEW.tournament_id;
  v_link := '/tournaments/' || t.slug;
  FOR r IN SELECT uid FROM reg_recipients(NEW, true) LOOP
    IF NEW.status = 'confirmed' AND OLD.status IN ('pending', 'waitlisted') THEN
      PERFORM notify_user(r.uid, 'registration_approved', 'Registration approved', 'تم قبول تسجيلك',
        'You are in: ' || t.title_en, 'تم قبولك في: ' || t.title_ar, v_link, 'site', 'reg_ok:' || NEW.id);
    ELSIF NEW.status = 'rejected' THEN
      PERFORM notify_user(r.uid, 'registration_rejected', 'Registration rejected', 'تم رفض تسجيلك',
        'Your registration for ' || t.title_en || ' was rejected.', 'تم رفض تسجيلك في ' || t.title_ar, v_link, 'site', 'reg_no:' || NEW.id);
    ELSIF NEW.status = 'disqualified' THEN
      PERFORM notify_user(r.uid, 'registration_disqualified', 'Disqualified', 'تم استبعادك',
        'You were disqualified from ' || t.title_en || '.', 'تم استبعادك من ' || t.title_ar, v_link, 'site', 'reg_dq:' || NEW.id);
    END IF;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_registration ON registrations;
CREATE TRIGGER notify_registration AFTER UPDATE OF status ON registrations FOR EACH ROW EXECUTE FUNCTION trg_notify_registration();

CREATE OR REPLACE FUNCTION trg_notify_tournament() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE reg registrations%ROWTYPE; r record; te text; ta text; be text; ba text; k text; v_link text;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status = 'check_in' THEN k := 'tournament_checkin'; te := 'Check-in is open'; ta := 'التشيك إن اتفتح'; be := 'Check in now for ' || NEW.title_en; ba := 'اعمل تشيك إن دلوقتي في ' || NEW.title_ar;
  ELSIF NEW.status = 'live' THEN k := 'tournament_live'; te := 'Tournament is live'; ta := 'البطولة بدأت'; be := NEW.title_en || ' has started.'; ba := NEW.title_ar || ' بدأت.';
  ELSIF NEW.status = 'completed' THEN k := 'tournament_finished'; te := 'Tournament finished'; ta := 'البطولة خلصت'; be := NEW.title_en || ' has finished. Check the results.'; ba := NEW.title_ar || ' خلصت. شوف النتايج.';
  ELSIF NEW.status = 'cancelled' THEN k := 'tournament_cancelled'; te := 'Tournament cancelled'; ta := 'البطولة اتلغت'; be := NEW.title_en || ' was cancelled.'; ba := NEW.title_ar || ' اتلغت.';
  ELSE RETURN NEW; END IF;
  v_link := '/tournaments/' || NEW.slug;
  FOR reg IN SELECT * FROM registrations WHERE tournament_id = NEW.id AND status IN ('pending', 'confirmed', 'checked_in', 'waitlisted') LOOP
    FOR r IN SELECT uid FROM reg_recipients(reg, true) LOOP
      PERFORM notify_user(r.uid, k, te, ta, be, ba, v_link, 'site', 'tstatus:' || NEW.id || ':' || NEW.status);
    END LOOP;
  END LOOP;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_tournament ON tournaments;
CREATE TRIGGER notify_tournament AFTER UPDATE OF status ON tournaments FOR EACH ROW EXECUTE FUNCTION trg_notify_tournament();

CREATE OR REPLACE FUNCTION trg_notify_team_member() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tm teams%ROWTYPE; v_name text;
BEGIN
  SELECT * INTO tm FROM teams WHERE id = NEW.team_id;
  IF NEW.invite_status = 'pending' AND (TG_OP = 'INSERT' OR OLD.invite_status IS DISTINCT FROM 'pending') THEN
    PERFORM notify_user(NEW.user_id, 'team_invite', 'Team invite', 'دعوة تيم',
      'You were invited to join ' || tm.name || '.', 'اتدعيت تنضم لتيم ' || tm.name || '.', '/teams', 'site', 'invite:' || NEW.id || ':' || extract(epoch FROM now())::bigint);
  ELSIF TG_OP = 'UPDATE' AND OLD.invite_status = 'pending' AND NEW.invite_status IN ('accepted', 'declined') AND NEW.user_id <> tm.captain_id THEN
    SELECT username INTO v_name FROM player_profiles WHERE id = NEW.user_id;
    IF NEW.invite_status = 'accepted' THEN
      PERFORM notify_user(tm.captain_id, 'team_invite_accepted', 'Invite accepted', 'تم قبول الدعوة',
        v_name || ' joined ' || tm.name || '.', v_name || ' انضم لتيم ' || tm.name || '.', '/teams/' || tm.id, 'site', 'inv_ok:' || NEW.id || ':' || extract(epoch FROM now())::bigint);
    ELSE
      PERFORM notify_user(tm.captain_id, 'team_invite_declined', 'Invite declined', 'تم رفض الدعوة',
        v_name || ' declined to join ' || tm.name || '.', v_name || ' رفض الانضمام لتيم ' || tm.name || '.', '/teams/' || tm.id, 'site', 'inv_no:' || NEW.id || ':' || extract(epoch FROM now())::bigint);
    END IF;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS notify_team_member ON team_members;
CREATE TRIGGER notify_team_member AFTER INSERT OR UPDATE OF invite_status ON team_members FOR EACH ROW EXECUTE FUNCTION trg_notify_team_member();

-- Time-based check-in notices for the signed-in user (called when the bell loads). Same dedupe keys the Discord bot uses, so nothing doubles.
CREATE OR REPLACE FUNCTION sync_my_notifications() RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN; END IF;
  FOR r IN
    SELECT reg.id AS rid, reg.status AS rstatus, t.slug, t.title_en, t.title_ar, t.checkin_opens_at AS o, t.checkin_closes_at AS c, t.status AS tstatus
      FROM registrations reg JOIN tournaments t ON t.id = reg.tournament_id
     WHERE reg.status IN ('confirmed', 'checked_in')
       AND (reg.user_id = v_uid OR reg.team_id IN (SELECT id FROM teams WHERE captain_id = v_uid))
       AND t.status NOT IN ('completed', 'archived', 'cancelled', 'draft')
  LOOP
    IF r.rstatus = 'confirmed' AND r.o IS NOT NULL AND r.o <= now() AND (r.c IS NULL OR r.c > now()) THEN
      PERFORM notify_user(v_uid, 'checkin_open', 'Check-in is open', 'التشيك إن اتفتح',
        'Check in for ' || r.title_en || COALESCE(' before ' || to_char(r.c AT TIME ZONE 'Africa/Cairo', 'Mon DD HH24:MI') || ' (Cairo)', '') || '.',
        'اعمل تشيك إن في ' || r.title_ar || COALESCE(' قبل ' || to_char(r.c AT TIME ZONE 'Africa/Cairo', 'MM/DD HH24:MI') || ' (القاهرة)', '') || '.',
        '/tournaments/' || r.slug, 'site', 'ci_open:' || r.rid);
    END IF;
    IF r.rstatus = 'confirmed' AND r.c IS NOT NULL AND r.c > now() AND r.c <= now() + interval '30 minutes' THEN
      PERFORM notify_user(v_uid, 'checkin_soon', 'Check-in closes soon', 'التشيك إن هيقفل قريب',
        'Less than 30 minutes left to check in for ' || r.title_en || '.', 'فاضل أقل من 30 دقيقة للتشيك إن في ' || r.title_ar || '.',
        '/tournaments/' || r.slug, 'site', 'ci_soon:' || r.rid);
    END IF;
    IF r.rstatus = 'confirmed' AND r.c IS NOT NULL AND r.c <= now() AND r.c > now() - interval '7 days' THEN
      PERFORM notify_user(v_uid, 'checkin_expired', 'Check-in closed', 'التشيك إن خلص',
        'You did not check in for ' || r.title_en || '. Talk to the organizer if this is a mistake.', 'ماعملتش تشيك إن في ' || r.title_ar || '. كلم المنظم لو في مشكلة.',
        '/tournaments/' || r.slug, 'site', 'ci_expired:' || r.rid);
    END IF;
  END LOOP;
END $$;
REVOKE ALL ON FUNCTION sync_my_notifications() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION sync_my_notifications() TO authenticated;

CREATE OR REPLACE FUNCTION mark_notifications_read(p_ids uuid[] DEFAULT NULL) RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE notifications SET read_at = now() WHERE user_id = auth.uid() AND read_at IS NULL AND (p_ids IS NULL OR id = ANY(p_ids));
$$;
REVOKE ALL ON FUNCTION mark_notifications_read(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION mark_notifications_read(uuid[]) TO authenticated;
