-- 0020: Discord bot check-in notifications. One row per notice sent, so nothing goes out twice.
CREATE TABLE IF NOT EXISTS bot_notified (
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('checkin_open', 'checkin_expired')),
  registration_id uuid NOT NULL REFERENCES registrations(id) ON DELETE CASCADE,
  outcome text NOT NULL CHECK (outcome IN ('dm', 'failed', 'no_discord')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (tournament_id, kind, registration_id)
);
ALTER TABLE bot_notified ENABLE ROW LEVEL SECURITY;
-- No policies: only the service role (bot API) reads or writes it.
