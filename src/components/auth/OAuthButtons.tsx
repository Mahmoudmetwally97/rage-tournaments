'use client';

import { useState } from 'react';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

type Provider = 'discord' | 'google';

export function OAuthButtons({ locale }: { locale: string }) {
  const ar = locale === 'ar';
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState('');

  async function go(provider: Provider) {
    const supabase = getSupabaseBrowserClient();
    if (!supabase) return;
    setError('');
    setBusy(provider);
    const { error: e } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/${locale}/auth/callback`,
        scopes: provider === 'discord' ? 'identify email' : undefined
      }
    });
    if (e) {
      setBusy(null);
      setError(ar ? 'الخدمة دي لسه مش متفعلة. جرّب بالإيميل.' : 'This sign-in is not enabled yet. Use email instead.');
    }
  }

  const base =
    'clip-btn flex w-full items-center justify-center gap-2 border px-4 py-3 text-sm font-extrabold transition-colors disabled:opacity-60';
  return (
    <div className="mb-5 space-y-2.5" data-testid="oauth-buttons">
      <button type="button" disabled={!!busy} onClick={() => go('discord')} className={`${base} border-[#5865F2] bg-[#5865F2] text-white hover:bg-[#6b77f5]`}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.3.6a18.3 18.3 0 0 0-6.2 0L8.6 3a19.7 19.7 0 0 0-4.9 1.4C.6 9 0 13.5.3 17.9a20 20 0 0 0 6 3l1.3-2.1c-.7-.3-1.4-.6-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4c-.6.4-1.3.7-2 1l1.3 2.1a20 20 0 0 0 6-3c.4-5.200-.7-9.700-3.400-13.500ZM8.700 15.200c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.100 1.100 2.100 2.400-.9 2.400-2.100 2.400Zm6.600 0c-1.200 0-2.100-1.100-2.100-2.400s.9-2.400 2.100-2.400 2.100 1.100 2.100 2.400-.9 2.400-2.100 2.400Z"/></svg>
        {ar ? 'كمّل بحساب Discord' : 'Continue with Discord'}
      </button>
      <button type="button" disabled={!!busy} onClick={() => go('google')} className={`${base} border-[#2b2d30] bg-[#f4f4ed] text-[#0d0e10] hover:bg-white`}>
        <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden><path fill="#EA4335" d="M24 9.5c3.500 0 6.600 1.200 9.100 3.600l6.800-6.800C35.800 2.400 30.300 0 24 0 14.600 0 6.500 5.400 2.600 13.200l7.900 6.100C12.400 13.600 17.700 9.500 24 9.500z"/><path fill="#4285F4" d="M46.100 24.500c0-1.600-.1-3.100-.4-4.500H24v9h12.400c-.5 2.900-2.200 5.300-4.600 6.900l7.300 5.700c4.300-4 6.800-9.900 7-17.100z"/><path fill="#FBBC05" d="M10.500 28.700A14.500 14.500 0 0 1 9.500 24c0-1.600.3-3.200.8-4.700l-7.900-6.100A24 24 0 0 0 0 24c0 3.900.9 7.500 2.600 10.800l7.900-6.100z"/><path fill="#34A853" d="M24 48c6.500 0 11.900-2.100 15.900-5.800l-7.300-5.700c-2 1.400-4.700 2.300-8.600 2.300-6.300 0-11.600-4.100-13.500-9.800l-7.900 6.100C6.500 42.600 14.600 48 24 48z"/></svg>
        {ar ? 'كمّل بحساب Google' : 'Continue with Google'}
      </button>
      {error && <p className="text-xs font-bold text-[#FCA5A5]">{error}</p>}
      <div className="flex items-center gap-3 pt-1 text-[11px] font-bold text-[#6f7276]">
        <span className="h-px flex-1 bg-[#2b2d30]" />
        {ar ? 'أو بالإيميل' : 'or with email'}
        <span className="h-px flex-1 bg-[#2b2d30]" />
      </div>
    </div>
  );
}
