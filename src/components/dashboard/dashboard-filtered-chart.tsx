'use client'

import { useMemo } from 'react'
import { formatCurrency, formatShortDate } from '@/lib/format'

type DashboardShow = {
  show_id: string
  show_name: string
  start_date: string | null
  estimated_revenue: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
}

type Range = 'week' | 'month' | 'quarter' | 'year'

function getRangeLabel(range: Range) {
  switch (range) {
    case 'week':
      return 'Past Week'
    case 'month':
      return 'Past Month'
    case 'quarter':
      return 'Past Quarter'
    case 'year':
      return 'Past Year'
  }
}

export function DashboardFilteredChart({
  shows,
  range,
  onRangeChange,
  compact = false,
}: {
  shows: DashboardShow[]
  range: Range
  onRangeChange: (range: Range) => void
  compact?: boolean
}) {
  const filtered = useMemo(() => {
    const now = new Date()
    const cutoff = new Date()

    if (range === 'week') cutoff.setDate(now.getDate() - 7)
    if (range === 'month') cutoff.setMonth(now.getMonth() - 1)
    if (range === 'quarter') cutoff.setMonth(now.getMonth() - 3)
    if (range === 'year') cutoff.setFullYear(now.getFullYear() - 1)

    return shows.filter((show) => {
      if (!show.start_date) return false
      const date = new Date(`${show.start_date}T00:00:00`)
      return date >= cutoff
    })
  }, [shows, range])

  const revenue = filtered.reduce((sum, show) => sum + Number(show.estimated_revenue ?? 0), 0)
  const cost = filtered.reduce((sum, show) => sum + Number(show.total_estimated_cost ?? 0), 0)
  const profit = filtered.reduce((sum, show) => sum + Number(show.projected_profit ?? 0), 0)

  const maxValue = Math.max(revenue, cost, profit, 1)

  return (
    <div className={`rounded-[28px] border border-white/10 bg-white/[0.03] ${compact ? 'p-4' : 'p-6'}`}>
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className={`${compact ? 'text-lg' : 'text-xl'} font-semibold tracking-tight text-white`}>
            Profit vs Expense
          </h2>
          <p className="mt-1 text-sm text-slate-400">{getRangeLabel(range)}</p>
        </div>

        <select
          value={range}
          onChange={(e) => onRangeChange(e.target.value as Range)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
        >
          <option value="week" className="bg-slate-900 text-white">Past Week</option>
          <option value="month" className="bg-slate-900 text-white">Past Month</option>
          <option value="quarter" className="bg-slate-900 text-white">Past Quarter</option>
          <option value="year" className="bg-slate-900 text-white">Past Year</option>
        </select>
      </div>

      <div className="space-y-4">
        {[
          { label: 'Revenue', value: revenue, tone: 'bg-white' },
          { label: 'Cost', value: cost, tone: 'bg-slate-400' },
          { label: 'Profit', value: profit, tone: 'bg-emerald-500' },
        ].map((item) => (
          <div key={item.label}>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="font-medium text-slate-300">{item.label}</span>
              <span className="text-slate-400">{formatCurrency(item.value)}</span>
            </div>
            <div className="h-3 rounded-full bg-white/5">
              <div className={`h-3 rounded-full ${item.tone}`} style={{ width: `${(item.value / maxValue) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>

      {!compact && filtered.length ? (
        <div className="mt-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Included Shows</p>
          <div className="mt-3 space-y-2">
            {filtered.slice(0, 5).map((show) => (
              <div key={show.show_id} className="flex items-center justify-between text-sm">
                <span className="font-medium text-white">{show.show_name}</span>
                <span className="text-slate-500">{formatShortDate(show.start_date)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}