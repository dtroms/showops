'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCurrency } from '@/lib/format'

type DashboardShow = {
  show_id: string
  show_name: string
  show_number: string | null
  start_date: string | null
  end_date: string | null
  estimated_revenue: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
}

type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4'

function getQuarter(dateString: string | null): QuarterKey | null {
  if (!dateString) return null
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return null

  const month = date.getMonth() + 1
  if (month <= 3) return 'Q1'
  if (month <= 6) return 'Q2'
  if (month <= 9) return 'Q3'
  return 'Q4'
}

function getYear(dateString: string | null): string | null {
  if (!dateString) return null
  return dateString.slice(0, 4)
}

export function QuarterlyProfitBreakdown({
  shows,
  compact = false,
}: {
  shows: DashboardShow[]
  compact?: boolean
}) {
  const [selectedYear, setSelectedYear] = useState<string>('all')
  const [selectedQuarter, setSelectedQuarter] = useState<QuarterKey>('Q1')

  const years = useMemo(() => {
    const values = Array.from(
      new Set(
        shows
          .map((show) => getYear(show.start_date))
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => Number(b) - Number(a))

    return values
  }, [shows])

  const filteredShows = useMemo(() => {
    return shows.filter((show) => {
      if (selectedYear === 'all') return true
      return getYear(show.start_date) === selectedYear
    })
  }, [shows, selectedYear])

  const quarterStats = useMemo(() => {
    const base: Record<
      QuarterKey,
      { revenue: number; cost: number; profit: number; count: number }
    > = {
      Q1: { revenue: 0, cost: 0, profit: 0, count: 0 },
      Q2: { revenue: 0, cost: 0, profit: 0, count: 0 },
      Q3: { revenue: 0, cost: 0, profit: 0, count: 0 },
      Q4: { revenue: 0, cost: 0, profit: 0, count: 0 },
    }

    for (const show of filteredShows) {
      const quarter = getQuarter(show.start_date)
      if (!quarter) continue

      base[quarter].revenue += Number(show.estimated_revenue ?? 0)
      base[quarter].cost += Number(show.total_estimated_cost ?? 0)
      base[quarter].profit += Number(show.projected_profit ?? 0)
      base[quarter].count += 1
    }

    return base
  }, [filteredShows])

  const selectedQuarterShows = useMemo(() => {
    return filteredShows.filter((show) => getQuarter(show.start_date) === selectedQuarter)
  }, [filteredShows, selectedQuarter])

  const quarterOrder: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4']

  return (
    <div className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-4' : 'p-6'} space-y-4`}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold tracking-tight`}>
            Profitability by Quarter
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Select a quarter to see included shows.
          </p>
        </div>

        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
        >
          <option value="all">All Years</option>
          {years.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quarterOrder.map((quarter) => {
          const isSelected = selectedQuarter === quarter
          const stats = quarterStats[quarter]

          return (
            <button
              key={quarter}
              type="button"
              onClick={() => setSelectedQuarter(quarter)}
              className={`rounded-xl border p-3 text-left transition ${
                isSelected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
              }`}
            >
              <p className={`text-xs font-semibold uppercase tracking-wide ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {quarter}
              </p>
              <p className="mt-2 text-xl font-semibold">{formatCurrency(stats.profit)}</p>
              <p className={`mt-1 text-xs ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                {stats.count} show{stats.count === 1 ? '' : 's'}
              </p>
            </button>
          )
        })}
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">
            {selectedQuarter} Shows {selectedYear === 'all' ? '' : `• ${selectedYear}`}
          </h3>
          <p className="text-sm text-slate-500">
            {selectedQuarterShows.length} result{selectedQuarterShows.length === 1 ? '' : 's'}
          </p>
        </div>

        {!selectedQuarterShows.length ? (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white p-5 text-sm text-slate-500">
            No shows found for this quarter.
          </div>
        ) : (
          <div className="max-h-[420px] space-y-3 overflow-y-auto pr-1">
            {selectedQuarterShows.map((show) => (
              <div
                key={show.show_id}
                className="rounded-xl border border-slate-200 bg-white p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-slate-900">
                      {show.show_name}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {show.show_number ?? '—'}
                    </p>
                  </div>

                  <Link
                    href={`/shows/${show.show_id}/budget-summary`}
                    className="shrink-0 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                  >
                    View Show Summary
                  </Link>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3">
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Revenue
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatCurrency(show.estimated_revenue)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Cost
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-900">
                      {formatCurrency(show.total_estimated_cost)}
                    </p>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Profit %
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-600">
                      {show.margin_percent ?? '—'}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}