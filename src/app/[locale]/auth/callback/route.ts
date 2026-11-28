import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * OAuth return point. The code is exchanged on the server so the PKCE verifier
 * cookie (set by the browser client before the redirect) is read from the request
 * and the session cookies are written on the redirect response. This avoids the
 * double-exchange race of doing it in the client page.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ locale: string }> }) {
  const { locale: rawLocale } = await params;
  const locale = rawLocale === 'ar' ? 'ar' : 'en';
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const providerErr = searchParams.get('error_description');
  const back = (msg: string) => {
    const r = NextResponse.redirect(`${origin}/${locale}/auth/finish?error_description=${encodeURIComponent(msg)}`);
    return r;
  };
  if (providerErr) return back(providerErr);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return NextResponse.redirect(`${origin}/${locale}/login`);

  const response = NextResponse.redirect(`${origin}/${locale}/auth/finish`);
  if (code) {
    const supabase = createServerClient(url, key, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (list) => list.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
      }
    });
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      const hint = /verifier/i.test(error.message)
        ? (locale === 'ar'
            ? 'افتح الرابط في نفس المتصفح اللي بدأت منه تسجيل الدخول (مش داخل تطبيق تاني) وجرّب تاني.'
            : 'Please finish sign-in in the same browser you started it in (not inside another app) and try again.')
        : error.message;
      return back(hint);
    }
  }
  return response;
}
