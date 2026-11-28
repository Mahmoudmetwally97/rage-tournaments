import { notFound } from 'next/navigation';
import { isValidLocale } from '@/lib/i18n/dictionaries';
import { SectionHeader } from '@/components/ui/SectionHeader';

export default async function PrivacyPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isValidLocale(locale)) notFound();
  const ar = locale === 'ar';
  const items = ar
    ? [
        'بنجمع بس اللي محتاجينه للتسجيل في البطولات: الإيميل، اسم المستخدم، الـ IGN، وصورة واسم الحساب لو سجلت بـ Google أو Discord.',
        'بنستخدم البيانات دي بس لإدارة حسابك والبطولات والنتائج. مبنبيعش بياناتك ومبنشاركهاش مع حد.',
        'تسجيل الدخول بـ Google أو Discord بيدينا الاسم والإيميل والصورة بس. مبنقدرش نوصل لباقي حسابك.',
        'تقدر تطلب مسح حسابك وبياناتك في أي وقت بالتواصل مع منظمي RAGE.'
      ]
    : [
        'We collect only what tournaments need: email, username, in-game name, and the name and avatar from Google or Discord if you sign in with them.',
        'We use this data only to run your account, tournaments and results. We do not sell it or share it.',
        'Sign in with Google or Discord gives us your name, email and avatar only. We cannot access anything else in your account.',
        'You can ask the RAGE organizers to delete your account and data at any time.'
      ];
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6">
      <SectionHeader title={ar ? 'سياسة الخصوصية' : 'Privacy Policy'} subtitle="RAGE Tournaments" />
      <ul className="space-y-3 text-sm leading-7 text-[#a4a6aa]">
        {items.map((t) => (
          <li key={t} className="clip-card card-surface border border-[#2b2d30] p-4">{t}</li>
        ))}
      </ul>
    </div>
  );
}
