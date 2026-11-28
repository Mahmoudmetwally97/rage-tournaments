import { NextResponse } from 'next/server';
import { z } from 'zod';
import { authorized } from '@/lib/bot/auth';
import { ingestScreenshot } from '@/lib/bot/service';

export const runtime = 'nodejs';
export const maxDuration = 60;

const body = z.object({
  channelId: z.string().min(1),
  guildId: z.string().optional(),
  messageId: z.string().min(1),
  imageUrl: z.string().url(),
  authorDiscordId: z.string().optional()
});

export async function POST(req: Request) {
  if (!authorized(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  // Only Discord CDN images are read.
  const host = new URL(parsed.data.imageUrl).hostname;
  if (!/(^|\.)discordapp\.(com|net)$|(^|\.)discord\.com$/.test(host)) return NextResponse.json({ error: 'bad_image_host' }, { status: 400 });
  try {
    return NextResponse.json(await ingestScreenshot(parsed.data));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'error' }, { status: 500 });
  }
}
