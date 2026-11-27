import { notFound } from 'next/navigation';
import { dictionaries, isValidLocale } from '@/lib/i18n/dictionaries';
import { DemoAuthForm } from '@/components/auth/DemoAuthForm';

export default async function LoginPage({
  params
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();

  return <DemoAuthForm mode="login" locale={locale} dict={dictionaries[locale]} />;
}
