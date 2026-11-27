import Link from 'next/link';
import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { Button } from '@/components/ui/Button';

export default async function RegisterPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const dict = dictionaries[locale];

  return (
    <div className="mx-auto max-w-md px-4 py-14">
      <div className="rounded-2xl border border-[#27272C] bg-[#171719] p-7">
        <h1 className="mb-2 text-2xl font-extrabold text-[#F2EFE9]">{dict.auth.signupTitle}</h1>
        <p className="mb-6 text-xs text-[#B5B2AC] leading-relaxed">{dict.auth.signupSubtitle}</p>

        <form className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#B5B2AC]">{dict.auth.username}</label>
            <input
              type="text"
              required
              placeholder="ProSniper"
              className="w-full rounded-lg border border-[#27272C] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#FF6A1A] focus:outline-none ltr-isolate"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#B5B2AC]">{dict.auth.email}</label>
            <input
              type="email"
              required
              placeholder="player@ragegames.net"
              className="w-full rounded-lg border border-[#27272C] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#FF6A1A] focus:outline-none ltr-isolate"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#B5B2AC]">{dict.auth.password}</label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              className="w-full rounded-lg border border-[#27272C] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#FF6A1A] focus:outline-none ltr-isolate"
            />
          </div>
          <Button type="submit" className="w-full">{dict.auth.signupBtn}</Button>
        </form>

        <p className="mt-5 text-center text-xs text-[#B5B2AC]">
          {dict.auth.hasAccount}{' '}
          <Link href={`/${locale}/login`} className="font-bold text-[#FF6A1A] hover:underline">
            {dict.nav.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
