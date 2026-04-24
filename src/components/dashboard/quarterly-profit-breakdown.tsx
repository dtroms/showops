'use client'

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

export function QuarterlyProfitBreakdown({ shows }: { shows: DashboardShow[] }) {
  const grouped = shows.reduce<Record<string, DashboardShow[]>>((acc, show) => {
    const quarter = getQuarterLabel(show.start_date)
    acc[quarter] = acc[quarter] || []
    acc[quarter].push(show)
    return acc
  }, {})

  const orderedEntries = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b))

  if (!orderedEntries.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
        No quarterly breakdown available yet.
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {orderedEntries.map(([quarter, quarterShows]) => (
        <div
          key={quarter}
          className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4"
        >
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-semibold text-white">{quarter}</h3>
            <span className="text-sm text-slate-400">
              {formatCurrency(
                quarterShows.reduce(
                  (sum, show) => sum + Number(show.projected_profit ?? 0),
                  0
                )
              )}
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {quarterShows.map((show) => (
              <div
                key={show.show_id}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-3"
              >
                <p className="font-medium text-white">{show.show_name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {show.client_name ?? 'No client'}
                </p>

                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Revenue
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatCurrency(Number(show.estimated_revenue ?? 0))}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Cost
                    </p>
                    <p className="mt-1 text-sm font-semibold text-white">
                      {formatCurrency(Number(show.total_estimated_cost ?? 0))}
                    </p>
                  </div>

                  <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      Profit %
                    </p>
                    <p className="mt-1 text-sm font-semibold text-emerald-300">
                      {show.margin_percent ?? '—'}%
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}