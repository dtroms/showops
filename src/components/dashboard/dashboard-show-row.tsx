'use client'

import { useState } from 'react'
import { DashboardExpandedRow } from './dashboard-expanded-row'

type DashboardShow = {
  show_id: string
  show_name: string
  start_date: string | null
  estimated_revenue: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
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

export function DashboardShowRow({ show }: { show: DashboardShow }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="rounded-xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 p-4 text-left"
      >
        <div className="grid flex-1 gap-4 md:grid-cols-6">
          <div>
            <p className="font-semibold">{show.show_name}</p>
          </div>
          <div>{show.start_date ?? '—'}</div>
          <div>${Number(show.estimated_revenue ?? 0).toLocaleString()}</div>
          <div>${Number(show.total_estimated_cost ?? 0).toLocaleString()}</div>
          <div>${Number(show.projected_profit ?? 0).toLocaleString()}</div>
          <div>{show.margin_percent ?? '—'}%</div>
        </div>
        <span className="text-sm text-slate-500">{open ? 'Hide' : 'Expand'}</span>
      </button>

      {open ? (
        <div className="border-t p-4 pt-0">
          <DashboardExpandedRow show={show} />
        </div>
      ) : null}
    </div>
  )
}