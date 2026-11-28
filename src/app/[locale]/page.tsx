import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getTournaments, pickFeatured } from '@/lib/data/tournament-repo';
import { FeaturedTournament } from '@/components/tournaments/FeaturedTournament';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { CountUp } from '@/components/ui/CountUp';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default async function HomePage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  const { items: tournaments, source } = await getTournaments();
  const featured = pickFeatured(tournaments);

  return (
    <div className="mx-auto max-w-7xl space-y-12 px-4 py-8 sm:px-6 sm:py-10">
      {/* Brand hero: RAGE character art + condensed display type (design source: ragegames.net) */}
      <section className="clip-card hero-slash relative min-h-[420px] overflow-hidden border border-[#2b2d30] bg-[#0d0e10]">
        <Image
          src="/brand/rage-characters.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="hero-art object-cover object-[62%_18%] opacity-95"
        />
        <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-[#0d0e10] via-[#0d0e10]/85 to-[#0d0e10]/10" />
        <div className="relative p-6 sm:p-12 lg:p-16">
          <div className="stagger max-w-2xl">
            <p className="eyebrow mb-5">
              {dict.hero.eyebrow}

            </p>
            <h1 className="rage-title mb-5 text-4xl font-extrabold leading-[0.95] tracking-tight text-[#f4f4ed] sm:text-6xl lg:text-7xl">
              {dict.hero.title}
            </h1>
            <p className="mb-8 max-w-xl text-sm leading-relaxed text-[#a4a6aa] sm:text-base">
              {dict.hero.subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                href={`/${locale}/tournaments`}
                className="clip-btn btn-shine bg-[#e5ed43] px-8 py-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#121408] transition-colors hover:bg-[#eef46b]"
              >
                {dict.hero.ctaPrimary}
              </Link>
              <Link
                href={`/${locale}/register`}
                className="clip-btn border border-[#8a8b7b] bg-[#141618]/60 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.08em] text-[#f4f4ed] transition-colors hover:border-[#a4a6aa]"
              >
                {dict.hero.ctaSecondary}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker strip */}
      <div aria-hidden className="ticker clip-btn border border-[#2b2d30] bg-[#101113] py-2">
        <div className="ticker-track display-type text-sm font-extrabold uppercase tracking-[0.3em] text-[#e5ed43]/70">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="ticker-group">
              {(locale === 'ar' ? [featured?.titleAr ?? 'راج', 'سجّل', 'العب', 'اكسب', 'كل كيل بيفرق'] : [(featured?.titleEn ?? 'RAGE TOURNAMENTS').toUpperCase(), 'REGISTER', 'DROP IN', 'FRAG OUT', 'EVERY KILL COUNTS']).map((w) => (
                <span key={w + k} className="ticker-item">{w}<i className="ticker-sep" /></span>
              ))}
            </span>
          ))}
        </div>
      </div>

      {/* Featured Tournament */}
      {featured && (
        <section className="reveal">
          <FeaturedTournament tournament={featured} locale={locale} dict={dict} />
        </section>
      )}

      {/* Open & Upcoming Tournaments */}
      <section className="reveal">
        <SectionHeader
          title={dict.home.openTournaments}
          subtitle={dict.home.openTournamentsSub}
          actionLabel={dict.home.viewAll}
          actionHref={`/${locale}/tournaments`}
        />
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {tournaments.map((t) => (
            <TournamentCard key={t.slug} tournament={t} locale={locale} dict={dict} />
          ))}
        </div>
      </section>

      {/* How it works (replaces demo match/leaderboard data until real results exist) */}
      <section className="reveal">
        <h2 className="mb-5 text-2xl font-extrabold text-[#f4f4ed]">{locale === 'ar' ? 'كيف تشارك؟' : 'How it works'}</h2>
        <div className="grid gap-4 md:grid-cols-4">
          {(locale === 'ar'
            ? [['سجّل', 'اعمل حساب وسجّل في البطولة'], ['انتظر الموافقة', 'الإدارة بتراجع طلبك'], ['تشيك إن', 'أكّد حضورك قبل البداية'], ['العب واكسب', 'النقاط = الترتيب + الكيلز']]
            : [['Register', 'Create an account and join'], ['Get approved', 'Admins review your entry'], ['Check in', 'Confirm before kickoff'], ['Play and win', 'Points = placement + kills']]
          ).map(([t, d], i) => (
            <div key={t} className="clip-card card-surface card-hover relative border border-[#2b2d30] bg-[#151619] p-5">
              <CountUp value={i + 1} className="display-type step-num text-5xl font-extrabold text-[#e5ed43]/25" />
              <h3 className="mt-2 text-lg font-bold text-[#f4f4ed]">{t}</h3>
              <p className="mt-1 text-sm text-[#a4a6aa]">{d}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
