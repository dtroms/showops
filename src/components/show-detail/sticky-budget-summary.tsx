type StickyBudgetSummaryProps = {
  summary: {
    estimated_revenue: number | null
    total_estimated_cost: number | null
    projected_profit: number | null
    margin_percent: number | null
  }
  permissions: {
    canViewRevenue: boolean
    canViewProfitability: boolean
  }
}

function money(value: number | null) {
  return `$${Number(value ?? 0).toLocaleString()}`
}

function cardClass(accent?: 'profit') {
  if (accent === 'profit') {
    return 'rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.08] p-4'
  }

  return 'rounded-2xl border border-white/10 bg-white/[0.03] p-4'
}

export function StickyBudgetSummary({
  summary,
  permissions,
}: StickyBudgetSummaryProps) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] xl:sticky xl:top-24">
      <h2 className="text-lg font-semibold tracking-tight text-white">Financial Snapshot</h2>
      <p className="mt-1 text-sm text-slate-400">
        Live budget summary for this show.
      </p>

      <div className="mt-5 space-y-3">
        <div className={cardClass()}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Revenue</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {permissions.canViewRevenue ? money(summary.estimated_revenue) : '—'}
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Cost</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {permissions.canViewProfitability ? money(summary.total_estimated_cost) : '—'}
          </p>
        </div>

        <div className={cardClass('profit')}>
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-300">Profit</p>
          <p className="mt-2 text-xl font-semibold text-emerald-300">
            {permissions.canViewProfitability ? money(summary.projected_profit) : '—'}
          </p>
        </div>

        <div className={cardClass()}>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Margin</p>
          <p className="mt-2 text-xl font-semibold text-white">
            {permissions.canViewProfitability ? `${summary.margin_percent ?? '—'}%` : '—'}
          </p>
        </div>
      </div>
    </div>
  )
}