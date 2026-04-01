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
    <div className="rounded-2xl border bg-white p-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <input
          value={props.search}
          onChange={(e) => props.onSearchChange(e.target.value)}
          placeholder="Search shows"
          className="rounded-lg border px-3 py-2"
        />

        <select
          value={props.status}
          onChange={(e) => props.onStatusChange(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="quoted">Quoted</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={props.client}
          onChange={(e) => props.onClientChange(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Clients</option>
          {props.clients.map((client) => (
            <option key={client} value={client}>
              {client}
            </option>
          ))}
        </select>

        <select
          value={props.venue}
          onChange={(e) => props.onVenueChange(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Venues</option>
          {props.venues.map((venue) => (
            <option key={venue} value={venue}>
              {venue}
            </option>
          ))}
        </select>

        <select
          value={props.city}
          onChange={(e) => props.onCityChange(e.target.value)}
          className="rounded-lg border px-3 py-2"
        >
          <option value="all">All Cities</option>
          {props.cities.map((cityName) => (
            <option key={cityName} value={cityName}>
              {cityName}
            </option>
          ))}
        </select>

        <AllShowsSortSelect value={props.sort} onChange={props.onSortChange} />
      </div>
    </div>
  )
}