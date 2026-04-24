'use client'

import { useMemo } from 'react'
import { DashboardShow } from '@/app/(app)/dashboard/page'

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function getQuarterLabel(dateString: string | null) {
  if (!dateString) return 'Unknown'
  const date = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const quarter = Math.floor(date.getMonth() / 3) + 1
  return `${date.getFullYear()} Q${quarter}`
}

export function PmQuarterlyProfitChart({ shows }: { shows: DashboardShow[] }) {
  const data = useMemo(() => {
    const map = new Map<string, number>()

    for (const show of shows) {
      const key = getQuarterLabel(show.start_date)
      map.set(key, (map.get(key) ?? 0) + Number(show.projected_profit ?? 0))
    }

    return Array.from(map.entries())
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => a.label.localeCompare(b.label))
  }, [shows])

  const maxValue = Math.max(...data.map((item) => item.value), 1)

  if (!data.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
        No profitability data yet.
      </div>
    )
  }

  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
      <div className="space-y-4">
        {data.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-sm">
              <span className="font-medium text-white">{item.label}</span>
              <span className="text-slate-400">{formatCurrency(item.value)}</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-white/80"
                style={{ width: `${Math.max((item.value / maxValue) * 100, 2)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}