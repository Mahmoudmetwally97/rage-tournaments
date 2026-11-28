export function formatStartDate(iso: string, locale: string): string {
  if (!iso) return locale === 'ar' ? 'يُعلن لاحقاً' : 'TBD';
  return new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Africa/Cairo'
  }).format(new Date(iso));
}
