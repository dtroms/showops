'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { PageHeader } from '@/components/ui/page-header'
import { PageSection } from '@/components/ui/page-section'
import { SearchInput } from '@/components/ui/search-input'
import { StatusBadge } from '@/components/ui/status-badge'
import { formatCurrency } from '@/lib/format'

type Show = {
  show_id: string
  show_name: string
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  estimated_revenue: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
  pm_label: string | null
  can_view_financials: boolean
  risk_flag: 'healthy' | 'warning' | 'risk'
  budget_status: 'missing' | 'ready'
  freelancer_status: 'missing' | 'assigned'
}

function formatDateRange(start: string | null, end: string | null) {
  if (!start && !end) return 'Dates not set'

  const format = (value: string | null) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString()
  }

  return `${format(start)} - ${format(end)}`
}

function statusTone(status: string | null): 'info' | 'success' | 'warning' | 'default' {
  const normalized = (status ?? '').toLowerCase()
  if (normalized === 'active' || normalized === 'in_progress') return 'info'
  if (normalized === 'completed') return 'success'
  if (normalized === 'draft' || normalized === 'planning') return 'warning'
  return 'default'
}

function toDateValue(value: string | null) {
  if (!value) return null
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return null
  return date
}

function metricTone(margin: number | null | undefined): 'default' | 'success' | 'warning' | 'danger' {
  const value = Number(margin ?? 0)
  if (value < 45) return 'danger'
  if (value < 50) return 'warning'
  if (value >= 60) return 'success'
  return 'default'
}

function toneClass(tone: 'default' | 'success' | 'warning' | 'danger') {
  if (tone === 'success') return 'border-emerald-500/20 bg-emerald-500/[0.07]'
  if (tone === 'warning') return 'border-amber-500/20 bg-amber-500/[0.07]'
  if (tone === 'danger') return 'border-rose-500/20 bg-rose-500/[0.07]'
  return 'border-white/10 bg-white/[0.03]'
}

export function AllShowsPageShell({ shows }: { shows: Show[] }) {
  const [search, setSearch] = useState('')
  const [startDateFilter, setStartDateFilter] = useState('')
  const [endDateFilter, setEndDateFilter] = useState('')
  const [pmFilter, setPmFilter] = useState('all')

  const pmOptions = useMemo(() => {
    return Array.from(
      new Set(
        shows
          .map((show) => show.pm_label?.trim())
          .filter((value): value is string => Boolean(value))
      )
    ).sort((a, b) => a.localeCompare(b))
  }, [shows])

  const filteredShows = useMemo(() => {
    const startBoundary = startDateFilter ? new Date(`${startDateFilter}T00:00:00`) : null
    const endBoundary = endDateFilter ? new Date(`${endDateFilter}T23:59:59`) : null

    return shows.filter((show) => {
      const haystack = [
        show.show_name,
        show.show_number ?? '',
        show.client_name ?? '',
        show.venue_name ?? '',
        show.city ?? '',
        show.state ?? '',
        show.pm_label ?? '',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !search || haystack.includes(search.toLowerCase())
      const matchesPm =
        pmFilter === 'all' || (show.pm_label ?? 'Unassigned') === pmFilter

      const showStart = toDateValue(show.start_date)
      const showEnd = toDateValue(show.end_date) ?? showStart

      let matchesDateRange = true

      if (startBoundary || endBoundary) {
        if (!showStart && !showEnd) {
          matchesDateRange = false
        } else {
          const effectiveStart = showStart ?? showEnd
          const effectiveEnd = showEnd ?? showStart

          if (startBoundary && effectiveEnd && effectiveEnd < startBoundary) {
            matchesDateRange = false
          }

          if (endBoundary && effectiveStart && effectiveStart > endBoundary) {
            matchesDateRange = false
          }
        }
      }

      return matchesSearch && matchesPm && matchesDateRange
    })
  }, [shows, search, startDateFilter, endDateFilter, pmFilter])

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shows"
        actions={
          <Link href="/shows/new">
            <Button>Create Show</Button>
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-[24px] border p-5 ${toneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Shows
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {filteredShows.length}
          </div>
        </div>

        <div className={`rounded-[24px] border p-5 ${toneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Revenue
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(
              filteredShows.reduce((sum, show) => sum + Number(show.estimated_revenue ?? 0), 0)
            )}
          </div>
        </div>

        <div className={`rounded-[24px] border p-5 ${toneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Profit
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(
              filteredShows.reduce((sum, show) => sum + Number(show.projected_profit ?? 0), 0)
            )}
          </div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${toneClass(
            metricTone(
              filteredShows.length
                ? filteredShows.reduce((sum, show) => sum + Number(show.margin_percent ?? 0), 0) /
                    filteredShows.length
                : 0
            )
          )}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Avg Margin
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {filteredShows.length
              ? `${(
                  filteredShows.reduce((sum, show) => sum + Number(show.margin_percent ?? 0), 0) /
                  filteredShows.length
                ).toFixed(1)}%`
              : '0.0%'}
          </div>
        </div>
      </div>

      <PageSection
        title="Show Repository"
        actions={
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:flex-row xl:items-center">
            <div className="w-full xl:w-72">
              <SearchInput
                value={search}
                onChange={setSearch}
                placeholder="Search show, client, venue, PM, or market..."
              />
            </div>

            <input
              type="date"
              value={startDateFilter}
              onChange={(e) => setStartDateFilter(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white"
            />

            <input
              type="date"
              value={endDateFilter}
              onChange={(e) => setEndDateFilter(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white"
            />

            <select
              value={pmFilter}
              onChange={(e) => setPmFilter(e.target.value)}
              className="h-10 rounded-xl border border-white/10 bg-white/[0.03] px-3 text-sm text-white"
            >
              <option value="all" className="bg-slate-900 text-white">
                All PMs
              </option>
              <option value="Unassigned" className="bg-slate-900 text-white">
                Unassigned
              </option>
              {pmOptions.map((pm) => (
                <option key={pm} value={pm} className="bg-slate-900 text-white">
                  {pm}
                </option>
              ))}
            </select>

            <Button
              variant="secondary"
              onClick={() => {
                setSearch('')
                setStartDateFilter('')
                setEndDateFilter('')
                setPmFilter('all')
              }}
            >
              Clear
            </Button>
          </div>
        }
      >
        {!filteredShows.length ? (
          <EmptyState
            title="No shows found"
            description="No shows match your current search or filters."
            action={
              <Link href="/shows/new">
                <Button>Create Show</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-white/[0.03] text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Show</th>
                    <th className="px-4 py-3 font-semibold">Dates</th>
                    <th className="px-4 py-3 font-semibold">Project Manager</th>
                    <th className="px-4 py-3 font-semibold">Location</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Financials</th>
                    <th className="px-4 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {filteredShows.map((show) => (
                    <tr
                      key={show.show_id}
                      className="border-t border-white/10 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 align-middle">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-semibold text-white">
                              {show.show_name}
                            </p>
                            {show.show_number ? (
                              <StatusBadge label={`#${show.show_number}`} />
                            ) : null}
                          </div>
                          <p className="truncate text-xs text-slate-500">
                            {show.client_name ?? 'No client'}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle text-slate-300">
                        {formatDateRange(show.start_date, show.end_date)}
                      </td>

                      <td className="px-4 py-3 align-middle text-slate-300">
                        {show.pm_label ?? 'Unassigned'}
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="min-w-0">
                          <p className="truncate text-white">
                            {show.venue_name ?? 'Venue not set'}
                          </p>
                          <p className="truncate text-xs text-slate-500">
                            {[show.city, show.state].filter(Boolean).join(', ') || 'Location not set'}
                          </p>
                        </div>
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <StatusBadge
                          label={show.status ?? 'draft'}
                          tone={statusTone(show.status)}
                        />
                      </td>

                      <td className="px-4 py-3 align-middle">
                        {show.can_view_financials ? (
                          <div className="space-y-1">
                            <p className="text-white">
                              Revenue {formatCurrency(show.estimated_revenue)}
                            </p>
                            <p className="text-xs text-slate-500">
                              Profit {formatCurrency(show.projected_profit)} ·{' '}
                              {Number(show.margin_percent ?? 0).toFixed(1)}%
                            </p>
                          </div>
                        ) : (
                          <p className="text-slate-500">Restricted</p>
                        )}
                      </td>

                      <td className="px-4 py-3 align-middle">
                        <div className="flex justify-end">
                          <Link href={`/shows/${show.show_id}/show-details`}>
                            <Button size="sm">Open Show</Button>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </PageSection>
    </div>
  )
}