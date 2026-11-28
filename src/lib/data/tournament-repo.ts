import { DEMO_TOURNAMENTS, type DemoTournament } from './demo-tournaments';
import { isSupabaseConfigured, sbSelect } from '@/lib/supabase/rest';

export type DataSource = 'db' | 'demo';

interface TournamentRow {
  id: string;
  slug: string;
  cover_image_url: string | null;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  competition_type: 'solo' | 'team';
  status: string;
  min_participants: number;
  max_participants: number;
  starts_at: string | null;
  prize_summary_ar: string | null;
  prize_summary_en: string | null;
  rules_text_ar: string | null;
  rules_text_en: string | null;
  games: { name_ar: string; name_en: string } | null;
}

interface StageRow {
  tournament_id: string;
  stage_order: number;
  name_ar: string;
  name_en: string;
  format: string;
  qualify_count: number;
  advance_rule: string;
}

const STATUS_MAP: Record<string, DemoTournament['status']> = {
  registration_open: 'registration_open',
  check_in: 'check_in',
  live: 'live',
  completed: 'completed'
};

function toLines(text: string | null | undefined): string[] {
  if (!text) return [];
  return text
    .split(/\r?\n|•/)
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Hide bracketed placeholder wording; the UI shows its own 'announced later' text. */
function cleanPrize(v?: string | null): string {
  if (!v || /\[[^\]]*\]|placeholder|TBD/i.test(v)) return '';
  return v;
}

interface StandingRow { tournament_id: string; rank: number; ign: string; total_points: number; total_kills: number }

function mapRow(row: TournamentRow, stages: StageRow[], registeredCount: number, standings: StandingRow[] = []): DemoTournament {
  const stageRows = stages.filter((s) => s.tournament_id === row.id).sort((a, b) => a.stage_order - b.stage_order);
  const primaryFormat = stageRows[0]?.format ?? 'ffa';

  return {
    slug: row.slug,
    coverUrl: row.cover_image_url,
    isDemo: true,
    featured: true,
    titleAr: row.title_ar,
    titleEn: row.title_en,
    gameAr: row.games?.name_ar ?? 'RAGE',
    gameEn: row.games?.name_en ?? 'RAGE',
    competitionType: row.competition_type,
    formatKey: primaryFormat === 'ffa' ? 'ffa' : primaryFormat === 'points' ? 'points' : 'groups_knockout',
    formatLabel: primaryFormat.toUpperCase(),
    status: STATUS_MAP[row.status] ?? 'upcoming',
    registeredCount,
    maxParticipants: row.max_participants,
    startsAtIso: row.starts_at ?? '',
    prizeConfirmedAr: cleanPrize(row.prize_summary_ar),
    prizeConfirmedEn: cleanPrize(row.prize_summary_en),
    rulesAr: toLines(row.rules_text_ar),
    rulesEn: toLines(row.rules_text_en),
    stages: stageRows.map((s) => ({
      order: s.stage_order,
      nameAr: s.name_ar,
      nameEn: s.name_en,
      format: s.format,
      qualifies: s.advance_rule === 'top_n_overall' ? `Top ${s.qualify_count} overall` : `Top ${s.qualify_count} per group`
    })),
    sampleParticipants: standings
      .filter((r) => r.tournament_id === row.id)
      .sort((a, b) => a.rank - b.rank)
      .map((r) => ({ code: `#${r.rank}`, ign: r.ign, status: 'checked_in', points: Number(r.total_points), kills: Number(r.total_kills) }))
  };
}

/**
 * Reads tournaments from Supabase. Falls back to the bundled demo data when the
 * project is not configured or the query fails, so the preview never goes blank.
 */
export async function getTournaments(): Promise<{ items: DemoTournament[]; source: DataSource }> {
  if (!isSupabaseConfigured()) {
    return { items: DEMO_TOURNAMENTS, source: 'demo' };
  }

  try {
    const [rows, stages, registrations, standings] = await Promise.all([
      sbSelect<TournamentRow>('tournaments', {
        select: 'id,slug,cover_image_url,title_ar,title_en,description_ar,description_en,competition_type,status,min_participants,max_participants,starts_at,prize_summary_ar,prize_summary_en,rules_text_ar,rules_text_en,games(name_ar,name_en)',
        status: 'neq.archived',
        order: 'created_at.desc'
      }),
      sbSelect<StageRow>('stages', {
        select: 'tournament_id,stage_order,name_ar,name_en,format,qualify_count,advance_rule'
      }),
      sbSelect<{ tournament_id: string }>('registrations', { select: 'tournament_id' }),
      sbSelect<StandingRow>('tournament_standings', { select: 'tournament_id,rank,ign,total_points,total_kills' }).catch(() => [] as StandingRow[])
    ]);

    if (rows.length === 0) {
      return { items: DEMO_TOURNAMENTS, source: 'demo' };
    }

    const counts = registrations.reduce<Record<string, number>>((acc, r) => {
      acc[r.tournament_id] = (acc[r.tournament_id] ?? 0) + 1;
      return acc;
    }, {});

    return {
      items: rows.map((row) => mapRow(row, stages, counts[row.id] ?? 0, standings)),
      source: 'db'
    };
  } catch {
    return { items: DEMO_TOURNAMENTS, source: 'demo' };
  }
}

export async function getTournamentBySlug(slug: string): Promise<{ item: DemoTournament | null; source: DataSource }> {
  const { items, source } = await getTournaments();
  return { item: items.find((t) => t.slug === slug) ?? null, source };
}
