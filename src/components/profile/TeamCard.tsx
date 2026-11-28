import Link from 'next/link';
import { TeamLogo } from '@/components/tournaments/TeamLogo';
import { countryName, flag } from '@/lib/countries';

export interface TeamCardData {
  id: string; name: string; tag: string; logo_url: string | null; cover_url: string | null;
  country: string | null; member_count: number; game_name_en: string; game_name_ar: string; is_captain?: boolean;
}

export function TeamCard({ t, locale }: { t: TeamCardData; locale: string }) {
  const ar = locale === 'ar';
  return (
    <Link href={`/${locale}/teams/${t.id}`} className="clip-card group block overflow-hidden border border-[#2b2d30] bg-[#101113] transition-colors hover:border-[#e5ed43]/60">
      <div className="relative h-24 bg-[#16171a]">
        {t.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.cover_url} alt="" loading="lazy" className="h-full w-full object-cover" />
        ) : (
          <div className="h-full w-full bg-[linear-gradient(135deg,#16171a,#1d1f12)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-[#101113] to-transparent" />
        {t.is_captain && <span className="absolute end-2 top-2 bg-[#e5ed43] px-2 py-0.5 text-[10px] font-extrabold text-[#0d0e10]">{ar ? 'القائد' : 'LEADER'}</span>}
      </div>
      <div className="relative -mt-8 flex items-end gap-3 px-4">
        <div className="rounded-sm border-2 border-[#101113] bg-[#101113]"><TeamLogo src={t.logo_url} tag={t.tag} size={56} /></div>
        <div className="min-w-0 pb-1">
          <p className="truncate text-base font-extrabold text-[#f4f4ed]">{t.name}</p>
          <p className="ltr-isolate text-xs font-bold text-[#e5ed43]">[{t.tag}]</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 px-4 pb-4 pt-3 text-[11px] font-bold text-[#a4a6aa]">
        <span className="border border-[#2b2d30] bg-[#16171a] px-2 py-1">{t.member_count} {ar ? 'عضو' : 'members'}</span>
        <span className="border border-[#2b2d30] bg-[#16171a] px-2 py-1">{ar ? t.game_name_ar : t.game_name_en}</span>
        {t.country && <span className="px-1">{flag(t.country)} {countryName(t.country, locale)}</span>}
        <span className="ms-auto text-[#e5ed43] group-hover:underline">{ar ? 'بروفايل التيم' : 'Team profile'} →</span>
      </div>
    </Link>
  );
}
