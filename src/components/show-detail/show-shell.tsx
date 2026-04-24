'use client'

import type { ReactNode } from 'react'
import { ShowTabs } from './show-tabs'

type BudgetSnapshot = {
  gear_total: number | null
  w2_labor_total: number | null
  vendor_total: number | null
  supply_total: number | null
  travel_total: number | null
  shipping_total: number | null
  expedited_total: number | null
  company_owned_gear_allocation: number | null
  company_owned_gear_percent: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
}

type ShowShellProps = {
  show: {
    id: string
    show_name: string
    show_number: string | null
    status: string | null
    start_date: string | null
    end_date: string | null
    city: string | null
    state: string | null
    venue_name: string | null
    client_name: string | null
  }
  summary: {
    estimated_revenue: number | null
    total_estimated_cost: number | null
    projected_profit: number | null
    margin_percent: number | null
    pre: BudgetSnapshot
    post: BudgetSnapshot | null
  }
  readiness: {
    crew_count: number
    freelancer_count: number
    vendor_count: number
    note_count: number
    file_count: number
  }
  children: ReactNode
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatPercent(value: number | null | undefined) {
  return `${Number(value ?? 0).toFixed(1)}%`
}

function statusTone(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase().replace(/[\s-]/g, '_')
  if (normalized === 'financial_closed') return 'success'
  if (normalized === 'active') return 'info'
  if (normalized === 'planning') return 'warning'
  return 'default'
}

function StatusBadge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const toneClasses = {
    default: 'border-white/10 bg-white/10 text-slate-300',
    success: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/15 text-amber-300',
    danger: 'border-rose-500/20 bg-rose-500/15 text-rose-300',
    info: 'border-sky-500/20 bg-sky-500/15 text-sky-300',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  )
}

export function ShowShell({
  show,
  summary,
  children,
}: ShowShellProps) {
  return (
    <div className="space-y-0">
      <div className="sticky top-[73px] z-30 bg-slate-950 pb-0">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white">
                  {show.show_name}
                </h1>

                <StatusBadge
                  label={show.status ?? 'Draft'}
                  tone={statusTone(show.status)}
                />

                {show.show_number ? (
                  <StatusBadge label={show.show_number} />
                ) : null}
              </div>

              <div className="mt-3 text-sm text-slate-400">
                {formatDateRange(show.start_date, show.end_date)} ·{' '}
                {show.client_name ?? 'No client'} ·{' '}
                {show.venue_name ?? 'No venue'}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Revenue
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(summary.estimated_revenue)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Profit
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {formatCurrency(summary.projected_profit)}
                </div>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  Margin
                </div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {formatPercent(summary.margin_percent)}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-3">
          <ShowTabs showId={show.id} />
        </div>
      </div>

      <div className="pt-4">{children}</div>
    </div>
  )
}