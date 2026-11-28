import { inputCls } from '@/components/admin/ui';
import { countryOptions, flag } from '@/lib/countries';
import { tr } from '@/lib/admin';

export function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1 block text-[11px] font-extrabold uppercase tracking-wider text-[#a4a6aa]">{children}</label>;
}

export function CountrySelect({ locale, value }: { locale: string; value?: string | null }) {
  return (
    <select name="country" defaultValue={value ?? ''} className={inputCls}>
      <option value="">{tr(locale, 'اختار البلد', 'Select country')}</option>
      {countryOptions(locale).map((c) => <option key={c.code} value={c.code}>{flag(c.code)} {c.name}</option>)}
    </select>
  );
}

const fileCls = 'w-full text-xs text-[#a8abb0] file:me-2 file:border-0 file:bg-[#2b2d30] file:px-3 file:py-1.5 file:text-[#f4f4ed]';

export function ImageInput({ name, locale, hint }: { name: string; locale: string; hint: string }) {
  return (
    <div>
      <input name={name} type="file" accept="image/png,image/jpeg,image/webp" className={fileCls} />
      <p className="mt-1 text-[11px] text-[#6f7276]">{hint} · {tr(locale, 'JPG / PNG / WebP، لحد 3 ميجا', 'JPG / PNG / WebP, up to 3 MB')}</p>
    </div>
  );
}
