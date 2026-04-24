'use client'

import { useState } from 'react'
import Link from 'next/link'

type DashboardShow = {
  show_id: string
  show_name: string
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  estimated_revenue: number | null
  gear_total: number | null
  w2_labor_total: number | null
  freelance_labor_total: number | null
  vendor_total: number | null
  supply_total: number | null
  travel_total: number | null
  shipping_total: number | null
  expedited_total: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function statusClasses(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase()

  if (normalized === 'active' || normalized === 'in_progress') {
    return 'border-sky-500/20 bg-sky-500/15 text-sky-300'
  }

  if (normalized === 'completed') {
    return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
  }

  if (normalized === 'draft' || normalized === 'planning') {
    return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
  }

  return 'border-white/10 bg-white/10 text-slate-300'
}

export function DashboardShowTable({ shows }: { shows: DashboardShow[] }) {
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null)

  if (!shows.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="text-sm font-medium text-slate-300">No shows found.</p>
        <p className="mt-1 text-sm text-slate-500">
          There are no visible shows in this portfolio yet.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
      <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight text-white">Shows</h2>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Show</th>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Venue</th>
            <th className="px-4 py-3 font-semibold">Dates</th>
            <th className="px-4 py-3 font-semibold">Revenue</th>
            <th className="px-4 py-3 font-semibold">Profit</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody>
          {shows.map((show) => {
            const expanded = expandedShowId === show.show_id

            return (
              <>
                <tr
                  key={show.show_id}
                  className="border-t border-white/10 hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-4">
                    <div className="space-y-2">
                      <p className="font-semibold text-white">{show.show_name}</p>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs text-slate-500">{show.show_number ?? '—'}</p>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${statusClasses(
                            show.status
                          )}`}
                        >
                          {show.status ?? 'draft'}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-300">{show.client_name ?? '—'}</td>

                  <td className="px-4 py-4">
                    <div>
                      <p className="text-slate-300">{show.venue_name ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">{show.city ?? '—'}</p>
                    </div>
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatShortDate(show.start_date)} - {formatShortDate(show.end_date)}
                  </td>

                  <td className="px-4 py-4 text-slate-300">
                    {formatCurrency(show.estimated_revenue)}
                  </td>

                  <td className="px-4 py-4 font-medium text-emerald-300">
                    {formatCurrency(show.projected_profit)}
                  </td>

                  <td className="px-4 py-4">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedShowId((current) =>
                            current === show.show_id ? null : show.show_id
                          )
                        }
                        className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                      >
                        {expanded ? 'Hide Details' : 'View Details'}
                      </button>

                      <Link
                        href={`/shows/${show.show_id}/show-details`}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-slate-100"
                      >
                        Open Show
                      </Link>
                    </div>
                  </td>
                </tr>

                {expanded ? (
                  <tr className="border-t border-white/10 bg-white/[0.02]">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
                        <DetailCard label="Cross Rental Equipment" value={formatCurrency(show.gear_total)} />
                        <DetailCard label="W2 Labor" value={formatCurrency(show.w2_labor_total)} />
                        <DetailCard
                          label="Freelance Labor"
                          value={formatCurrency(show.freelance_labor_total ?? show.vendor_total)}
                        />
                        <DetailCard label="Supplies" value={formatCurrency(show.supply_total)} />
                        <DetailCard label="Travel" value={formatCurrency(show.travel_total)} />
                        <DetailCard label="Shipping" value={formatCurrency(show.shipping_total)} />
                        <DetailCard label="Expedited" value={formatCurrency(show.expedited_total)} />
                        <DetailCard
                          label="Margin"
                          value={`${Number(show.margin_percent ?? 0).toFixed(1)}%`}
                        />
                      </div>
                    </td>
                  </tr>
                ) : null}
              </>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-lg font-semibold text-white">{value}</p>
    </div>
  )
}