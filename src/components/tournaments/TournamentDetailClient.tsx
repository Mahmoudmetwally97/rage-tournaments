'use client';

import React, { useState } from 'react';
import { formatStartDate, ctaFor, ctaHref, formatLabel, qualifiesLabel } from '@/lib/format';
import type { DemoTournament } from '@/lib/data/demo-tournaments';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LeaderboardTable } from '@/components/tournaments/LeaderboardTable';

interface Props {
  tournament: DemoTournament;
  locale: Locale;
  dict: Dictionary;
}

import { BracketTree } from './BracketTree';
type TabKey = 'overview' | 'rules' | 'schedule' | 'participants' | 'leaderboard';

export function TournamentDetailClient({ tournament, locale, dict }: Props) {
  const [activeTab, setActiveTab] = useState<TabKey>('overview');
  const [modalOpen, setModalOpen] = useState(false);
  const [ign, setIgn] = useState('');
  const [agreed, setAgreed] = useState(false);
  const [error, setError] = useState('');
  const [regCode, setRegCode] = useState<string | null>(null);

  const title = locale === 'ar' ? tournament.titleAr : tournament.titleEn;
  const game = locale === 'ar' ? tournament.gameAr : tournament.gameEn;
  const rules = locale === 'ar' ? tournament.rulesAr : tournament.rulesEn;

  const formattedDate = formatStartDate(tournament.startsAtIso, locale);

  function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (ign.trim().length < 2) {
      setError(locale === 'ar' ? 'برجاء كتابة اسمك داخل اللعبة (IGN)' : 'Please enter a valid IGN');
      return;
    }
    if (!agreed) {
      setError(locale === 'ar' ? 'يجب الموافقة على القوانين' : 'You must accept the tournament rules');
      return;
    }
    const randomCode = `RAGE-${Math.floor(1000 + Math.random() * 9000)}`;
    setRegCode(randomCode);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      {/* Tournament Cover / Hero */}
      <section className="clip-card hero-slash relative mb-8 overflow-hidden rounded-none bg-[#0d0e10] p-6 sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/rage-characters.png" alt="" className="absolute inset-0 h-full w-full object-cover object-[62%_18%] opacity-70" />
        <div className="absolute inset-0 ltr:bg-gradient-to-r rtl:bg-gradient-to-l from-[#0d0e10] via-[#0d0e10]/85 to-[#0d0e10]/10" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0e10] via-[#0d0e10]/80 to-transparent sm:hidden" />
        <div className="absolute inset-x-0 top-0 h-1 bg-[#e5ed43]" />
        <div className="relative">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge
            variant={tournament.status === 'live' ? 'live' : tournament.status === 'check_in' ? 'warning' : tournament.status === 'registration_open' ? 'open' : 'neutral'}
            pulse={tournament.status === 'live'}
          >
            {tournament.status === 'live' ? dict.tournament.live : tournament.status === 'check_in' ? dict.tournament.checkIn : tournament.status === 'registration_open' ? dict.tournament.open : dict.tournament.completed}
          </StatusBadge>
          <StatusBadge>
            {tournament.competitionType === 'solo' ? dict.tournament.solo : dict.tournament.team}
          </StatusBadge>
          <StatusBadge>{dict.tournament.free}</StatusBadge>
          <span className="text-xs font-extrabold text-[#e5ed43]">{game}</span>
        </div>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight text-[#f4f4ed] sm:text-6xl">
              {title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#a4a6aa]">
              <span className="ltr-isolate">{tournament.formatLabel}</span>
              <span>•</span>
              <span>{formattedDate}</span>
              <span>•</span>
              <span className="ltr-isolate">
                {tournament.maxParticipants > 0
                  ? `${tournament.registeredCount} / ${tournament.maxParticipants}`
                  : `${tournament.registeredCount} / ${dict.tournament.unlimited}`}
              </span>
            </div>
          </div>

          <a
            href={ctaHref(tournament.status, locale, tournament.slug)}
            className="clip-btn btn-shine inline-flex w-full items-center justify-center bg-[#e5ed43] px-8 py-3.5 text-base font-extrabold text-[#0d0e10] sm:w-auto"
          >
            {ctaFor(tournament.status, locale === 'ar')}
          </a>
        </div>
      </div>
      </section>

      {/* Tabs */}
      <div role="tablist" className="mb-6 flex flex-wrap gap-2 border-b border-[#2b2d30] pb-3">
        {(Object.keys(dict.tournament.tabs) as TabKey[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`rounded-none px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === key
                ? 'bg-[#e5ed43] text-[#0d0e10]'
                : 'bg-[#151619] text-[#a4a6aa] hover:bg-[#1b1d20] hover:text-[#f4f4ed]'
            }`}
          >
            {dict.tournament.tabs[key]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <section
        role="tabpanel"
        id={`tabpanel-${activeTab}`}
        aria-labelledby={`tab-${activeTab}`}
        className="rounded-none border border-[#2b2d30] bg-[#151619] p-6"
      >
        {activeTab === 'overview' && (<div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-none border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs text-[#6f7276]">{dict.tournament.game}</div>
              <div className="mt-1 font-extrabold text-[#f4f4ed]">{game}</div>
            </div>
            <div className="rounded-none border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs text-[#6f7276]">{dict.tournament.format}</div>
              <div className="mt-1 font-extrabold text-[#f4f4ed] ltr-isolate">{tournament.formatLabel}</div>
            </div>
            <div className="rounded-none border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs text-[#6f7276]">{dict.tournament.slots}</div>
              <div className="mt-1 font-extrabold text-[#f4f4ed] ltr-isolate">
                {tournament.maxParticipants > 0
                  ? `${tournament.registeredCount} / ${tournament.maxParticipants}`
                  : `${tournament.registeredCount} / ${dict.tournament.unlimited}`}
              </div>
            </div>
            <div className="rounded-none border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs text-[#6f7276]">{dict.tournament.startsAt}</div>
              <div className="mt-1 font-bold text-[#f4f4ed]">{formattedDate}</div>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <div className="clip-card border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs font-extrabold tracking-widest text-[#e5ed43]">{locale === 'ar' ? 'التسجيل' : 'REGISTRATION'}</div>
              <div className="mt-2 text-sm font-bold text-[#f4f4ed] ltr-isolate">{tournament.registeredCount} / {tournament.maxParticipants || '∞'}</div>
              <div className="mt-2 h-2 w-full bg-[#23252a]"><div className="h-full bg-[#e5ed43]" style={{ width: `${tournament.maxParticipants ? Math.min(100, (100 * tournament.registeredCount) / tournament.maxParticipants) : 0}%` }} /></div>
            </div>
            <div className="clip-card border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs font-extrabold tracking-widest text-[#e5ed43]">{locale === 'ar' ? 'الجوائز' : 'PRIZES'}</div>
              <p className="mt-2 text-sm text-[#a4a6aa]">{(locale === 'ar' ? tournament.prizeConfirmedAr : tournament.prizeConfirmedEn) || (locale === 'ar' ? 'الجوائز تُعلن لاحقاً' : 'Prizes to be announced')}</p>
            </div>
            <div className="clip-card border border-[#2b2d30] bg-[#0d0e10] p-4">
              <div className="text-xs font-extrabold tracking-widest text-[#e5ed43]">{locale === 'ar' ? 'القواعد والتواصل' : 'RULES AND CONTACT'}</div>
              <p className="mt-2 text-sm text-[#a4a6aa]">{locale === 'ar' ? 'اقرأ القواعد كاملة في تبويب القواعد.' : 'Read the full rules in the Rules tab.'}</p>
              <a href="https://discord.gg/kByUSDBPF" target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-extrabold text-[#e5ed43] underline">RAGE Discord</a>
            </div>
          </div>
          <div>
            <div className="mb-3 text-xs font-extrabold tracking-widest text-[#e5ed43]">{locale === 'ar' ? 'مسار البطولة' : 'TOURNAMENT PATH'}</div>
            <BracketTree stages={tournament.stages} locale={locale} />
          </div></div>
        )}

        {activeTab === 'rules' && (
          <ul className="list-disc space-y-2.5 ps-5 text-sm leading-relaxed text-[#a4a6aa]">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-3">
            <BracketTree stages={tournament.stages} locale={locale} />
            {tournament.stages.map((st) => (
              <div
                key={st.order}
                className="flex flex-wrap items-center justify-between gap-2 rounded-none border border-[#2b2d30] bg-[#0d0e10] p-4 text-sm"
              >
                <div>
                  <span className="font-extrabold text-[#e5ed43] ltr-isolate">Stage {st.order}: </span>
                  <span className="font-bold text-[#f4f4ed]">{locale === 'ar' ? st.nameAr : st.nameEn}</span>
                </div>
                <div className="text-xs font-semibold text-[#a4a6aa] ltr-isolate">
                  {formatLabel(st.format, locale === 'ar')} → {qualifiesLabel(st.qualifies, locale === 'ar')}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'participants' && (
          <div className="grid gap-3 sm:grid-cols-2">
            {tournament.sampleParticipants.map((p) => (
              <div
                key={p.code}
                className="flex items-center justify-between gap-3 rounded-none border border-[#2b2d30] bg-[#0d0e10] p-4"
              >
                <div>
                  <div className="font-extrabold text-[#f4f4ed] ltr-isolate">{p.ign}</div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-[#a4a6aa] ltr-isolate">{p.code}</div>
                </div>
                <StatusBadge variant={p.status === 'checked_in' ? 'open' : 'neutral'}>
                  {p.status === 'checked_in'
                    ? locale === 'ar'
                      ? 'تم التحضير'
                      : 'Checked In'
                    : locale === 'ar'
                    ? 'مؤكد'
                    : 'Confirmed'}
                </StatusBadge>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardTable rows={tournament.sampleParticipants} dict={dict} locale={locale} />
        )}
      </section>

      {/* Progressive Profiling Registration Modal */}
      {modalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reg-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
        >
          <div className="w-full max-w-md rounded-none border border-[#2b2d30] bg-[#151619] p-6">
            <h2 id="reg-modal-title" className="mb-2 text-xl font-extrabold text-[#f4f4ed]">
              {regCode ? dict.tournament.successTitle : dict.tournament.registerModalTitle}
            </h2>

            {regCode ? (
              <div className="space-y-4 py-4 text-center">
                <p className="text-sm text-[#a4a6aa]">{dict.tournament.successCode}</p>
                <div className="rounded-none border border-dashed border-[#FFB938] bg-[#FFB938]/10 p-4 text-2xl font-extrabold text-[#FFB938] ltr-isolate">
                  {regCode}
                </div>
                <Button onClick={() => setModalOpen(false)} className="w-full">
                  {dict.tournament.close}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="mt-4 space-y-4">
                {error && (
                  <div className="rounded-none border border-[#EF4444]/40 bg-[#EF4444]/15 p-3 text-xs font-bold text-[#FCA5A5]">
                    {error}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#a4a6aa]">
                    {dict.tournament.ignLabel}
                  </label>
                  <input
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder="[EG]ProSniper"
                    className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3.5 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none ltr-isolate"
                    required
                  />
                  <p className="mt-1 text-xs text-[#6f7276]">{dict.tournament.ignHelper}</p>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#a4a6aa]">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#e5ed43]"
                  />
                  <span>{dict.tournament.agreeRules}</span>
                </label>

                <div className="flex gap-2.5">
                  <Button type="submit" className="flex-1">
                    {dict.tournament.confirmSubmit}
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setModalOpen(false)}>
                    {dict.tournament.cancel}
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
