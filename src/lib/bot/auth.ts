import { timingSafeEqual } from 'crypto';

export function authorized(req: Request): boolean {
  const secret = process.env.BOT_SHARED_SECRET;
  const got = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!secret || secret.length < 24 || !got) return false;
  const a = Buffer.from(secret);
  const b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}
