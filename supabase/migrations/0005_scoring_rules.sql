-- 0005_scoring_rules.sql (Created after stages so stage_id FK resolves)
CREATE TABLE IF NOT EXISTS tournament_scoring_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES stages(id) ON DELETE CASCADE,
  version integer NOT NULL DEFAULT 1,
  placement_points jsonb NOT NULL DEFAULT '{}'::jsonb,
  kill_points numeric NOT NULL DEFAULT 1,
  win_points numeric NOT NULL DEFAULT 3,
  round_count integer NOT NULL DEFAULT 1 CHECK (round_count >= 1),
  aggregation_mode text NOT NULL DEFAULT 'aggregate' CHECK (aggregation_mode IN ('aggregate', 'best_round')),
  tie_breaker_rules jsonb NOT NULL DEFAULT '["total_points","total_kills","best_placement","seed"]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
