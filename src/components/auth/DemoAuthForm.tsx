'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { Button } from '@/components/ui/Button';

interface DemoAuthFormProps {
  mode: 'login' | 'register';
  locale: Locale;
  dict: Dictionary;
}

export function DemoAuthForm({ mode, locale, dict }: DemoAuthFormProps) {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (mode === 'register' && username.trim().length < 2) {
      setError(locale === 'ar' ? 'اسم المستخدم يجب أن يكون حرفين على الأقل.' : 'Username must be at least 2 characters.');
      return;
    }
    if (!email.includes('@')) {
      setError(locale === 'ar' ? 'برجاء إدخال بريد إلكتروني صحيح.' : 'Please enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError(locale === 'ar' ? 'كلمة المرور يجب أن تكون 8 أحرف على الأقل.' : 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    const demoUser = {
      username: mode === 'register' ? username.trim() : email.split('@')[0] || 'Player',
      email: email.trim(),
      isDemoSession: true
    };
    localStorage.setItem('rage_demo_user', JSON.stringify(demoUser));
    window.dispatchEvent(new Event('rage-demo-auth-change'));
    router.push(`/${locale}/dashboard`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <div className="rounded-none border border-[#2b2d30] bg-[#151619] p-7">
        <div className="mb-5 flex items-center justify-between">
          <Image
            src="/brand/logo-rage-fire.png"
            alt="RAGE"
            width={100}
            height={28}
            className="h-6 w-auto"
          />
          <span className="rounded-full border border-[#F59E0B]/35 bg-[#F59E0B]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#FCD34D]">
            {locale === 'ar' ? 'معاينة Demo' : 'Demo Auth'}
          </span>
        </div>

        <h1 className="mb-1.5 text-2xl font-extrabold text-[#f4f4ed]">
          {mode === 'login' ? dict.auth.loginTitle : dict.auth.signupTitle}
        </h1>
        <p className="mb-5 text-xs leading-relaxed text-[#a4a6aa]">
          {mode === 'login' ? dict.auth.loginSubtitle : dict.auth.signupSubtitle}
        </p>

        {mode === 'register' && (
          <div className="mb-6 grid grid-cols-3 gap-2">
            {dict.auth.steps.map((step, i) => (
              <div
                key={step}
                className={`rounded-none border p-2 text-center text-[11px] font-bold ${
                  i === 0
                    ? 'border-[#e5ed43]/50 bg-[#e5ed43]/15 text-[#e5ed43]'
                    : 'border-[#2b2d30] bg-[#0d0e10] text-[#6f7276]'
                }`}
              >
                <span className="ltr-isolate">{i + 1}.</span> {step}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-none border border-[#EF4444]/40 bg-[#EF4444]/15 p-3 text-xs font-bold text-[#FCA5A5]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'register' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-[#a4a6aa]">{dict.auth.username}</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="ProSniper"
                className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3.5 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none ltr-isolate"
              />
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#a4a6aa]">{dict.auth.email}</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="player@ragegames.net"
              className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3.5 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none ltr-isolate"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-[#a4a6aa]">{dict.auth.password}</label>
            <input
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3.5 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none ltr-isolate"
            />
          </div>

          <Button type="submit" loading={loading} className="w-full">
            {mode === 'login' ? dict.auth.loginBtn : dict.auth.signupBtn}
          </Button>
        </form>

        <p className="mt-5 text-center text-xs text-[#a4a6aa]">
          {mode === 'login' ? dict.auth.noAccount : dict.auth.hasAccount}{' '}
          <Link
            href={`/${locale}/${mode === 'login' ? 'register' : 'login'}`}
            className="font-bold text-[#e5ed43] hover:underline"
          >
            {mode === 'login' ? dict.nav.signup : dict.nav.login}
          </Link>
        </p>
      </div>
    </div>
  );
}
