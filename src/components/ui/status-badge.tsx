import * as React from 'react'

type StatusTone = 'default' | 'success' | 'warning' | 'danger' | 'info'

type StatusBadgeProps = {
  label: string
  tone?: StatusTone
  className?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const toneClasses: Record<StatusTone, string> = {
  default: 'border-white/10 bg-white/10 text-slate-300',
  success: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  warning: 'border-amber-500/20 bg-amber-500/15 text-amber-300',
  danger: 'border-rose-500/20 bg-rose-500/15 text-rose-300',
  info: 'border-sky-500/20 bg-sky-500/15 text-sky-300',
}

export function StatusBadge({
  label,
  tone = 'default',
  className,
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        toneClasses[tone],
        className
      )}
    >
      {label}
    </span>
  )
}