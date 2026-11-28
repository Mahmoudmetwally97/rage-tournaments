import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorized } from '@/lib/bot/auth';
import { isApprover, linkChannel, searchTournaments } from '@/lib/bot/service';

export const runtime = 'nodejs';

const body = z.object({
  discordUserId: z.string().min(1),
  guildId: z.string().min(1).optional(),
  channelId: z.string().min(1).optional(),
  tournamentSlug: z.string().min(1).optional(),
  roomHint: z.string().optional(),
  search: z.string().max(100).optional()
});

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (!(await isApprover(parsed.data.discordUserId))) return NextResponse.json({ ok: false, error: 'NOT_APPROVER' });
  if (parsed.data.search !== undefined) return NextResponse.json({ ok: true, items: await searchTournaments(parsed.data.search) });
  const d = parsed.data;
  if (!d.guildId || !d.channelId || !d.tournamentSlug) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  return NextResponse.json(await linkChannel({ discordUserId: d.discordUserId, guildId: d.guildId, channelId: d.channelId, tournamentSlug: d.tournamentSlug, roomHint: d.roomHint }));
}
