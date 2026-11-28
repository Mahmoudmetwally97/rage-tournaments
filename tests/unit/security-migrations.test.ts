import fs from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');

function readAllMigrations(): string {
  const files = fs.readdirSync(migrationsDir).filter((f) => f.endsWith('.sql')).sort();
  return files.map((f) => fs.readFileSync(path.join(migrationsDir, f), 'utf8')).join('\n');
}

describe('SQL Migrations — Security & Integrity Audit', () => {
  const allSql = readAllMigrations();
  const rlsSql = fs.readFileSync(path.join(migrationsDir, '0008_rls_and_rpcs.sql'), 'utf8');

  it('enables ROW LEVEL SECURITY on every created table', () => {
    const tableMatches = [...allSql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi)];
    const tableNames = tableMatches.map((m) => m[1]).filter(Boolean);
    expect(tableNames.length).toBeGreaterThanOrEqual(24);

    for (const table of tableNames) {
      expect(rlsSql).toContain(`ALTER TABLE ${table} ENABLE ROW LEVEL SECURITY;`);
    }
  });

  it('enforces auth.uid() and SET search_path on SECURITY DEFINER registration RPCs', () => {
    expect(rlsSql).toContain('register_solo_participant');
    expect(rlsSql).toContain('register_team_participant');
    expect(rlsSql).toContain('v_user_id uuid := auth.uid();');
    expect(rlsSql).toContain('v_caller_id uuid := auth.uid();');
    expect(rlsSql).toContain('SET search_path = public, pg_temp');
    expect(rlsSql).toContain('REVOKE ALL ON FUNCTION register_solo_participant');
    expect(rlsSql).toContain('REVOKE ALL ON FUNCTION register_team_participant');
  });

  it('prevents captain/leader role conflict in team_members and enforces registration XOR', () => {
    const teamsSql = fs.readFileSync(path.join(migrationsDir, '0003_teams_and_members.sql'), 'utf8');
    const regSql = fs.readFileSync(path.join(migrationsDir, '0006_registrations_and_rosters.sql'), 'utf8');

    expect(teamsSql).toContain("CHECK (role IN ('member', 'sub'))");
    expect(regSql).toContain('CONSTRAINT chk_registration_xor_participant CHECK');
  });
});
