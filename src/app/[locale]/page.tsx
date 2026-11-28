import { ParallaxLayer } from '@/components/motion/ParallaxLayer';
import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { getTournaments, pickFeatured } from '@/lib/data/tournament-repo';
import { FeaturedTournament } from '@/components/tournaments/FeaturedTournament';
import { TournamentCard } from '@/components/tournaments/TournamentCard';
import { CountUp } from '@/components/ui/CountUp';
import { SectionHeader } from '@/components/ui/SectionHeader';
import { Reveal } from '@/components/home/Reveal';
import { Countdown } from '@/components/home/Countdown';
import { HeroStage } from '@/components/home/HeroStage';
import { formatStartDate } from '@/lib/format';

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

  const ar = locale === 'ar';
  const totalPlayers = tournaments.reduce((a, x) => a + x.registeredCount, 0);
  const allRows = tournaments.flatMap((x) => x.sampleParticipants);
  const totalKills = allRows.reduce((a, r) => a + r.kills, 0);
  const totalPoints = allRows.reduce((a, r) => a + r.points, 0);
  const headline = ar ? ['ادخل.', 'قاتل.', 'اكسب.'] : ['DROP IN.', 'FRAG OUT.', 'WIN.'];
  const tickerWords: string[] = [];
  for (const x of tournaments) {
    x.sampleParticipants.slice(0, 3).forEach((r, i) => tickerWords.push(`#${i + 1} ${r.ign} · ${r.points} ${ar ? 'نقطة' : 'PTS'}`));
  }
  if (featured?.startsAtIso) tickerWords.push(`${ar ? featured.titleAr : featured.titleEn} · ${formatStartDate(featured.startsAtIso, locale)}`);
  if (tickerWords.length < 4) tickerWords.push(...(ar ? ['سجّل', 'العب', 'اكسب', 'كل كيل بيفرق'] : ['REGISTER', 'DROP IN', 'FRAG OUT', 'EVERY KILL COUNTS']));
  const steps = ar
    ? [['سجّل', 'اعمل حساب وسجّل في البطولة'], ['انتظر الموافقة', 'الإدارة بتراجع طلبك'], ['تشيك إن', 'أكّد حضورك قبل البداية'], ['العب واكسب', 'النقاط = الترتيب + الكيلز']]
    : [['Register', 'Create an account and join'], ['Get approved', 'Admins review your entry'], ['Check in', 'Confirm before kickoff'], ['Play and win', 'Points = placement + kills']];
  const stats: [number, string][] = [[totalPlayers, ar ? 'لاعب مسجّل' : 'PLAYERS'], [tournaments.length, ar ? 'بطولة' : 'TOURNAMENTS'], [totalKills, ar ? 'كيل' : 'KILLS'], [Math.round(totalPoints), ar ? 'نقطة' : 'POINTS']];
  const f = featured;
  const isLive = f?.status === 'live';

  return (
    <div>
      {/* 01 HERO: full-bleed broadcast frame */}
      <section className="hero-full hero-scan">
        <HeroStage className="relative min-h-[88svh] sm:min-h-[80vh]">
          <div className="absolute inset-0 hero-layer">
            <ParallaxLayer className="absolute inset-x-0 -top-12 bottom-0">
              <Image src="/brand/rage-characters.png" alt="" fill priority sizes="100vw" className="object-cover object-[62%_18%] opacity-90" />
            </ParallaxLayer>
          </div>
          <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-[#0d0e10] via-[#0d0e10]/80 to-[#0d0e10]/5" />
          <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-[#0d0e10] to-transparent" />
          <div className="hero-bigslash hidden md:block" aria-hidden />
          <div className="relative mx-auto flex min-h-[88svh] max-w-7xl flex-col justify-end gap-8 px-4 pb-10 pt-24 sm:min-h-[80vh] sm:px-6 lg:flex-row lg:items-end lg:justify-between lg:pb-14">
            <div className="max-w-3xl">
              <p className="eyebrow hero-fade mb-5">{dict.hero.eyebrow}</p>
              <h1 className="hero-huge display-type font-black text-[#f4f4ed]" aria-label={headline.join(' ')}>
                {headline.map((w, i) => (
                  <span key={w} className="hero-word" aria-hidden><span className={i === 2 ? 'text-[#e5ed43]' : ''}>{w}</span></span>
                ))}
              </h1>
              <p className="hero-fade mt-6 max-w-xl text-sm leading-relaxed text-[#c3c5c8] sm:text-base">{dict.hero.subtitle}</p>
              <div className="hero-fade mt-8 flex flex-wrap items-center gap-3">
                <Link href={`/${locale}/tournaments`} className="clip-btn btn-shine btn-mag bg-[#e5ed43] px-9 py-4 text-[13px] font-extrabold uppercase tracking-[0.1em] text-[#121408] hover:bg-[#eef46b]">{dict.hero.ctaPrimary}</Link>
                <Link href={`/${locale}/register`} className="clip-btn btn-mag border border-[#8a8b7b] bg-[#141618]/60 px-9 py-4 text-[13px] font-bold uppercase tracking-[0.1em] text-[#f4f4ed] hover:border-[#e5ed43]">{dict.hero.ctaSecondary}</Link>
              </div>
            </div>
            {f && (
              <Link href={`/${locale}/tournaments/${f.slug}`} className="hero-fade bracket block w-full border border-[#2b2d30] bg-[#0d0e10]/80 p-5 backdrop-blur-sm transition-colors hover:border-[#e5ed43]/60 lg:w-[22rem]">
                <div className="mb-3 flex items-center justify-between text-[10px] font-extrabold tracking-[0.25em] text-[#e5ed43]">
                  <span>{ar ? 'البث المباشر' : 'BROADCAST'}</span>
                  <span className="text-[#6f7276]">{ar ? f.gameAr : f.gameEn}</span>
                </div>
                <div className="mb-4 text-xl font-black text-[#f4f4ed] sm:text-2xl">{ar ? f.titleAr : f.titleEn}</div>
                <Countdown iso={f.startsAtIso} live={isLive} ar={ar} />
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-[11px] font-bold text-[#a4a6aa]"><span>{ar ? 'المسجلين' : 'REGISTERED'}</span><span className="ltr-isolate text-[#f4f4ed]">{f.registeredCount} / {f.maxParticipants || '∞'}</span></div>
                  <div className="h-1.5 bg-[#1b1d20]"><div className="h-full bg-[#e5ed43]" style={{ width: `${f.maxParticipants ? Math.min(100, (f.registeredCount / f.maxParticipants) * 100) : 100}%` }} /></div>
                </div>
              </Link>
            )}
          </div>
        </HeroStage>
      </section>

      {/* Data ticker: real names and times */}
      <div aria-hidden className="ticker border-b border-[#2b2d30] bg-[#101113] py-2.5">
        <div className="ticker-track display-type text-sm font-extrabold uppercase tracking-[0.25em] text-[#e5ed43]/75">
          {Array.from({ length: 2 }).map((_, k) => (
            <span key={k} className="ticker-group">
              {tickerWords.map((w, i) => (<span key={w + i + k} className="ticker-item">{w}<i className="ticker-sep" /></span>))}
            </span>
          ))}
        </div>
      </div>

      {/* Stats band */}
      <section className="band-lime">
        <div className="mx-auto grid max-w-7xl grid-cols-2 px-4 sm:px-6 md:grid-cols-4">
          {stats.map(([v, l], i) => (
            <Reveal key={l} delay={i * 90} className="stat-cell px-3 py-6 sm:py-8">
              <CountUp value={v} className="display-type block text-5xl font-black leading-none sm:text-6xl ltr-isolate" />
              <div className="mt-2 text-[11px] font-extrabold tracking-[0.2em] opacity-70">{l}</div>
            </Reveal>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-20 px-4 py-14 sm:px-6 sm:py-20">
        {f && (
          <Reveal as="section">
            <div className="mb-6 flex items-end gap-4"><span className="sec-no display-type ltr-isolate">01</span><div className="pb-1"><p className="eyebrow">{ar ? 'الأبرز' : 'FEATURED'}</p></div></div>
            <FeaturedTournament tournament={f} locale={locale} dict={dict} />
          </Reveal>
        )}

        <Reveal as="section">
          <div className="mb-6 flex items-end gap-4"><span className="sec-no display-type ltr-isolate">02</span></div>
          <SectionHeader title={dict.home.openTournaments} subtitle={dict.home.openTournamentsSub} actionLabel={dict.home.viewAll} actionHref={`/${locale}/tournaments`} />
          {tournaments.length === 0 ? (
            <div className="clip-card border border-[#2b2d30] bg-[#151619] p-8 text-center">
              <p className="text-base font-extrabold text-[#f4f4ed]">{ar ? 'مفيش بطولات معروضة حاليا' : 'No tournaments are listed right now'}</p>
              <p className="mt-1 text-sm text-[#a4a6aa]">{ar ? 'البطولات الجاية هتظهر هنا أول ما تتفتح. اعمل حساب عشان تكون جاهز.' : 'New tournaments will appear here as soon as they open. Create an account to be ready.'}</p>
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((x, i) => (<Reveal key={x.slug} delay={i * 90}><TournamentCard tournament={x} locale={locale} dict={dict} /></Reveal>))}
            </div>
          )}
        </Reveal>

        <Reveal as="section" className="tl">
          <div className="mb-8 flex items-end gap-4"><span className="sec-no display-type ltr-isolate">03</span><h2 className="pb-1 text-2xl font-black text-[#f4f4ed] sm:text-3xl">{ar ? 'كيف تشارك؟' : 'HOW TO ENTER'}</h2></div>
          <div className="relative space-y-8 ps-14">
            <span className="tl-line" aria-hidden />
            {steps.map(([title, d], i) => (
              <div key={title} className="tl-step relative">
                <span className="absolute -start-14 top-0 flex h-10 w-10 items-center justify-center bg-[#e5ed43] text-sm font-black text-[#121408] ltr-isolate" style={{ clipPath: 'polygon(20% 0, 100% 0, 80% 100%, 0 100%)' }}>{i + 1}</span>
                <h3 className="text-xl font-extrabold text-[#f4f4ed]">{title}</h3>
                <p className="mt-1 text-sm text-[#a4a6aa]">{d}</p>
              </div>
            ))}
          </div>
        </Reveal>
      </div>
    </div>
  );
}
