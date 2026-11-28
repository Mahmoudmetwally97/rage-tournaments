import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorized } from '@/lib/bot/auth';
import { serviceClient } from '@/lib/bot/service';
import { dueNotices, recordNotices } from '@/lib/bot/notify';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST { slugs: string[] }  -> notices due now (read only)
// POST { ack: [{tournamentId, kind, registrationId, outcome}] } -> mark as sent
const body = z.object({
  slugs: z.array(z.string()).max(20).optional(),
  ack: z.array(z.object({
    tournamentId: z.string().uuid(), registrationId: z.string().uuid(),
    kind: z.enum(['checkin_open', 'checkin_expired']), outcome: z.enum(['dm', 'failed', 'no_discord'])
  })).max(500).optional()
});

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  const sb = serviceClient();
  if (parsed.data.ack) { await recordNotices(sb, parsed.data.ack); return NextResponse.json({ ok: true }); }
  return NextResponse.json({ notices: await dueNotices(sb, parsed.data.slugs ?? []) });
}
