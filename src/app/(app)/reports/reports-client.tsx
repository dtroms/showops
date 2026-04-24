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

export default function ReportsClient({
  summaries,
}: {
  summaries: ShowSummary[]
}) {
  const [mode, setMode] = useState<Mode>('combined')

  const normalized = useMemo(() => {
    return summaries.map((s) => {
      const normalizedStatus = (s.status ?? '')
        .toLowerCase()
        .replace(/[\s-]/g, '_')
        .trim()

      const hasPost = Boolean(s.post_total)

      const isActual =
        normalizedStatus === 'financial_closed' && hasPost

      return {
        ...s,
        isActual,
        isProjected: !isActual,
        profit:
          (s.revenue ?? 0) -
          (isActual ? s.post_total ?? 0 : s.pre_total ?? 0),
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
      arr.reduce((acc, s) => acc + (s[key] ?? 0), 0)

    return {
      actualRevenue: sum(actual, 'revenue'),
      actualProfit: sum(actual, 'profit'),
      projectedRevenue: sum(projected, 'revenue'),
      projectedProfit: sum(projected, 'profit'),
    }
  }, [normalized])

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card title="Actual Revenue" value={totals.actualRevenue} />
        <Card title="Actual Profit" value={totals.actualProfit} />
        <Card title="Projected Revenue" value={totals.projectedRevenue} />
        <Card title="Projected Profit" value={totals.projectedProfit} />
      </div>

      <div className="flex gap-2">
        {['combined', 'actual', 'projected'].map((m) => (
          <button
            key={m}
            onClick={() => setMode(m as Mode)}
            className={`px-3 py-1 rounded text-sm ${
              mode === m
                ? 'bg-slate-900 text-white'
                : 'border text-slate-600'
            }`}
          >
            {m.charAt(0).toUpperCase() + m.slice(1)}
          </button>
        ))}
      </div>

      <div className="border rounded-md">
        <div className="grid grid-cols-4 px-4 py-2 border-b text-xs text-slate-500">
          <div>Show</div>
          <div>Status</div>
          <div>Revenue</div>
          <div>Profit</div>
        </div>

        {filtered.map((s) => (
          <div
            key={s.id}
            className="grid grid-cols-4 px-4 py-2 border-b text-sm"
          >
            <div>{s.show_name}</div>
            <div>{s.isActual ? 'Actual' : 'Projected'}</div>
            <div>${(s.revenue ?? 0).toLocaleString()}</div>
            <div>${(s.profit ?? 0).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Card({ title, value }: { title: string; value: number }) {
  return (
    <div className="border rounded-lg p-4">
      <div className="text-xs text-slate-500">{title}</div>
      <div className="text-lg font-semibold">
        ${value.toLocaleString()}
      </div>
    </div>
  )
}