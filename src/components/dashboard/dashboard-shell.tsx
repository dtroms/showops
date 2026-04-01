'use client'

import { useMemo, useState } from 'react'
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

  const topStats = useMemo(() => {
    const totalRevenue = shows.reduce(
      (sum, show) => sum + Number(show.estimated_revenue ?? 0),
      0
    )
    const totalCost = shows.reduce(
      (sum, show) => sum + Number(show.total_estimated_cost ?? 0),
      0
    )
    const totalProfit = shows.reduce(
      (sum, show) => sum + Number(show.projected_profit ?? 0),
      0
    )

    return { totalRevenue, totalCost, totalProfit }
  }, [shows])

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

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Revenue</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            ${topStats.totalRevenue.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Cost</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            ${topStats.totalCost.toLocaleString()}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Profit</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            ${topStats.totalProfit.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <DashboardFilteredChart
          shows={shows}
          range={chartRange}
          onRangeChange={setChartRange}
          compact
        />

        <QuarterlyProfitBreakdown shows={shows} compact />
      </div>

      <DashboardShowTable shows={shows} />
    </div>
  )
}