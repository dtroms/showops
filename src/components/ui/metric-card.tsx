import * as React from 'react'

type MetricTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

type MetricCardProps = {
  label: string
  value: React.ReactNode
  tone?: MetricTone
  className?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const toneClasses: Record<MetricTone, string> = {
  default: 'border-white/10 bg-white/[0.03]',
  success: 'border-emerald-500/20 bg-emerald-500/[0.07]',
  warning: 'border-amber-500/20 bg-amber-500/[0.07]',
  danger: 'border-rose-500/20 bg-rose-500/[0.07]',
  info: 'border-sky-500/20 bg-sky-500/[0.07]',
}

export function MetricCard({
  label,
  value,
  tone = 'default',
  className,
}: MetricCardProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        toneClasses[tone],
        className
      )}
    >
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  )
}