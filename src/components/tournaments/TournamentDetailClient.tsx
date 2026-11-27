'use client';

import React, { useState } from 'react';
import type { DemoTournament } from '@/lib/data/demo-tournaments';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';

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
    <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
      {/* Header */}
      <section className="mb-6 rounded-2xl border border-[#27272C] bg-[#171719] p-6">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <Badge variant="open">{dict.tournament.open}</Badge>
          <Badge>{tournament.competitionType === 'solo' ? dict.tournament.solo : dict.tournament.team}</Badge>
          <Badge>{dict.tournament.free}</Badge>
          <span className="text-xs font-bold text-[#FF6A1A]">{game}</span>
        </div>

        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-2xl font-extrabold text-[#F2EFE9] sm:text-3xl">{title}</h1>
            <p className="mt-1 text-sm text-[#B5B2AC] ltr-isolate">{tournament.formatLabel}</p>
          </div>
          <Button onClick={() => { setModalOpen(true); setRegCode(null); setError(''); }} size="lg">
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
                : 'bg-[#171719] text-[#B5B2AC] hover:text-[#F2EFE9]'
            }`}
          >
            {dict.tournament.tabs[key]}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <section className="rounded-xl border border-[#27272C] bg-[#171719] p-6">
        {activeTab === 'overview' && (
          <div className="grid gap-4 sm:grid-cols-3 text-sm">
            <div className="rounded-lg border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-[#7A7874]">{dict.tournament.slots}</div>
              <div className="mt-1 text-lg font-extrabold ltr-isolate">
                {tournament.maxParticipants > 0
                  ? `${tournament.registeredCount} / ${tournament.maxParticipants}`
                  : `${tournament.registeredCount} / ${dict.tournament.unlimited}`}
              </div>
            </div>
            <div className="rounded-lg border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-[#7A7874]">{dict.tournament.startsAt}</div>
              <div className="mt-1 text-base font-bold ltr-isolate">{tournament.startsAtIso}</div>
            </div>
            <div className="rounded-lg border border-[#27272C] bg-[#0B0B0C] p-4">
              <div className="text-[#7A7874]">{dict.tournament.free}</div>
              <div className="mt-1 text-base font-bold text-[#10B981]">Free Entry</div>
            </div>
          </div>
        )}

        {activeTab === 'rules' && (
          <ul className="list-disc space-y-2 ps-5 text-sm text-[#B5B2AC]">
            {rules.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        )}

        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {tournament.stages.map((st) => (
              <div key={st.order} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#27272C] bg-[#0B0B0C] p-4 text-sm">
                <div>
                  <span className="font-extrabold text-[#FF6A1A] ltr-isolate">Stage {st.order}: </span>
                  <span className="font-bold">{locale === 'ar' ? st.nameAr : st.nameEn}</span>
                </div>
                <div className="text-xs text-[#B5B2AC] ltr-isolate">
                  {st.format} → {st.qualifies}
                </div>
              </div>
            ))}
          </div>
        )}

        {(activeTab === 'participants' || activeTab === 'leaderboard') && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#27272C] text-start text-xs text-[#7A7874]">
                  <th className="py-2.5 px-3 text-start">#</th>
                  <th className="py-2.5 px-3 text-start">Code</th>
                  <th className="py-2.5 px-3 text-start">IGN</th>
                  <th className="py-2.5 px-3 text-start">Points</th>
                  <th className="py-2.5 px-3 text-start">Kills</th>
                </tr>
              </thead>
              <tbody>
                {tournament.sampleParticipants.map((p, idx) => (
                  <tr key={p.code} className="border-b border-[#27272C]/60">
                    <td className="py-2.5 px-3 ltr-isolate">{idx + 1}</td>
                    <td className="py-2.5 px-3 font-bold text-[#FFB938] ltr-isolate">{p.code}</td>
                    <td className="py-2.5 px-3 font-bold ltr-isolate">{p.ign}</td>
                    <td className="py-2.5 px-3 ltr-isolate">{p.points}</td>
                    <td className="py-2.5 px-3 ltr-isolate">{p.kills}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Progressive Profiling Registration Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
          <div className="w-full max-w-md rounded-2xl border border-[#27272C] bg-[#171719] p-6">
            <h2 className="mb-2 text-xl font-extrabold text-[#F2EFE9]">
              {regCode ? dict.tournament.successTitle : dict.tournament.registerModalTitle}
            </h2>

            {regCode ? (
              <div className="space-y-4 text-center py-4">
                <p className="text-sm text-[#B5B2AC]">{dict.tournament.successCode}</p>
                <div className="rounded-xl border border-dashed border-[#FFB938] bg-[#FFB938]/10 p-4 text-2xl font-extrabold text-[#FFB938] ltr-isolate">
                  {regCode}
                </div>
                <Button onClick={() => setModalOpen(false)} className="w-full">
                  {dict.tournament.cancel}
                </Button>
              </div>
            ) : (
              <form onSubmit={handleRegister} className="space-y-4 mt-4">
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

                <label className="flex items-start gap-2.5 text-xs text-[#B5B2AC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={agreed}
                    onChange={(e) => setAgreed(e.target.checked)}
                    className="mt-0.5 accent-[#FF6A1A]"
                  />
                  <span>{dict.tournament.agreeRules}</span>
                </label>

                <div className="flex gap-2.5">
                  <Button type="submit" className="flex-1">{dict.tournament.confirmSubmit}</Button>
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
