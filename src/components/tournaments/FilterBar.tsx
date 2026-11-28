'use client';

import type { Dictionary } from '@/lib/i18n/dictionaries';
import { formatLabel } from '@/lib/format';
import { Button } from '@/components/ui/Button';

interface FilterBarProps {
  search: string;
  statusFilter: string;
  typeFilter: string;
  formatFilter: string;
  onSearchChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onTypeChange: (val: string) => void;
  onFormatChange: (val: string) => void;
  onReset: () => void;
  dict: Dictionary;
}

export function FilterBar({
  search,
  statusFilter,
  typeFilter,
  formatFilter,
  onSearchChange,
  onStatusChange,
  onTypeChange,
  onFormatChange,
  onReset,
  dict
}: FilterBarProps) {
  const ar = /[\u0600-\u06FF]/.test(dict.filters.allStatuses);
  const hasActiveFilter = search || statusFilter !== 'all' || typeFilter !== 'all' || formatFilter !== 'all';

  return (
    <div className="mb-6 grid gap-3 rounded-none border border-[#2b2d30] bg-[#151619] p-4 sm:grid-cols-2 lg:grid-cols-12">
      <div className="lg:col-span-4">
        <input
          type="search"
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={dict.filters.searchPlaceholder}
          aria-label={dict.filters.searchPlaceholder}
          className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3.5 py-2.5 text-sm text-[#f4f4ed] placeholder:text-[#6f7276] focus:border-[#e5ed43] focus:outline-none"
        />
      </div>

      <div className="lg:col-span-3">
        <select
          aria-label={dict.filters.allStatuses}
          value={statusFilter}
          onChange={(e) => onStatusChange(e.target.value)}
          className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none"
        >
          <option value="all">{dict.filters.allStatuses}</option>
          <option value="registration_open">{dict.tournament.open}</option>
          <option value="check_in">{dict.tournament.checkIn}</option>
          <option value="live">{dict.tournament.live}</option>
          <option value="completed">{dict.tournament.completed}</option>
        </select>
      </div>

      <div className="lg:col-span-2">
        <select
          aria-label={dict.filters.allTypes}
          value={typeFilter}
          onChange={(e) => onTypeChange(e.target.value)}
          className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none"
        >
          <option value="all">{dict.filters.allTypes}</option>
          <option value="solo">{dict.tournament.solo}</option>
          <option value="team">{dict.tournament.team}</option>
        </select>
      </div>

      <div className="lg:col-span-2">
        <select
          aria-label={dict.filters.allFormats}
          value={formatFilter}
          onChange={(e) => onFormatChange(e.target.value)}
          className="w-full rounded-none border border-[#2b2d30] bg-[#0d0e10] px-3 py-2.5 text-sm text-[#f4f4ed] focus:border-[#e5ed43] focus:outline-none"
        >
          <option value="all">{dict.filters.allFormats}</option>
          <option value="ffa">{formatLabel('ffa', ar)}</option>
          <option value="groups_knockout">{formatLabel('groups_knockout', ar)}</option>
          <option value="points">{formatLabel('points', ar)}</option>
        </select>
      </div>

      <div className="lg:col-span-1 flex items-stretch">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          disabled={!hasActiveFilter}
          onClick={onReset}
          className="w-full"
        >
          {dict.filters.reset}
        </Button>
      </div>
    </div>
  );
}
