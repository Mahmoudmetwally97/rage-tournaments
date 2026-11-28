import type { SupabaseClient } from '@supabase/supabase-js';

export interface BMatch {
  id: string; round: number; number: number; status: string;
  a: { id: string; name: string; logo?: string | null; tag?: string } | null; b: { id: string; name: string; logo?: string | null; tag?: string } | null;
  scoreA: number | null; scoreB: number | null; winnerId: string | null; next: string | null;
}

export async function loadBracket(sb: SupabaseClient, tournamentId: string): Promise<{ rounds: BMatch[][]; stageId: string | null }> {
  const { data: st } = await sb.from('stages').select('id').eq('tournament_id', tournamentId).eq('participant_mode', 'team').order('stage_order').limit(1);
  const stageId = st?.[0]?.id as string | undefined;
  if (!stageId) return { rounds: [], stageId: null };
  const { data: ms } = await sb.from('matches').select('id,round_number,match_number,status,score_a,score_b,winner_registration_id,next_match_id').eq('stage_id', stageId).order('round_number').order('match_number');
  const ids = (ms ?? []).map((m) => m.id);
  const { data: ps } = ids.length
    ? await sb.from('match_participants').select('match_id,slot_number,registration_id,registrations(ign_snapshot,team_id,display_override,hidden_public)').in('match_id', ids)
    : { data: [] as never[] };
  const teamIds = Array.from(new Set((ps ?? []).map((p) => { const x = p.registrations as unknown as { team_id: string | null } | { team_id: string | null }[] | null; return (Array.isArray(x) ? x[0]?.team_id : x?.team_id) ?? null; }).filter(Boolean))) as string[];
  const { data: tms } = teamIds.length ? await sb.from('teams').select('id,tag,logo_url').in('id', teamIds) : { data: [] as { id: string; tag: string; logo_url: string | null }[] };
  const tinfo = (r: unknown) => {
    const x = r as { team_id: string | null } | { team_id: string | null }[] | null;
    const id = (Array.isArray(x) ? x[0]?.team_id : x?.team_id) ?? null;
    const tm = (tms ?? []).find((q) => q.id === id);
    return { logo: tm?.logo_url ?? null, tag: tm?.tag };
  };
  const name = (r: unknown): string => {
    type R = { ign_snapshot: string; display_override?: string | null; hidden_public?: boolean };
    const x = r as R | R[] | null;
    const y = Array.isArray(x) ? x[0] : x;
    if (y?.hidden_public) return '—';
    return (y?.display_override?.trim() || y?.ign_snapshot) ?? '';
  };
  const rounds: BMatch[][] = [];
  for (const m of ms ?? []) {
    const slot = (n: number) => {
      const p = (ps ?? []).find((q) => q.match_id === m.id && q.slot_number === n);
      return p ? { id: p.registration_id as string, name: name(p.registrations), ...tinfo(p.registrations) } : null;
    };
    const bm: BMatch = { id: m.id, round: m.round_number, number: m.match_number, status: m.status, a: slot(1), b: slot(2), scoreA: m.score_a, scoreB: m.score_b, winnerId: m.winner_registration_id, next: m.next_match_id };
    (rounds[m.round_number - 1] ??= []).push(bm);
  }
  return { rounds, stageId };
}
