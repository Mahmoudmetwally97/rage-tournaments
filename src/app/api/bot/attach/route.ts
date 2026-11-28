import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorized } from '@/lib/bot/auth';
import { attachBotMessage } from '@/lib/bot/service';

export const runtime = 'nodejs';

const body = z.object({ submissionId: z.string().uuid(), botMessageId: z.string().min(1) });

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  await attachBotMessage(parsed.data.submissionId, parsed.data.botMessageId);
  return NextResponse.json({ ok: true });
}
