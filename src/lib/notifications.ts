export type NotificationRow = {
  id: string;
  kind: string;
  source: 'site' | 'discord_bot';
  title_en: string;
  title_ar: string;
  body_en: string;
  body_ar: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export function timeAgo(iso: string, locale: 'ar' | 'en', now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(iso).getTime()) / 1000));
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const d = Math.floor(h / 24);
  if (locale === 'ar') {
    if (m < 1) return 'دلوقتي';
    if (m < 60) return `من ${m} د`;
    if (h < 24) return `من ${h} س`;
    return `من ${d} يوم`;
  }
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${d}d ago`;
}

export function kindTone(kind: string): string {
  if (kind.includes('rejected') || kind.includes('cancelled') || kind.includes('expired') || kind.includes('disqualified') || kind.includes('declined')) return '#FCA5A5';
  if (kind.includes('checkin') || kind.includes('soon')) return '#e5ed43';
  if (kind.includes('team')) return '#7dd3fc';
  return '#d6d7d2';
}
