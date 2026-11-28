-- 0023: add RP as a reward and bonus kind.
DO $$ DECLARE c record; BEGIN
  FOR c IN SELECT conrelid::regclass AS t, conname FROM pg_constraint
           WHERE contype = 'c' AND conrelid IN ('prize_rewards'::regclass, 'tournament_bonuses'::regclass) AND pg_get_constraintdef(oid) LIKE '%kind%'
  LOOP EXECUTE format('ALTER TABLE %s DROP CONSTRAINT %I', c.t, c.conname); END LOOP;
END $$;
ALTER TABLE prize_rewards ADD CONSTRAINT prize_rewards_kind_check CHECK (kind IN ('cash','rp','coins','voucher','other'));
ALTER TABLE tournament_bonuses ADD CONSTRAINT tournament_bonuses_kind_check CHECK (kind IN ('cash','rp','coins','voucher','other'));
