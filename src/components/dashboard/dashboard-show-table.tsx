'use client'

import Link from 'next/link'
import { DashboardShow } from '@/app/(app)/dashboard/page'
import { PageSection } from '@/components/ui/page-section'
import { StatusBadge } from '@/components/ui/status-badge'

type DashboardShowTableProps = {
  shows: DashboardShow[]
  title?: string
  action?: React.ReactNode
  maxRows?: number
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatDateRange(start: string | null, end: string | null) {
  const formatOne = (value: string | null) => {
    if (!value) return '—'
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString()
  }

  return `${formatOne(start)} - ${formatOne(end)}`
}

function marginClass(margin: number) {
  if (margin < 45) return 'text-rose-400'
  if (margin < 50) return 'text-amber-300'
  if (margin >= 60) return 'font-semibold text-emerald-300'
  return 'text-slate-200'
}

export function DashboardShowTable({
  shows,
  title = 'Show Performance Table',
  action,
  maxRows,
}: DashboardShowTableProps) {
  const rows = typeof maxRows === 'number' ? shows.slice(0, maxRows) : shows

  return (
    <PageSection
      title={title}
      actions={action}
      className="p-5"
      contentClassName="mt-0"
    >
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[minmax(0,1.4fr)_120px_130px_140px_120px_110px] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <div>Show</div>
          <div>PM</div>
          <div>Mode</div>
          <div>Revenue</div>
          <div>Profit</div>
          <div>Margin</div>
        </div>

        {rows.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-slate-500">
            No shows found.
          </div>
        ) : null}

        {rows.map((show) => {
          const margin = Number(show.margin_percent ?? 0)

          return (
            <Link
              key={show.show_id}
              href={`/shows/${show.show_id}/show-details`}
              className="grid grid-cols-[minmax(0,1.4fr)_120px_130px_140px_120px_110px] items-center border-t border-white/10 px-4 py-3 text-sm transition hover:bg-white/[0.03]"
            >
              <div>
                <div className="font-medium text-white">{show.show_name}</div>
                <div className="mt-1 text-xs text-slate-500">
                  {formatDateRange(show.start_date, show.end_date)}
                </div>
              </div>

              <div className="text-slate-300">{show.pm_name}</div>

              <div>
                <StatusBadge
                  label={show.financial_mode === 'actual' ? 'Actual' : 'Projected'}
                  tone={show.financial_mode === 'actual' ? 'success' : 'warning'}
                />
              </div>

              <div className="text-slate-200">
                {formatCurrency(show.estimated_revenue)}
              </div>

              <div className="font-medium text-white">
                {formatCurrency(show.projected_profit)}
              </div>

              <div className={marginClass(margin)}>{margin.toFixed(1)}%</div>
            </Link>
          )
        })}
      </div>
    </PageSection>
  )
}