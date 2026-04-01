'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AllShowsTable } from './all-shows-table'

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
}

export function AllShowsPageShell({ shows }: { shows: Show[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filteredShows = useMemo(() => {
    return shows.filter((show) => {
      const haystack = [
        show.show_name,
        show.show_number ?? '',
        show.client_name ?? '',
        show.venue_name ?? '',
        show.city ?? '',
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !search || haystack.includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' || (show.status ?? 'draft') === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [shows, search, statusFilter])

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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search shows"
            className="rounded-lg border border-slate-300 px-3 py-2"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="quoted">Quoted</option>
            <option value="confirmed">Confirmed</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      <AllShowsTable shows={filteredShows} />
    </div>
  )
}