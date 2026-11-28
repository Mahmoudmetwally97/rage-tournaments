import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorized } from '@/lib/bot/auth';
import { isApprover, serviceClient } from '@/lib/bot/service';
import { dueNotices, mirrorToBell, noticeText, recordNotices } from '@/lib/bot/notify';

export const runtime = 'nodejs';
export const maxDuration = 30;

// POST { slugs: string[] }  -> notices due now (read only)
// POST { ack: [{tournamentId, kind, registrationId, outcome}] } -> mark as sent
const body = z.object({
  slugs: z.array(z.string()).max(20).optional(),
  preview: z.object({ discordUserId: z.string().min(1) }).optional(),
  ack: z.array(z.object({
    tournamentId: z.string().uuid(), registrationId: z.string().uuid(),
    kind: z.enum(['checkin_open', 'checkin_expired']), outcome: z.enum(['dm', 'failed', 'no_discord']),
    userId: z.string().uuid().optional(), slug: z.string().optional(), tournament: z.string().optional(), teamName: z.string().nullable().optional()
  })).max(500).optional()
});

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  if (parsed.data.preview) {
    // Self-test: sample texts for the owner only. Reads and writes nothing, touches no real player.
    if (!(await isApprover(parsed.data.preview.discordUserId))) return NextResponse.json({ ok: false, error: 'NOT_APPROVER' });
    const t = 'TEST - Registration trial';
    const closes = new Date(Date.now() + 30 * 60_000).toISOString();
    return NextResponse.json({
      ok: true,
      samples: [
        { label: 'FFA - check-in open', text: noticeText('checkin_open', t, null, closes) },
        { label: 'FFA - check-in expired', text: noticeText('checkin_expired', t, null, closes) },
        { label: 'Team captain - check-in open', text: noticeText('checkin_open', t, 'Team Rage', closes) },
        { label: 'Team captain - check-in expired', text: noticeText('checkin_expired', t, 'Team Rage', closes) }
      ]
    });
  }
  const sb = serviceClient();
  if (parsed.data.ack) { await recordNotices(sb, parsed.data.ack); await mirrorToBell(sb, parsed.data.ack); return NextResponse.json({ ok: true }); }
  return NextResponse.json({ notices: await dueNotices(sb, parsed.data.slugs ?? []) });
}
