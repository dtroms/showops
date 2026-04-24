'use client'

import { formatCurrency, formatShortDate } from '@/lib/format'

type ExpandedShow = {
  show_id: string
  show_name: string
  client_name: string | null
  venue_name: string | null
  city: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  estimated_revenue: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
}

export function DashboardExpandedRow({ show }: { show: ExpandedShow }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card label="Client" value={show.client_name ?? '—'} />
        <Card label="Venue" value={show.venue_name ?? '—'} />
        <Card label="Location" value={show.city ?? '—'} />
        <Card label="Dates" value={`${formatShortDate(show.start_date)} - ${formatShortDate(show.end_date)}`} />
        <Card label="Status" value={show.status ?? '—'} />
        <Card label="Revenue" value={formatCurrency(show.estimated_revenue)} />
        <Card label="Cost" value={formatCurrency(show.total_estimated_cost)} />
        <Card label="Profit" value={`${formatCurrency(show.projected_profit)} · ${Number(show.margin_percent ?? 0).toFixed(1)}%`} />
      </div>
    </div>
  )
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-sm font-medium text-white">{value}</p>
    </div>
  )
}