'use client'

import Link from 'next/link'

type DashboardShow = {
  show_id: string
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  end_date: string | null
  status: string | null
  gear_total: number | null
  vendor_total: number | null
  supply_total: number | null
  travel_total: number | null
}

export function DashboardExpandedRow({ show }: { show: DashboardShow }) {
  return (
    <div className="rounded-xl border bg-slate-50 p-4">
      <div className="grid gap-4 text-sm md:grid-cols-2 xl:grid-cols-4">
        <div><span className="font-semibold">Show Number:</span> {show.show_number ?? '—'}</div>
        <div><span className="font-semibold">Client:</span> {show.client_name ?? '—'}</div>
        <div><span className="font-semibold">Venue:</span> {show.venue_name ?? '—'}</div>
        <div><span className="font-semibold">City:</span> {show.city ?? '—'}</div>
        <div><span className="font-semibold">End Date:</span> {show.end_date ?? '—'}</div>
        <div><span className="font-semibold">Status:</span> {show.status ?? '—'}</div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-semibold">Cost Breakdown</p>
        <div className="mt-3 grid gap-3 text-sm md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg border bg-white p-3">Gear: ${Number(show.gear_total ?? 0).toLocaleString()}</div>
          <div className="rounded-lg border bg-white p-3">Vendors: ${Number(show.vendor_total ?? 0).toLocaleString()}</div>
          <div className="rounded-lg border bg-white p-3">Supplies: ${Number(show.supply_total ?? 0).toLocaleString()}</div>
          <div className="rounded-lg border bg-white p-3">Travel: ${Number(show.travel_total ?? 0).toLocaleString()}</div>
        </div>
      </div>

      <div className="mt-4">
        <Link href={`/shows/${show.show_id}/budget-summary`} className="text-sm font-medium underline">
          Show More
        </Link>
      </div>
    </div>
  )
}