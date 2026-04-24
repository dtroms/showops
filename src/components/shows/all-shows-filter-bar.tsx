'use client'

import { AllShowsSortSelect } from './all-shows-sort-select'

type AllShowsFilterBarProps = {
  search: string
  onSearchChange: (value: string) => void
  status: string
  onStatusChange: (value: string) => void
  client: string
  onClientChange: (value: string) => void
  venue: string
  onVenueChange: (value: string) => void
  city: string
  onCityChange: (value: string) => void
  sort: string
  onSortChange: (value: string) => void
  clients: string[]
  venues: string[]
  cities: string[]
}

export function AllShowsFilterBar(props: AllShowsFilterBarProps) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <input
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="Search shows"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white placeholder:text-slate-500"
        />

        <select
          value={props.status}
          onChange={(e) => props.onStatusChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
        >
          <option value="all" className="bg-slate-900 text-white">All Statuses</option>
          <option value="draft" className="bg-slate-900 text-white">Draft</option>
          <option value="quoted" className="bg-slate-900 text-white">Quoted</option>
          <option value="confirmed" className="bg-slate-900 text-white">Confirmed</option>
          <option value="in_progress" className="bg-slate-900 text-white">In Progress</option>
          <option value="completed" className="bg-slate-900 text-white">Completed</option>
          <option value="archived" className="bg-slate-900 text-white">Archived</option>
        </select>

        <select
          value={props.client}
          onChange={(e) => props.onClientChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
        >
          <option value="all" className="bg-slate-900 text-white">All Clients</option>
          {props.clients.map((client) => (
            <option key={client} value={client} className="bg-slate-900 text-white">
              {client}
            </option>
          ))}
        </select>

        <select
          value={props.venue}
          onChange={(e) => props.onVenueChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
        >
          <option value="all" className="bg-slate-900 text-white">All Venues</option>
          {props.venues.map((venue) => (
            <option key={venue} value={venue} className="bg-slate-900 text-white">
              {venue}
            </option>
          ))}
        </select>

        <select
          value={props.city}
          onChange={(e) => props.onCityChange(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
        >
          <option value="all" className="bg-slate-900 text-white">All Cities</option>
          {props.cities.map((cityName) => (
            <option key={cityName} value={cityName} className="bg-slate-900 text-white">
              {cityName}
            </option>
          ))}
        </select>

        <AllShowsSortSelect value={props.sort} onChange={props.onSortChange} />
      </div>
    </div>
  )
}