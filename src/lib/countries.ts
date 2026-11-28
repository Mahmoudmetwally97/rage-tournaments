export const COUNTRY_CODES = ['EG','SA','AE','KW','QA','BH','OM','JO','LB','SY','IQ','PS','YE','LY','TN','DZ','MA','SD','SO','DJ','MR','KM','TR','IR','US','GB','DE','FR','ES','IT','NL','SE','NO','DK','CA','BR','AR','MX','RU','UA','PL','GR','CY','IN','PK','BD','ID','MY','PH','JP','KR','CN','AU','ZA','NG','KE','ET'] as const;

export function flag(code?: string | null): string {
  if (!code || !/^[A-Z]{2}$/.test(code)) return '';
  return String.fromCodePoint(...code.split('').map((c) => 0x1f1e6 + c.charCodeAt(0) - 65));
}

export function countryName(code: string | null | undefined, locale: string): string {
  if (!code) return '';
  try {
    return new Intl.DisplayNames([locale === 'ar' ? 'ar' : 'en'], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function countryOptions(locale: string): { code: string; name: string }[] {
  return COUNTRY_CODES.map((c) => ({ code: c, name: countryName(c, locale) }));
}
