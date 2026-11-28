import { ImageResponse } from 'next/og';
import { sbSelect } from '@/lib/supabase/rest';

export const runtime = 'nodejs';

async function font(family: string, weight: number): Promise<ArrayBuffer | null> {
  try {
    const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}`, { next: { revalidate: 86400 * 30 } })).text();
    const m = css.match(/src: url\((https:[^)]+)\) format\('(?:truetype|opentype)'\)/);
    if (!m?.[1]) return null;
    return await (await fetch(m[1], { next: { revalidate: 86400 * 30 } })).arrayBuffer();
  } catch { return null; }
}

interface Row { registration_id: string; rank: number; ign: string; total_points: number; total_kills: number; best_placement: number | null; matches_played: number }

export async function GET(req: Request) {
  const u = new URL(req.url);
  const slug = u.searchParams.get('t') ?? '';
  const rid = u.searchParams.get('r') ?? '';
  const size = u.searchParams.get('size') === 'square' ? 'square' : 'story';
  const dl = u.searchParams.get('dl') === '1';
  if (!/^[a-z0-9-]{1,80}$/i.test(slug) || !/^[0-9a-f-]{36}$/i.test(rid)) return new Response('Bad request', { status: 400 });
  const ts = await sbSelect<{ id: string; title_en: string; status: string }>('tournaments', { select: 'id,title_en,status', slug: `eq.${slug}` }).catch(() => []);
  const t = ts[0];
  if (!t) return new Response('Not found', { status: 404 });
  const rows = await sbSelect<Row>('tournament_standings', { select: '*', tournament_id: `eq.${t.id}`, order: 'rank' }).catch(() => [] as Row[]);
  const me = rows.find((r) => r.registration_id === rid);
  if (!me) return new Response('Not found', { status: 404 });

  const [barlow, cairo] = await Promise.all([font('Barlow Condensed', 800), font('Cairo', 800)]);
  const fonts: { name: string; data: ArrayBuffer; weight: 800; style: 'normal' }[] = [];
  if (barlow) fonts.push({ name: 'Barlow', data: barlow, weight: 800, style: 'normal' });
  if (cairo) fonts.push({ name: 'Cairo', data: cairo, weight: 800, style: 'normal' });

  const W = 1080, H = size === 'story' ? 1920 : 1080;
    const accent = me.rank === 1 ? '#FFB938' : me.rank === 2 ? '#D6D9E0' : me.rank === 3 ? '#E5A970' : '#e5ed43';
  const isAr = /[\u0600-\u06FF]/.test(me.ign);
  const final = t.status === 'completed';
  const ff = 'Barlow, Cairo, sans-serif';
  const big = size === 'story' ? 300 : 210;

  const stat = (label: string, value: string | number) => (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, borderTop: '4px solid #2b2d30', paddingTop: 18 }}>
      <div style={{ fontSize: 30, letterSpacing: 6, color: '#8b8e92', display: 'flex' }}>{label}</div>
      <div style={{ fontSize: size === 'story' ? 120 : 90, color: '#f4f4ed', lineHeight: 1, marginTop: 8, display: 'flex' }}>{value}</div>
    </div>
  );

  const img = new ImageResponse(
    (
      <div style={{ width: W, height: H, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: '#0d0e10', color: '#f4f4ed', fontFamily: ff, padding: 80, paddingRight: 80, position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, right: 70, width: 44, height: size === 'story' ? 820 : 520, background: accent, transform: 'skewX(-18deg)', opacity: 0.95, display: 'flex' }} />
        <div style={{ position: 'absolute', top: -60, right: -10, width: 16, height: size === 'story' ? 820 : 520, background: accent, transform: 'skewX(-18deg)', opacity: 0.35, display: 'flex' }} />
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, letterSpacing: 10, color: '#e5ed43', display: 'flex' }}>RAGE TOURNAMENTS</div>
          <div style={{ fontSize: 44, color: '#a4a6aa', marginTop: 14, display: 'flex', maxWidth: 800 }}>{t.title_en.toUpperCase()}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, letterSpacing: 8, color: accent, display: 'flex' }}>{final ? 'FINAL PLACE' : 'CURRENT PLACE'}</div>
          <div style={{ fontSize: big * 1.5, lineHeight: 0.9, color: accent, display: 'flex' }}>{`#${me.rank}`}</div>
          <div style={{ fontSize: 120, marginTop: 24, lineHeight: 1.05, display: 'flex', maxWidth: 800, wordBreak: 'break-word', direction: isAr ? 'rtl' : 'ltr' }}>{me.ign}</div>
        </div>
        <div style={{ display: 'flex', gap: 36 }}>
          {stat('POINTS', Number(me.total_points))}
          {stat('KILLS', Number(me.total_kills))}
          {stat('BEST PLACE', me.best_placement ?? '-')}
        </div>
      </div>
    ),
    { width: W, height: H, fonts: fonts.length ? fonts : undefined }
  );
  const headers = new Headers(img.headers);
  headers.set('Cache-Control', 'public, max-age=60, s-maxage=60');
  if (dl) headers.set('Content-Disposition', `attachment; filename="rage-${slug}-card-${size}.png"`);
  return new Response(img.body, { headers });
}
