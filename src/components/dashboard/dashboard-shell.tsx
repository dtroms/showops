'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DashboardShow } from '@/app/(app)/dashboard/page'
import { DashboardFilteredChart } from './dashboard-filtered-chart'
import { DashboardShowTable } from './dashboard-show-table'
import { QuarterlyProfitBreakdown } from './quarterly-profit-breakdown'

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