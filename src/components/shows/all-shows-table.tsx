'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatShortDate } from '@/lib/format'

type Show = {
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
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
  can_view_financials: boolean
}

function statusClasses(status: string | null) {
  switch (status) {
    case 'confirmed':
      return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
    case 'quoted':
      return 'border-sky-500/20 bg-sky-500/15 text-sky-300'
    case 'in_progress':
      return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
    case 'completed':
      return 'border-violet-500/20 bg-violet-500/15 text-violet-300'
    case 'archived':
      return 'border-white/10 bg-white/10 text-slate-400'
    default:
      return 'border-white/10 bg-white/10 text-slate-300'
  }
}

function financialValue(
  show: Show,
  key: 'estimated_revenue' | 'total_estimated_cost' | 'projected_profit'
) {
  if (!show.can_view_financials) return '—'
  return formatCurrency(show[key])
}

function marginValue(show: Show) {
  if (!show.can_view_financials) return '—'
  return `${show.margin_percent ?? '—'}%`
}

export function AllShowsTable({ shows }: { shows: Show[] }) {
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null)

  if (!shows.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
        <p className="text-sm font-medium text-slate-300">No shows found.</p>
        <p className="mt-1 text-sm text-slate-500">
          Try adjusting your filters or create a new show.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Show</th>
            <th className="px-4 py-3 font-semibold">Client</th>
            <th className="px-4 py-3 font-semibold">Venue</th>
            <th className="px-4 py-3 font-semibold">City</th>
            <th className="px-4 py-3 font-semibold">Dates</th>
            <th className="px-4 py-3 font-semibold">Revenue</th>
            <th className="px-4 py-3 font-semibold">Cost</th>
            <th className="px-4 py-3 font-semibold">Profit</th>
            <th className="px-4 py-3 font-semibold">Margin</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>

        <tbody>
          {shows.map((show) => {
            const expanded = expandedShowId === show.show_id

            return (
              <tr key={show.show_id} className="border-t border-white/10 hover:bg-white/[0.02]">
                <td className="px-4 py-4">
                  <p className="font-semibold text-white">{show.show_name}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <p className="text-xs text-slate-500">{show.show_number ?? '—'}</p>
                    <span
                      className={`inline-flex rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${statusClasses(
                        show.status
                      )}`}
                    >
                      {show.status ?? 'draft'}
                    </span>
                  </div>
                </td>

                <td className="px-4 py-4 text-slate-300">{show.client_name ?? '—'}</td>
                <td className="px-4 py-4 text-slate-300">{show.venue_name ?? '—'}</td>
                <td className="px-4 py-4 text-slate-300">{show.city ?? '—'}</td>
                <td className="px-4 py-4 text-slate-300">
                  {formatShortDate(show.start_date)} - {formatShortDate(show.end_date)}
                </td>
                <td className="px-4 py-4 text-slate-300">{financialValue(show, 'estimated_revenue')}</td>
                <td className="px-4 py-4 text-slate-300">{financialValue(show, 'total_estimated_cost')}</td>
                <td className="px-4 py-4 font-medium text-emerald-300">
                  {financialValue(show, 'projected_profit')}
                </td>
                <td className="px-4 py-4 text-slate-300">{marginValue(show)}</td>

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
            )
          })}
        </tbody>
      </table>

      {shows.map((show) => {
        const expanded = expandedShowId === show.show_id
        if (!expanded) return null

        return (
          <div key={`${show.show_id}-expanded`} className="border-t border-white/10 bg-white/[0.02] px-4 py-4">
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Revenue
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {financialValue(show, 'estimated_revenue')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Cost
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {financialValue(show, 'total_estimated_cost')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Profit
                </p>
                <p className="mt-2 text-lg font-semibold text-emerald-300">
                  {financialValue(show, 'projected_profit')}
                </p>
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Margin
                </p>
                <p className="mt-2 text-lg font-semibold text-white">
                  {marginValue(show)}
                </p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}