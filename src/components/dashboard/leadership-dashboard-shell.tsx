'use client'

import { useMemo, useState } from 'react'
import { DashboardShow } from '@/app/(app)/dashboard/page'
import { MetricCard } from '@/components/ui/metric-card'
import { MetricRow } from '@/components/ui/metric-row'
import { PageHeader } from '@/components/ui/page-header'
import { PageSection } from '@/components/ui/page-section'
import { StatusBadge } from '@/components/ui/status-badge'
import { DashboardShowTable } from './dashboard-show-table'

type PmUser = {
  membership_id: string
  name: string
  email: string | null
}

type FinancialModeFilter = 'actual' | 'projected' | 'combined'

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

export function LeadershipDashboardShell({
  shows,
  pmUsers,
}: {
  shows: DashboardShow[]
  pmUsers: PmUser[]
}) {
  const [selectedPmId, setSelectedPmId] = useState<string>('all')
  const [mode, setMode] = useState<FinancialModeFilter>('combined')

  const actualShows = useMemo(
    () => shows.filter((show) => show.financial_mode === 'actual'),
    [shows]
  )

  const projectedShows = useMemo(
    () => shows.filter((show) => show.financial_mode === 'projected'),
    [shows]
  )

  const modeScopedShows = useMemo(() => {
    if (mode === 'actual') return actualShows
    if (mode === 'projected') return projectedShows
    return shows
  }, [mode, shows, actualShows, projectedShows])

  const filteredShows = useMemo(() => {
    if (selectedPmId === 'all') return modeScopedShows
    return modeScopedShows.filter((show) => show.pm_membership_id === selectedPmId)
  }, [modeScopedShows, selectedPmId])

  const actualStats = useMemo(() => getStats(actualShows), [actualShows])
  const projectedStats = useMemo(() => getStats(projectedShows), [projectedShows])

  const quarterly = useMemo(() => {
    const map = new Map<string, QuarterBucket>()

    for (const show of filteredShows) {
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
  }, [filteredShows])

  const chartMax = Math.max(
    ...quarterly.flatMap((q) => [q.projected, q.realized]),
    1
  )

  const pmSnapshots = useMemo(() => {
    return pmUsers
      .map((pm) => {
        const pmShows = filteredShows.filter((show) => show.pm_membership_id === pm.membership_id)
        const realized = pmShows.filter((show) => show.financial_mode === 'actual')
        const projected = pmShows.filter((show) => show.financial_mode === 'projected')

        const realizedStats = getStats(realized)
        const projectedStats = getStats(projected)

        return {
          pm,
          count: pmShows.length,
          realizedProfit: realizedStats.profit,
          realizedMargin: realizedStats.margin,
          projectedProfit: projectedStats.profit,
          projectedMargin: projectedStats.margin,
        }
      })
      .filter((row) => row.count > 0)
      .sort((a, b) => a.pm.name.localeCompare(b.pm.name))
  }, [filteredShows, pmUsers])

  const atRiskCount = filteredShows.filter(
    (show) => Number(show.margin_percent ?? 0) < 50
  ).length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setMode('combined')}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === 'combined'
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              Combined
            </button>
            <button
              type="button"
              onClick={() => setMode('actual')}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === 'actual'
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              Actual
            </button>
            <button
              type="button"
              onClick={() => setMode('projected')}
              className={`rounded-xl px-3 py-2 text-sm ${
                mode === 'projected'
                  ? 'bg-white text-slate-950'
                  : 'border border-white/10 bg-white/5 text-slate-300'
              }`}
            >
              Projected
            </button>

            <select
              value={selectedPmId}
              onChange={(e) => setSelectedPmId(e.target.value)}
              className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200 outline-none"
            >
              <option value="all">All PMs</option>
              {pmUsers.map((pm) => (
                <option key={pm.membership_id} value={pm.membership_id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>
        }
      />

      <MetricRow columns={4}>
        <MetricCard
          label="Projected"
          value={`${formatCurrency(projectedStats.profit)} · ${projectedStats.margin.toFixed(1)}%`}
          tone="warning"
        />
        <MetricCard
          label="Realized"
          value={`${formatCurrency(actualStats.profit)} · ${actualStats.margin.toFixed(1)}%`}
          tone="success"
        />
        <MetricCard
          label="Visible Shows"
          value={String(filteredShows.length)}
        />
        <MetricCard
          label="At Risk"
          value={String(atRiskCount)}
          tone={atRiskCount > 0 ? 'danger' : 'default'}
        />
      </MetricRow>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <div className="space-y-6">
          <PageSection title="Projected vs Realized">
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
            shows={filteredShows}
            action={
              <button className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 hover:bg-white/10">
                View All in Reports
              </button>
            }
          />
        </div>

        <div className="space-y-6">
          <PageSection title="PM Performance Snapshot">
            <div className="space-y-3">
              {pmSnapshots.map((row) => (
                <div
                  key={row.pm.membership_id}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <div className="text-sm font-medium text-white">{row.pm.name}</div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-emerald-300/80">
                        Realized
                      </div>
                      <div className="mt-1 font-medium text-emerald-200">
                        {formatCurrency(row.realizedProfit)} · {row.realizedMargin.toFixed(1)}%
                      </div>
                    </div>

                    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.07] px-3 py-2">
                      <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-300/80">
                        Projected
                      </div>
                      <div className="mt-1 font-medium text-amber-200">
                        {formatCurrency(row.projectedProfit)} · {row.projectedMargin.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </PageSection>

          <PageSection title="Portfolio Health">
            <div className="space-y-3">
              <HealthRow label="Visible Shows" value={String(filteredShows.length)} />
              <HealthRow label="Actual Shows" value={String(filteredShows.filter((s) => s.financial_mode === 'actual').length)} />
              <HealthRow label="Projected Shows" value={String(filteredShows.filter((s) => s.financial_mode === 'projected').length)} />
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