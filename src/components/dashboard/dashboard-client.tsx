'use client'

import { useMemo, useState } from 'react'

type ShowSummary = {
  id: string
  show_name: string
  start_date: string | null
  end_date: string | null
  status: string | null
  pre_total: number | null
  post_total: number | null
  revenue: number | null
}

type Mode = 'combined' | 'actual' | 'projected'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatDate(value: string | null) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

export function DashboardClient({ summaries }: { summaries: ShowSummary[] }) {
  const [mode, setMode] = useState<Mode>('combined')

  const normalized = useMemo(() => {
    return summaries.map((s) => {
      const normalizedStatus = (s.status ?? '').toLowerCase().replace(/[\s-]/g, '_').trim()
      const hasPost = Number(s.post_total ?? 0) > 0
      const isActual = normalizedStatus === 'financial_closed' && hasPost

      return {
        ...s,
        isActual,
        isProjected: !isActual,
        profit:
          Number(s.revenue ?? 0) - Number(isActual ? s.post_total ?? 0 : s.pre_total ?? 0),
      }
    })
  }, [summaries])

  const filtered = useMemo(() => {
    if (mode === 'actual') return normalized.filter((s) => s.isActual)
    if (mode === 'projected') return normalized.filter((s) => s.isProjected)
    return normalized
  }, [mode, normalized])

  const totals = useMemo(() => {
    const actual = normalized.filter((s) => s.isActual)
    const projected = normalized.filter((s) => s.isProjected)
    const sum = (arr: typeof normalized, key: 'revenue' | 'profit') =>
      arr.reduce((acc, s) => acc + Number(s[key] ?? 0), 0)

    return {
      actualRevenue: sum(actual, 'revenue'),
      actualProfit: sum(actual, 'profit'),
      projectedRevenue: sum(projected, 'revenue'),
      projectedProfit: sum(projected, 'profit'),
    }
  }, [normalized])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Card title="Actual Revenue" value={totals.actualRevenue} />
        <Card title="Actual Profit" value={totals.actualProfit} />
        <Card title="Projected Revenue" value={totals.projectedRevenue} />
        <Card title="Projected Profit" value={totals.projectedProfit} />
      </div>

      <div className="flex gap-2">
        {(['combined', 'actual', 'projected'] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`rounded-xl border px-3 py-1.5 text-sm ${
              mode === m
                ? 'border-white bg-white text-slate-950'
                : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
            }`}
          >
            {m[0].toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px] gap-4 border-b border-white/10 bg-white/[0.03] px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
          <div>Show</div>
          <div>Mode</div>
          <div>Revenue</div>
          <div>Profit</div>
        </div>

        {filtered.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">No shows found for this view.</div>
        ) : (
          filtered.map((s) => (
            <div
              key={s.id}
              className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px] gap-4 border-b border-white/10 px-4 py-3 text-sm last:border-b-0"
            >
              <div>
                <div className="font-medium text-white">{s.show_name}</div>
                <div className="text-xs text-slate-500">
                  {formatDate(s.start_date)} - {formatDate(s.end_date)}
                </div>
              </div>
              <div className="text-slate-300">{s.isActual ? 'Actual' : 'Projected'}</div>
              <div className="text-white">{formatCurrency(Number(s.revenue ?? 0))}</div>
              <div className="font-medium text-emerald-300">
                {formatCurrency(Number(s.profit ?? 0))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</div>
      <div className="mt-2 text-2xl font-semibold text-white">{formatCurrency(value)}</div>
    </div>
  )
}