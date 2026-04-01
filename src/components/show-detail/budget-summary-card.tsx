type BudgetSummaryCardProps = {
  label: string
  value: number | null
  suffix?: string
  fallback?: string
  emptyLabel?: string
  highlight?: 'profit' | 'risk'
  health?: 'healthy' | 'warning' | 'risk' | 'unknown'
  helpText?: string
}

function formatValue(value: number | null, suffix?: string, fallback = '$0') {
  if (value === null || value === undefined) return fallback
  if (suffix) return `${Number(value).toLocaleString()}${suffix}`
  return `$${Number(value).toLocaleString()}`
}

export function BudgetSummaryCard({ label, value, suffix, fallback, emptyLabel, highlight, health, helpText }: BudgetSummaryCardProps) {
  const isEmpty = (value === null || value === undefined) && !!emptyLabel

  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-slate-500">{label}</p>
        {health ? <span className="rounded-full px-2 py-1 text-[11px] font-medium bg-slate-100 text-slate-600">{health}</span> : null}
      </div>

      <p className={`mt-2 text-2xl font-bold ${highlight === 'profit' ? 'text-emerald-600' : highlight === 'risk' ? 'text-red-600' : 'text-slate-900'}`}>
        {isEmpty ? emptyLabel : formatValue(value, suffix, fallback)}
      </p>

      {helpText ? <p className="mt-2 text-xs text-slate-500">{helpText}</p> : null}
    </div>
  )
}
