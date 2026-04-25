'use client'

import { useMemo, useState } from 'react'
import { VenuesFilterBar } from '@/components/master-data/venues/venues-filter-bar'
import { VenuesTable } from '@/components/master-data/venues/venues-table'
import { VenueFormModal } from '@/components/master-data/venues/venue-form-modal'

type Venue = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  primary_contact_name: string | null
  primary_contact_role: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  is_active: boolean
}

export function VenuesPageShell({ venues }: { venues: Venue[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editingVenue, setEditingVenue] = useState<Venue | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    return venues.filter((venue) => {
      const query = search.toLowerCase()

      const matchesSearch =
        !search ||
        venue.name.toLowerCase().includes(query) ||
        (venue.address || '').toLowerCase().includes(query) ||
        (venue.city || '').toLowerCase().includes(query) ||
        (venue.state || '').toLowerCase().includes(query) ||
        (venue.primary_contact_name || '').toLowerCase().includes(query)

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? venue.is_active : !venue.is_active)

      return matchesSearch && matchesStatus
    })
  }, [venues, search, statusFilter])

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Venues</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your reusable venue repository for shows, contacts, and location details.
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Add Venue
          </button>
        </div>
      </div>

      <VenuesFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <VenuesTable venues={filtered} onEdit={setEditingVenue} />

      {createOpen ? (
        <VenueFormModal mode="create" onClose={() => setCreateOpen(false)} />
      ) : null}

      {editingVenue ? (
        <VenueFormModal
          mode="edit"
          venue={editingVenue}
          onClose={() => setEditingVenue(null)}
        />
      ) : null}
    </div>
  )
}