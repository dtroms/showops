type StickyBudgetSummaryProps = {
  summary: {
    estimated_revenue: number | null
    total_estimated_cost: number | null
    projected_profit: number | null
    margin_percent: number | null
  }
  horizontal?: boolean
}

export function StickyBudgetSummary({
  summary,
  horizontal = false,
}: StickyBudgetSummaryProps) {
  if (horizontal) {
    return (
      <div>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Financial Snapshot
        </h2>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Revenue
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              ${Number(summary.estimated_revenue ?? 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Cost
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              ${Number(summary.total_estimated_cost ?? 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
              Profit
            </p>
            <p className="mt-2 text-xl font-semibold text-emerald-700">
              ${Number(summary.projected_profit ?? 0).toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Margin
            </p>
            <p className="mt-2 text-xl font-semibold text-slate-900">
              {summary.margin_percent ?? '—'}%
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm xl:sticky xl:top-24">
      <h2 className="text-lg font-semibold tracking-tight">Financial Snapshot</h2>

      <div className="mt-5 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Revenue
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            ${Number(summary.estimated_revenue ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Cost
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            ${Number(summary.total_estimated_cost ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
            Profit
          </p>
          <p className="mt-2 text-xl font-semibold text-emerald-700">
            ${Number(summary.projected_profit ?? 0).toLocaleString()}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Margin
          </p>
          <p className="mt-2 text-xl font-semibold text-slate-900">
            {summary.margin_percent ?? '—'}%
          </p>
        </div>
      </div>
    </div>
  )
}