-- 0001_games_and_profiles.sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS games (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name_en text NOT NULL,
  name_ar text NOT NULL,
  default_team_size integer NOT NULL DEFAULT 5 CHECK (default_team_size >= 1),
  supported_formats jsonb NOT NULL DEFAULT '["ffa","points","groups","knockout"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO games (slug, name_en, name_ar, default_team_size)
VALUES ('crossfire-rage', 'CrossFire - RAGE', 'كروس فاير - RAGE', 5)
ON CONFLICT (slug) DO NOTHING;

CREATE TABLE IF NOT EXISTS player_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  display_name text NOT NULL,
  preferred_locale text NOT NULL DEFAULT 'ar' CHECK (preferred_locale IN ('ar', 'en')),
  discord_handle text,
  whatsapp_number text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS player_game_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  game_id uuid NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  ign text NOT NULL,
  ign_lower text GENERATED ALWAYS AS (lower(ign)) STORED,
  is_verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, game_id)
);

CREATE TABLE IF NOT EXISTS account_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES player_profiles(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'rage_crossfire',
  external_identifier text NOT NULL,
  external_identifier_lower text GENERATED ALWAYS AS (lower(external_identifier)) STORED,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'revoked')),
  verified_by uuid REFERENCES player_profiles(id),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_account_links_active
  ON account_links(provider, external_identifier_lower)
  WHERE status != 'revoked';
