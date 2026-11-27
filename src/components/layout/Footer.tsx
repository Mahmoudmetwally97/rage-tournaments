import type { Locale } from '@/lib/i18n/dictionaries';

export function Footer({ locale }: { locale: Locale }) {
  return (
    <footer className="mt-16 border-t border-[#27272C] bg-[#171719]/60">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-6 text-xs text-[#7A7874] sm:px-6">
        <div>
          RAGE TOURNAMENTS — {locale === 'ar' ? 'منصة مستقلة لإدارة بطولات RAGE' : 'Independent RAGE Esports Platform'}
        </div>
        <div className="flex items-center gap-5 ltr-isolate">
          <a href="https://ragegames.net" target="_blank" rel="noopener noreferrer" className="hover:text-[#F2EFE9]">
            ragegames.net
          </a>
          <a href="https://discord.gg/B3dASq6Mfb" target="_blank" rel="noopener noreferrer" className="hover:text-[#F2EFE9]">
            Discord
          </a>
        </div>
      </div>
    </footer>
  );
}
