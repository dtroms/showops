'use client'

import { useMemo, useState } from 'react'
import { DashboardShow } from '@/app/(app)/dashboard/page'
import { MetricCard } from '@/components/ui/metric-card'
import { MetricRow } from '@/components/ui/metric-row'
import { PageHeader } from '@/components/ui/page-header'
import { PageSection } from '@/components/ui/page-section'
import { DashboardShowTable } from './dashboard-show-table'

type ManagedPmUser = {
  membership_id: string
  name: string
  email: string | null
}

type QuarterBucket = {
  quarter: string
  projected: number
  realized: number
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}

function getQuarter(dateString: string | null) {
  if (!dateString) return 'Unknown'
  const d = new Date(`${dateString}T00:00:00`)
  if (Number.isNaN(d.getTime())) return 'Unknown'
  const q = Math.floor(d.getMonth() / 3) + 1
  return `${d.getFullYear()} Q${q}`
}

function getStats(shows: DashboardShow[]) {
  const revenue = shows.reduce((sum, show) => sum + Number(show.estimated_revenue ?? 0), 0)
  const cost = shows.reduce((sum, show) => sum + Number(show.total_estimated_cost ?? 0), 0)
  const profit = shows.reduce((sum, show) => sum + Number(show.projected_profit ?? 0), 0)
  const margin = revenue > 0 ? (profit / revenue) * 100 : 0

  return {
    revenue,
    cost,
    profit,
    margin,
    count: shows.length,
  }
}

function marginTone(margin: number): 'default' | 'success' | 'warning' | 'danger' {
  if (margin < 45) return 'danger'
  if (margin < 50) return 'warning'
  if (margin >= 60) return 'success'
  return 'default'
}

function barClass(tone: 'amber' | 'emerald') {
  return tone === 'amber' ? 'bg-amber-400' : 'bg-emerald-500'
}

export function PmDashboardShell({
  shows,
  managedPmUsers,
}: {
  shows: DashboardShow[]
  managedPmUsers: ManagedPmUser[]
}) {
  const [chartView, setChartView] = useState<'mine' | 'team'>('mine')

  const managedSet = useMemo(
    () => new Set(managedPmUsers.map((pm) => pm.membership_id)),
    [managedPmUsers]
  )

  const myShows = useMemo(
    () => shows.filter((show) => !show.pm_membership_id || !managedSet.has(show.pm_membership_id)),
    [shows, managedSet]
  )

  const teamShows = useMemo(
    () => shows.filter((show) => show.pm_membership_id && managedSet.has(show.pm_membership_id)),
    [shows, managedSet]
  )

  const portfolio = useMemo(() => [...myShows, ...teamShows], [myShows, teamShows])

  const projected = useMemo(
    () => portfolio.filter((show) => show.financial_mode === 'projected'),
    [portfolio]
  )

  const realized = useMemo(
    () => portfolio.filter((show) => show.financial_mode === 'actual'),
    [portfolio]
  )

  const projectedStats = useMemo(() => getStats(projected), [projected])
  const realizedStats = useMemo(() => getStats(realized), [realized])

  const chartSource = chartView === 'mine' ? myShows : teamShows

  const quarterly = useMemo(() => {
    const map = new Map<string, QuarterBucket>()

    for (const show of chartSource) {
      const key = getQuarter(show.start_date)
      const current = map.get(key) ?? {
        quarter: key,
        projected: 0,
        realized: 0,
      }

      if (show.financial_mode === 'actual') {
        current.realized += Number(show.projected_profit ?? 0)
      } else {
        current.projected += Number(show.projected_profit ?? 0)
      }

      map.set(key, current)
    }

    return Array.from(map.values()).sort((a, b) => a.quarter.localeCompare(b.quarter))
  }, [chartSource])

  const chartMax = Math.max(
    ...quarterly.flatMap((q) => [q.projected, q.realized]),
    1
  )

  const myStats = useMemo(() => getStats(myShows), [myShows])
  const teamStats = useMemo(() => getStats(teamShows), [teamShows])

  const atRiskCount = portfolio.filter(
    (show) => Number(show.margin_percent ?? 0) < 50
  ).length

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      <MetricRow columns={4}>
        <MetricCard
          label="Projected"
          value={`${formatCurrency(projectedStats.profit)} · ${projectedStats.margin.toFixed(1)}%`}
          tone="warning"
        />
        <MetricCard
          label="Realized"
          value={`${formatCurrency(realizedStats.profit)} · ${realizedStats.margin.toFixed(1)}%`}
          tone="success"
        />
        <MetricCard label="My Shows" value={String(myShows.length)} />
        <MetricCard label="Team Shows" value={String(teamShows.length)} />
      </MetricRow>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <PageSection
            title="Quarterly Profit"
            actions={
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setChartView('mine')}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    chartView === 'mine'
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  Mine
                </button>
                <button
                  type="button"
                  onClick={() => setChartView('team')}
                  className={`rounded-xl px-3 py-2 text-sm ${
                    chartView === 'team'
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300'
                  }`}
                >
                  Team
                </button>
              </div>
            }
          >
            <div className="space-y-6">
              {quarterly.map((q) => (
                <div key={q.quarter}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{q.quarter}</span>
                    <span className="text-slate-500">
                      Projected {formatCurrency(q.projected)} · Realized {formatCurrency(q.realized)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-amber-300/80">
                        <span>Projected</span>
                        <span>{formatCurrency(q.projected)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={barClass('amber')}
                          style={{
                            width: `${Math.max((q.projected / Math.max(chartMax, 1)) * 100, 2)}%`,
                            height: '100%',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-emerald-300/80">
                        <span>Realized</span>
                        <span>{formatCurrency(q.realized)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className={barClass('emerald')}
                          style={{
                            width: `${Math.max((q.realized / Math.max(chartMax, 1)) * 100, 2)}%`,
                            height: '100%',
                            borderRadius: '9999px',
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <DashboardShowTable
            shows={portfolio}
            action={
              <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
                View All in Reports
              </button>
            }
          />
        </div>

        <div className="space-y-6">
          <PageSection title="My Shows">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className="text-2xl font-semibold text-white">
                {formatCurrency(myStats.profit)}
              </div>
              <div
                className={`mt-1 text-sm ${
                  marginTone(myStats.margin) === 'danger'
                    ? 'text-rose-400'
                    : marginTone(myStats.margin) === 'warning'
                      ? 'text-amber-300'
                      : marginTone(myStats.margin) === 'success'
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                }`}
              >
                {myStats.margin.toFixed(1)}%
              </div>
            </div>
          </PageSection>

          <PageSection title="Team Shows">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-4">
              <div className="text-2xl font-semibold text-white">
                {formatCurrency(teamStats.profit)}
              </div>
              <div
                className={`mt-1 text-sm ${
                  marginTone(teamStats.margin) === 'danger'
                    ? 'text-rose-400'
                    : marginTone(teamStats.margin) === 'warning'
                      ? 'text-amber-300'
                      : marginTone(teamStats.margin) === 'success'
                        ? 'text-emerald-300'
                        : 'text-slate-300'
                }`}
              >
                {teamStats.margin.toFixed(1)}%
              </div>
            </div>
          </PageSection>

          <PageSection title="Portfolio Health">
            <div className="space-y-3">
              <HealthRow label="Visible Shows" value={String(portfolio.length)} />
              <HealthRow label="Realized Shows" value={String(realized.length)} />
              <HealthRow label="Projected Shows" value={String(projected.length)} />
              <HealthRow label="At-Risk Shows" value={String(atRiskCount)} />
            </div>
          </PageSection>
        </div>
      </div>
    </div>
  )
}

function HealthRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold text-white">{value}</span>
    </div>
  )
}