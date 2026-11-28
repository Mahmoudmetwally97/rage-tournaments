import { Barlow, Barlow_Condensed, Cairo, Changa } from 'next/font/google';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';

const cairo = Cairo({ subsets: ['arabic', 'latin'], weight: ['400', '600', '700', '800'], variable: '--font-arabic' });
const changa = Changa({ subsets: ['arabic', 'latin'], weight: ['600', '800'], variable: '--font-arabic-display' });
const barlow = Barlow({ subsets: ['latin'], weight: ['400', '500', '600', '700', '800'], variable: '--font-barlow' });
const barlowCondensed = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['600', '700', '800'],
  variable: '--font-barlow-condensed'
});

export default async function LocaleLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  const dict = dictionaries[locale];
  const dir = locale === 'ar' ? 'rtl' : 'ltr';
  const fontClass = [cairo.variable, changa.variable, barlow.variable, barlowCondensed.variable].join(' ');
  const baseFont = locale === 'ar' ? 'font-[family-name:var(--font-arabic)]' : 'font-[family-name:var(--font-barlow)]';

  return (
    <html lang={locale} dir={dir} className={fontClass}>
      <body className={`${baseFont} min-h-screen flex flex-col bg-[#0d0e10] text-[#f4f4ed]`}>
        <Navbar locale={locale} dict={dict} />
        <main className="flex-1">{children}</main>
        <Footer locale={locale} />
      </body>
    </html>
  );
}
