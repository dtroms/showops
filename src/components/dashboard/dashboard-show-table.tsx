'use client'

import { useState } from 'react'
import Link from 'next/link'
import { formatCurrency, formatShortDate } from '@/lib/format'

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
  vendor_total: number | null
  supply_total: number | null
  travel_total: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
}

export function DashboardShowTable({
  shows,
}: {
  shows: DashboardShow[]
}) {
  const [expandedShowId, setExpandedShowId] = useState<string | null>(null)

  if (!shows.length) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">No shows found.</p>
        <p className="mt-1 text-sm text-slate-400">
          Create your first show to start tracking performance.
        </p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3">
        <h2 className="text-lg font-semibold tracking-tight">Shows</h2>
      </div>

      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
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
                <tr key={show.show_id} className="border-t border-slate-200 hover:bg-slate-50/70">
                  <td className="px-4 py-4">
                    <p className="font-semibold text-slate-900">{show.show_name}</p>
                    <p className="mt-1 text-xs text-slate-500">{show.show_number ?? '—'}</p>
                  </td>
                  <td className="px-4 py-4">{show.client_name ?? '—'}</td>
                  <td className="px-4 py-4">
                    <div>
                      <p>{show.venue_name ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">{show.city ?? '—'}</p>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    {formatShortDate(show.start_date)} - {formatShortDate(show.end_date)}
                  </td>
                  <td className="px-4 py-4">{formatCurrency(show.estimated_revenue)}</td>
                  <td className="px-4 py-4 font-medium text-emerald-600">
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
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                      >
                        {expanded ? 'Hide Details' : 'View Details'}
                      </button>

                      <Link
                        href={`/shows/${show.show_id}/budget-summary`}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-slate-800"
                      >
                        View Show Summary
                      </Link>
                    </div>
                  </td>
                </tr>

                {expanded ? (
                  <tr className="border-t border-slate-200 bg-slate-50/70">
                    <td colSpan={7} className="px-4 py-4">
                      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Gear
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatCurrency(show.gear_total)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Freelance Labor
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatCurrency(show.vendor_total)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Supplies
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatCurrency(show.supply_total)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Travel
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {formatCurrency(show.travel_total)}
                          </p>
                        </div>

                        <div className="rounded-xl border border-slate-200 bg-white p-4">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                            Margin
                          </p>
                          <p className="mt-2 text-lg font-semibold">
                            {show.margin_percent ?? '—'}%
                          </p>
                        </div>
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