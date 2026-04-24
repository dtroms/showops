'use client'

import Link from 'next/link'
import type { DashboardShow } from '@/app/(app)/dashboard/page'
import { formatCurrency } from '@/lib/format'

export function PmPortfolioCard({
  title,
  subtitle,
  shows,
}: {
  title: string
  subtitle?: string
  shows: DashboardShow[]
}) {
  const revenue = shows.reduce((sum, show) => sum + Number(show.estimated_revenue ?? 0), 0)
  const profit = shows.reduce((sum, show) => sum + Number(show.projected_profit ?? 0), 0)
  const avgMargin =
    shows.length > 0
      ? (
          shows.reduce((sum, show) => sum + Number(show.margin_percent ?? 0), 0) / shows.length
        ).toFixed(1)
      : '0.0'

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          {subtitle ? <p className="mt-1 text-sm text-slate-400">{subtitle}</p> : null}
        </div>

        <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-300">
          {shows.length} shows
        </span>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Revenue</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(revenue)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Profit</p>
          <p className="mt-2 text-lg font-semibold text-emerald-300">{formatCurrency(profit)}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Avg Margin</p>
          <p className="mt-2 text-lg font-semibold text-white">{avgMargin}%</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {shows.slice(0, 5).map((show) => (
          <div
            key={show.show_id}
            className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2"
          >
            <div>
              <p className="font-medium text-white">{show.show_name}</p>
              <p className="text-xs text-slate-500">{show.client_name ?? 'No client'}</p>
            </div>
            <Link
              href={`/shows/${show.show_id}/show-details`}
              className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Open
            </Link>
          </div>
        ))}
      </div>
    </div>
  )
}