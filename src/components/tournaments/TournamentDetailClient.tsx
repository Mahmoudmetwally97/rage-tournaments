'use client';

import React, { useState } from 'react';
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

  const formattedDate = new Intl.DateTimeFormat(locale === 'ar' ? 'ar-EG' : 'en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(tournament.startsAtIso));

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
      <section className="relative mb-8 overflow-hidden rounded-2xl border border-[#27272C] bg-[#171719] p-6 sm:p-8 tactical-grid-bg">
        <div className="absolute inset-x-0 top-0 h-1 bg-[#FF6A1A]" />
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusBadge variant="open">{dict.tournament.open}</StatusBadge>
          <StatusBadge>
            {tournament.competitionType === 'solo' ? dict.tournament.solo : dict.tournament.team}
          </StatusBadge>
          <StatusBadge>{dict.tournament.free}</StatusBadge>
          <span className="text-xs font-extrabold text-[#FF6A1A]">{game}</span>
        </div>

        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#F2EFE9] sm:text-4xl">
              {title}
            </h1>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs font-semibold text-[#B5B2AC]">
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

          <Button
            onClick={() => {
              setModalOpen(true);
              setRegCode(null);
              setError('');
            }}
            size="lg"
            className="w-full sm:w-auto"
          >
            {dict.tournament.registerNow}
          </Button>
        </div>
      </section>

      {/* Tabs */}
      <div role="tablist" className="mb-6 flex flex-wrap gap-2 border-b border-[#27272C] pb-3">
        {(Object.keys(dict.tournament.tabs) as TabKey[]).map((key) => (
          <button
            key={key}
            role="tab"
            aria-selected={activeTab === key}
            onClick={() => setActiveTab(key)}
            className={`rounded-lg px-4 py-2 text-sm font-bold transition-colors cursor-pointer ${
              activeTab === key
                ? 'bg-[#FF6A1A] text-[#0B0B0C]'
                : 'bg-[#171719] text-[#B5B2AC] hover:bg-[#202024] hover:text-[#F2EFE9]'
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
        className="rounded-xl border border-[#27272C] bg-[#171719] p-6"
      >
        {activeTab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            <div className="rounded-xl border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-xs text-[#7A7874]">{dict.tournament.game}</div>
              <div className="mt-1 font-extrabold text-[#F2EFE9]">{game}</div>
            </div>
            <div className="rounded-xl border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-xs text-[#7A7874]">{dict.tournament.format}</div>
              <div className="mt-1 font-extrabold text-[#F2EFE9] ltr-isolate">{tournament.formatLabel}</div>
            </div>
            <div className="rounded-xl border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-xs text-[#7A7874]">{dict.tournament.slots}</div>
              <div className="mt-1 font-extrabold text-[#F2EFE9] ltr-isolate">
                {tournament.maxParticipants > 0
                  ? `${tournament.registeredCount} / ${tournament.maxParticipants}`
                  : `${tournament.registeredCount} / ${dict.tournament.unlimited}`}
              </div>
            </div>
            <div className="rounded-xl border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-xs text-[#7A7874]">{dict.tournament.startsAt}</div>
              <div className="mt-1 font-bold text-[#F2EFE9]">{formattedDate}</div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <ul className="list-disc space-y-2.5 ps-5 text-sm leading-relaxed text-[#B5B2AC]">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {tournament.stages.map((st) => (
              <div
                key={st.order}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#27272C] bg-[#0B0B0C] p-4 text-sm"
              >
                <div>
                  <span className="font-extrabold text-[#FF6A1A] ltr-isolate">Stage {st.order}: </span>
                  <span className="font-bold text-[#F2EFE9]">{locale === 'ar' ? st.nameAr : st.nameEn}</span>
                </div>
                <div className="text-xs font-semibold text-[#B5B2AC] ltr-isolate">
                  {st.format} → {st.qualifies}
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
                className="flex items-center justify-between gap-3 rounded-xl border border-[#27272C] bg-[#0B0B0C] p-4"
              >
                <div>
                  <div className="font-extrabold text-[#F2EFE9] ltr-isolate">{p.ign}</div>
                  <div className="mt-0.5 font-mono text-xs font-bold text-[#FFB938] ltr-isolate">{p.code}</div>
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
          <div className="w-full max-w-md rounded-2xl border border-[#27272C] bg-[#171719] p-6">
            <h2 id="reg-modal-title" className="mb-2 text-xl font-extrabold text-[#F2EFE9]">
              {regCode ? dict.tournament.successTitle : dict.tournament.registerModalTitle}
            </h2>

            {regCode ? (
              <div className="space-y-4 py-4 text-center">
                <p className="text-sm text-[#B5B2AC]">{dict.tournament.successCode}</p>
                <div className="rounded-xl border border-dashed border-[#FFB938] bg-[#FFB938]/10 p-4 text-2xl font-extrabold text-[#FFB938] ltr-isolate">
                  {regCode}
                </div>
                <Button onClick={() => setModalOpen(false)} className="w-full">
                  {dict.tournament.close}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="mt-4 space-y-4">
                {error && (
                  <div className="rounded-lg border border-[#EF4444]/40 bg-[#EF4444]/15 p-3 text-xs font-bold text-[#FCA5A5]">
                    {error}
                  </div>
                )}
                <div>
                  <label className="mb-1.5 block text-xs font-bold text-[#B5B2AC]">
                    {dict.tournament.ignLabel}
                  </label>
                  <input
                    type="text"
                    value={ign}
                    onChange={(e) => setIgn(e.target.value)}
                    placeholder="[EG]ProSniper"
                    className="w-full rounded-lg border border-[#27272C] bg-[#0B0B0C] px-3.5 py-2.5 text-sm text-[#F2EFE9] focus:border-[#FF6A1A] focus:outline-none ltr-isolate"
                    required
                  />
                  <p className="mt-1 text-xs text-[#7A7874]">{dict.tournament.ignHelper}</p>
                </div>

                <label className="flex cursor-pointer items-start gap-2.5 text-xs text-[#B5B2AC]">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#FF6A1A]"
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
