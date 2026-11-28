import { NextResponse } from 'next/server';
import { z } from 'zod';
import { decideFromDiscord } from '@/lib/bot/service';
import { authorized } from '@/lib/bot/auth';

export const runtime = 'nodejs';

const body = z.object({
  submissionId: z.string().uuid().optional(),
  channelId: z.string().optional(),
  messageId: z.string().optional(),
  discordUserId: z.string().min(1),
  decision: z.enum(['approve', 'reject'])
}).refine((b) => b.submissionId || (b.channelId && b.messageId));

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  return NextResponse.json(await decideFromDiscord(parsed.data));
}
