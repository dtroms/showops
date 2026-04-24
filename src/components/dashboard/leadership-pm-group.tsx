'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatShortDate } from '@/lib/format'
import type { LeadershipDashboardShow } from './leadership-dashboard-shell'

function riskClasses(risk: LeadershipDashboardShow['risk_flag']) {
  if (risk === 'risk') return 'border-rose-500/20 bg-rose-500/15 text-rose-300'
  if (risk === 'warning') return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
  return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
}

export function LeadershipPmGroup({
  pmLabel,
  shows,
}: {
  pmLabel: string
  shows: LeadershipDashboardShow[]
}) {
  const [open, setOpen] = useState(false)

  const stats = useMemo(() => {
    const revenue = shows.reduce((sum, show) => sum + Number(show.estimated_revenue ?? 0), 0)
    const profit = shows.reduce((sum, show) => sum + Number(show.projected_profit ?? 0), 0)
    const avgMargin =
      shows.length > 0
        ? Number(
            (
              shows.reduce((sum, show) => sum + Number(show.margin_percent ?? 0), 0) /
              shows.length
            ).toFixed(1)
          )
        : 0

    return {
      revenue,
      profit,
      avgMargin,
      missingBudgetCount: shows.filter((show) => show.budget_status === 'missing').length,
      startedBudgetCount: shows.filter((show) => show.budget_status === 'started').length,
      missingFreelancerCount: shows.filter((show) => show.freelancer_status !== 'assigned').length,
      atRiskCount: shows.filter((show) => show.risk_flag !== 'healthy').length,
    }
  }, [shows])

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <div>
          <p className="text-lg font-semibold text-white">{pmLabel}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{shows.length} shows</span>
            <span>•</span>
            <span>{formatCurrency(stats.revenue)} revenue</span>
            <span>•</span>
            <span>{formatCurrency(stats.profit)} profit</span>
            <span>•</span>
            <span>{stats.avgMargin}% avg margin</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-slate-300">
            Budget Missing: {stats.missingBudgetCount}
          </span>
          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-slate-300">
            Budget Started: {stats.startedBudgetCount}
          </span>
          <span className="rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-slate-300">
            Freelancers Pending: {stats.missingFreelancerCount}
          </span>
          <span className="rounded-full border border-amber-500/20 bg-amber-500/15 px-2 py-1 text-xs font-medium text-amber-300">
            At Risk: {stats.atRiskCount}
          </span>
          <span className="text-sm text-slate-500">{open ? 'Hide' : 'Expand'}</span>
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/10 p-5">
          <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Show</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">PM Assigned</th>
                  <th className="px-4 py-3 font-semibold">Budget</th>
                  <th className="px-4 py-3 font-semibold">Freelancers</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                  <th className="px-4 py-3 font-semibold">Profit</th>
                  <th className="px-4 py-3 font-semibold">Margin</th>
                  <th className="px-4 py-3 font-semibold">Risk</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {shows.map((show) => (
                  <tr key={show.show_id} className="border-t border-white/10 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{show.show_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{show.show_number ?? '—'}</p>
                    </td>
                    <td className="px-4 py-4">{formatShortDate(show.start_date)} - {formatShortDate(show.end_date)}</td>
                    <td className="px-4 py-4 text-slate-300">{show.status ?? '—'}</td>
                    <td className="px-4 py-4 text-slate-300">{show.pm_assigned ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-4 text-slate-300">{show.budget_status}</td>
                    <td className="px-4 py-4 text-slate-300">{show.freelancer_status}</td>
                    <td className="px-4 py-4 text-slate-300">{formatCurrency(show.estimated_revenue)}</td>
                    <td className="px-4 py-4 font-medium text-emerald-300">{formatCurrency(show.projected_profit)}</td>
                    <td className="px-4 py-4 text-slate-300">{show.margin_percent ?? '—'}%</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${riskClasses(show.risk_flag)}`}>
                        {show.risk_flag}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={`/shows/${show.show_id}/show-details`}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          Open Show
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </div>
  )
}