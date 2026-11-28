-- Pre-game lobby screenshots read by the Discord bot ("room start proof"). Evidence only, never approves anything.
CREATE TABLE IF NOT EXISTS bot_lobby_proofs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE SET NULL,
  group_id uuid REFERENCES groups(id) ON DELETE SET NULL,
  guild_id text,
  channel_id text,
  message_id text,
  submitted_by_discord_id text,
  image_url text NOT NULL,
  image_sha256 text,
  extracted jsonb NOT NULL DEFAULT '{}'::jsonb,
  room_label text,
  mode text,
  map text,
  players jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{read_name, registration_id, ign, match_score}]
  matched int NOT NULL DEFAULT 0,
  total int NOT NULL DEFAULT 0,
  flags jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bot_lobby_tournament ON bot_lobby_proofs(tournament_id, group_id, created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS uq_bot_lobby_message ON bot_lobby_proofs(channel_id, message_id, image_url);
ALTER TABLE bot_lobby_proofs ENABLE ROW LEVEL SECURITY;
