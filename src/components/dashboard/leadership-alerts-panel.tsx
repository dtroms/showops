'use client'

import { useMemo } from 'react'
import { DashboardShow } from '@/app/(app)/dashboard/page'

export function LeadershipAlertsPanel({ shows }: { shows: DashboardShow[] }) {
  const alerts = useMemo(() => {
    const lowMarginShows = shows.filter((show) => Number(show.margin_percent ?? 0) < 25)
    const missingLabor = shows.filter(
      (show) =>
        Number(show.w2_labor_total ?? 0) === 0 &&
        Number(show.freelance_labor_total ?? 0) === 0
    )
    const highShipping = shows.filter((show) => Number(show.shipping_total ?? 0) > 500)
    const highExpedited = shows.filter((show) => Number(show.expedited_total ?? 0) > 0)

    return [
      {
        label: 'Low-margin shows',
        value: lowMarginShows.length,
        tone: lowMarginShows.length
          ? 'border-amber-500/20 bg-amber-500/[0.08] text-amber-300'
          : 'border-white/10 bg-white/[0.03] text-white',
      },
      {
        label: 'Shows missing labor budget',
        value: missingLabor.length,
        tone: missingLabor.length
          ? 'border-amber-500/20 bg-amber-500/[0.08] text-amber-300'
          : 'border-white/10 bg-white/[0.03] text-white',
      },
      {
        label: 'Shows with high shipping',
        value: highShipping.length,
        tone: highShipping.length
          ? 'border-white/10 bg-white/[0.03] text-white'
          : 'border-white/10 bg-white/[0.03] text-white',
      },
      {
        label: 'Shows with expedited cost',
        value: highExpedited.length,
        tone: highExpedited.length
          ? 'border-rose-500/20 bg-rose-500/[0.08] text-rose-300'
          : 'border-white/10 bg-white/[0.03] text-white',
      },
    ]
  }, [shows])

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <h2 className="text-lg font-semibold text-white">Risk & Alerts</h2>
      <p className="mt-1 text-sm text-slate-400">
        Quick operational flags leadership should be watching.
      </p>

      <div className="mt-4 space-y-3">
        {alerts.map((alert) => (
          <div
            key={alert.label}
            className={`flex items-center justify-between rounded-xl border px-4 py-3 ${alert.tone}`}
          >
            <p className="text-sm">{alert.label}</p>
            <p className="text-sm font-semibold">{alert.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}