export function formatStartDate(iso: string, locale: string): string {
  if (!iso) return locale === 'ar' ? 'يُعلن لاحقاً' : 'TBD';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG-u-nu-latn' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo'
  }).format(new Date(iso));
}

/** Cairo wall-clock "YYYY-MM-DDTHH:mm" -> UTC ISO (handles Egypt DST). */
export function cairoLocalToIso(local: string): string {
  const [d = '', t = ''] = local.split('T');
  const [y = 0, mo = 1, da = 1] = d.split('-').map(Number);
  const [h = 0, mi = 0] = (t || '00:00').split(':').map(Number);
  const guess = Date.UTC(y, mo - 1, da, h, mi);
  const fmt = new Intl.DateTimeFormat('en-US', { timeZone: 'Africa/Cairo', hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric' });
  const p: Record<string, number> = Object.fromEntries(fmt.formatToParts(new Date(guess)).map((x) => [x.type, Number(x.value)]));
  const asCairo = Date.UTC(p.year ?? 0, (p.month ?? 1) - 1, p.day ?? 1, p.hour ?? 0, p.minute ?? 0);
  return new Date(guess - (asCairo - guess)).toISOString();
}

/** UTC ISO -> Cairo wall-clock "YYYY-MM-DDTHH:mm" for datetime-local inputs. */
export function isoToCairoLocal(iso?: string | null): string {
  if (!iso) return '';
  const fmt = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo', hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  const p = Object.fromEntries(fmt.formatToParts(new Date(iso)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}`;
}

export function ctaFor(status: string, ar: boolean): string {
  if (status === 'upcoming' || status === 'cancelled' || status === 'suspended') return ar ? 'التفاصيل' : 'View details';
  if (status === 'registration_open') return ar ? 'سجّل الآن' : 'Register now';
  if (status === 'registration_closed' || status === 'ready') return ar ? 'حالتي' : 'My entry';
  if (status === 'check_in') return ar ? 'سجّل حضورك' : 'Check in';
  if (status === 'live') return ar ? 'شاهد الترتيب' : 'View standings';
  return ar ? 'النتائج' : 'Results';
}

export type BadgeInfo = { text: string; variant: 'open' | 'warning' | 'live' | 'neutral' | 'danger'; pulse: boolean };

/** Clear tournament state badge: coming soon, registration open/closed, check-in, live, finished... */
export function statusBadge(status: string, ar: boolean): BadgeInfo {
  const T: Record<string, [string, string, BadgeInfo['variant']]> = {
    upcoming: ['قريباً', 'Coming soon', 'neutral'],
    registration_open: ['التسجيل مفتوح', 'Registration open', 'open'],
    registration_closed: ['التسجيل مقفول', 'Registration closed', 'danger'],
    check_in: ['التشيك إن مفتوح', 'Check-in open', 'warning'],
    ready: ['على وشك البدء', 'Starting soon', 'warning'],
    live: ['مباشر الآن', 'Live now', 'live'],
    completed: ['انتهت', 'Finished', 'neutral'],
    cancelled: ['ملغية', 'Cancelled', 'danger'],
    suspended: ['موقوفة', 'Suspended', 'danger']
  };
  const r = T[status] ?? T.upcoming!;
  return { text: ar ? r[0] : r[1], variant: r[2], pulse: status === 'live' };
}

export function ctaHref(status: string, locale: string, slug: string): string {
  if (status === 'upcoming' || status === 'completed' || status === 'archived' || status === 'cancelled' || status === 'suspended') return `/${locale}/tournaments/${slug}`;
  return `/${locale}/tournaments/${slug}/play`;
}

export function formatLabel(fmt: string, ar: boolean): string {
  const f = fmt.toLowerCase();
  if (f === 'ffa') return ar ? 'FFA: كل لاعب لنفسه' : 'FFA (free for all)';
  if (f === 'points') return ar ? 'نظام نقاط' : 'Points';
  if (f.includes('knockout')) return ar ? 'مجموعات ثم إقصاء' : 'Groups + knockout';
  return fmt.toUpperCase();
}

export function qualifiesLabel(q: string, ar: boolean): string {
  const m = q.match(/Top (\d+) (overall|per group)/i);
  if (!m) return q;
  const n = m[1];
  const per = /group/i.test(m[2] ?? '');
  return ar ? `أفضل ${n}${per ? ' من كل مجموعة' : ' بالإجمالي'}` : `Top ${n}${per ? ' per group' : ' overall'}`;
}

export const upcomingText = (ar: boolean) => (ar ? 'قريباً' : 'Coming soon');

export type PrimaryAction = { label: string; href: string | null; secondary?: { label: string; href: string } };

/** The main button per tournament state. href null = shown disabled (nothing to do right now). */
export function primaryAction(status: string, locale: string, slug: string): PrimaryAction {
  const ar = locale === 'ar';
  const play = `/${locale}/tournaments/${slug}/play`;
  switch (status) {
    case 'registration_open':
      return { label: ar ? 'سجّل الآن' : 'Register now', href: play };
    case 'upcoming':
      return { label: ar ? 'التسجيل لسه ماتفتحش' : 'Registration opens soon', href: null };
    case 'registration_closed':
      return { label: ar ? 'التسجيل مقفول' : 'Registration closed', href: null, secondary: { label: ar ? 'حالتي' : 'My entry', href: play } };
    case 'ready':
      return { label: ar ? 'حالتي' : 'My entry', href: play };
    case 'check_in':
      return { label: ar ? 'سجّل حضورك' : 'Check in', href: play };
    case 'live':
      return { label: ar ? 'شاهد الترتيب' : 'View standings', href: play };
    case 'completed':
      return { label: ar ? 'النتائج' : 'Results', href: `/${locale}/tournaments/${slug}` };
    case 'cancelled':
      return { label: ar ? 'البطولة ملغية' : 'Tournament cancelled', href: null };
    case 'suspended':
      return { label: ar ? 'البطولة موقوفة' : 'Tournament suspended', href: null };
    default:
      return { label: ar ? 'التفاصيل' : 'View details', href: `/${locale}/tournaments/${slug}` };
  }
}
