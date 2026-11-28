'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import { ensureProfile } from '@/lib/supabase/ensure-profile';

export default function AuthFinish() {
  const { locale } = useParams<{ locale: string }>();
  const router = useRouter();
  const sp = useSearchParams();
  const [err, setErr] = useState('');
  const ar = locale === 'ar';

  useEffect(() => {
    (async () => {
      const supabase = getSupabaseBrowserClient();
      if (!supabase) return router.replace(`/${locale}/login`);
      const providerErr = sp.get('error_description');
      if (providerErr) return setErr(providerErr);
      const { data } = await supabase.auth.getUser();
      if (!data.user) return setErr(ar ? 'تعذر تسجيل الدخول. جرّب تاني.' : 'Sign-in failed. Please try again.');
      await ensureProfile(supabase, data.user, locale);
      router.replace(`/${locale}/dashboard`);
    })();
  }, [locale, router, sp, ar]);

  return (
    <div className="mx-auto max-w-md px-4 py-24 text-center">
      {err ? (
        <>
          <p className="text-sm font-bold text-[#FCA5A5]">{err}</p>
          <a className="mt-4 inline-block text-sm font-extrabold text-[#e5ed43] underline" href={`/${locale}/login`}>{ar ? 'رجوع لتسجيل الدخول' : 'Back to login'}</a>
        </>
      ) : (
        <p className="text-sm font-bold text-[#a4a6aa]">{ar ? 'جاري تسجيل الدخول...' : 'Signing you in...'}</p>
      )}
    </div>
  );
}
