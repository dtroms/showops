'use client'

import { useSelectedLayoutSegment } from 'next/navigation'
import { ShowHeader } from './show-header'
import { ShowSideNav } from './show-side-nav'
import { StickyBudgetSummary } from './sticky-budget-summary'

type ShowShellProps = {
  show: {
    id: string
    show_name: string
    show_number: string | null
    status: string | null
    start_date: string | null
    end_date: string | null
  }
  summary: {
    estimated_revenue: number | null
    total_estimated_cost: number | null
    projected_profit: number | null
    margin_percent: number | null
  }
  children: React.ReactNode
}

export function ShowShell({ show, summary, children }: ShowShellProps) {
  const segment = useSelectedLayoutSegment()

  const isBudgetSheetPage = segment === 'budget-sheet'

  const hideBudgetSnapshot =
    segment === 'budget-summary' ||
    segment === 'show-details' ||
    segment === 'vendors' ||
    segment === 'supplies' ||
    segment === 'travel' ||
    segment === 'notes'

  if (isBudgetSheetPage) {
    return (
      <div className="space-y-4 p-4 xl:p-6">
        <ShowHeader show={show} compact />

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <StickyBudgetSummary summary={summary} horizontal />
        </div>

        <div className="grid gap-4 xl:grid-cols-[190px_minmax(0,1fr)]">
          <ShowSideNav showId={show.id} compact />
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <ShowHeader show={show} />

      {hideBudgetSnapshot ? (
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)]">
          <ShowSideNav showId={show.id} compact />
          <div className="min-w-0">{children}</div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[220px_minmax(0,1fr)_320px]">
          <ShowSideNav showId={show.id} compact />
          <div className="min-w-0">{children}</div>
          <StickyBudgetSummary summary={summary} />
        </div>
      )}
    </div>
  )
}