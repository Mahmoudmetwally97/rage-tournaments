import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorized } from '@/lib/bot/auth';
import { isApprover, linkChannel } from '@/lib/bot/service';

export const runtime = 'nodejs';

const body = z.object({
  discordUserId: z.string().min(1),
  guildId: z.string().min(1),
  channelId: z.string().min(1),
  tournamentSlug: z.string().min(1),
  roomHint: z.string().optional()
});

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (!(await isApprover(parsed.data.discordUserId))) return NextResponse.json({ ok: false, error: 'NOT_APPROVER' });
  return NextResponse.json(await linkChannel(parsed.data));
}
