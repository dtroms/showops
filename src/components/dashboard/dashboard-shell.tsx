'use client'

import { useState } from 'react'
import Link from 'next/link'
import { DashboardFilteredChart } from './dashboard-filtered-chart'
import { DashboardShowTable } from './dashboard-show-table'
import { QuarterlyProfitBreakdown } from './quarterly-profit-breakdown'

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

export function DashboardShell({ shows }: { shows: DashboardShow[] }) {
  const [chartRange, setChartRange] = useState<'week' | 'month' | 'quarter' | 'year'>('month')

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Link
          href="/shows/new"
          className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
        >
          Create Show
        </Link>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <DashboardFilteredChart
          shows={shows}
          range={chartRange}
          onRangeChange={setChartRange}
        />
        <QuarterlyProfitBreakdown shows={shows} />
      </div>

      <DashboardShowTable shows={shows} />
    </div>
  )
}