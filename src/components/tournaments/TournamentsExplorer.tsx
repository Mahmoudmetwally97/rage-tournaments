'use client';

import React, { useMemo, useState } from 'react';
import type { DemoTournament } from '@/lib/data/demo-tournaments';
import type { Dictionary, Locale } from '@/lib/i18n/dictionaries';
import { FilterBar } from './FilterBar';
import { TournamentCard } from './TournamentCard';
import { EmptyState } from '@/components/ui/EmptyState';

interface TournamentsExplorerProps {
  tournaments: readonly DemoTournament[];
  locale: Locale;
  dict: Dictionary;
}

export function TournamentsExplorer({ tournaments, locale, dict }: TournamentsExplorerProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [formatFilter, setFormatFilter] = useState('all');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tournaments.filter((t) => {
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.competitionType !== typeFilter) return false;
      if (formatFilter !== 'all' && t.formatKey !== formatFilter) return false;
      if (!q) return true;
      return (
        t.titleAr.toLowerCase().includes(q) ||
        t.titleEn.toLowerCase().includes(q) ||
        t.formatLabel.toLowerCase().includes(q)
      );
    });
  }, [tournaments, search, statusFilter, typeFilter, formatFilter]);

  function resetFilters() {
    setSearch('');
    setStatusFilter('all');
    setTypeFilter('all');
    setFormatFilter('all');
  }

  return (
    <div>
      <FilterBar
        search={search}
        statusFilter={statusFilter}
        typeFilter={typeFilter}
        formatFilter={formatFilter}
        onSearchChange={setSearch}
        onStatusChange={setStatusFilter}
        onTypeChange={setTypeFilter}
        onFormatChange={setFormatFilter}
        onReset={resetFilters}
        dict={dict}
      />

      {filtered.length === 0 ? (
        <EmptyState
          title={dict.filters.emptyTitle}
          description={dict.filters.emptyDesc}
          actionLabel={dict.filters.reset}
          onAction={resetFilters}
        />
      ) : (
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((t) => (
            <TournamentCard key={t.slug} tournament={t} locale={locale} dict={dict} />
          ))}
        </div>
      )}
    </div>
  );
}
