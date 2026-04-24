'use client'

import { useTransition } from 'react'
import { toggleVenueActive } from '@/app/actions/venues'
import { VenueStatusBadge } from './venue-status-badge'

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

export function VenuesTable({
  venues,
  onEdit,
}: {
  venues: Venue[]
  onEdit: (venue: Venue) => void
}) {
  const [pending, startTransition] = useTransition()

  if (!venues.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
        No venues found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Venue</th>
            <th className="px-4 py-3 font-semibold">Location</th>
            <th className="px-4 py-3 font-semibold">Primary Contact</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {venues.map((venue) => (
            <tr key={venue.id} className="border-t border-white/10 align-top hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-white">{venue.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{venue.notes ?? '—'}</p>
                </div>
              </td>

              <td className="px-4 py-3">
                <div>
                  <p className="text-slate-300">{venue.address ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {[venue.city, venue.state].filter(Boolean).join(', ') || '—'}
                  </p>
                </div>
              </td>

              <td className="px-4 py-3">
                <div>
                  <p className="text-slate-300">{venue.primary_contact_name ?? '—'}</p>
                  <p className="text-xs text-slate-500">
                    {venue.primary_contact_role ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {venue.primary_contact_email ?? '—'}
                  </p>
                  <p className="text-xs text-slate-500">
                    {venue.primary_contact_phone ?? '—'}
                  </p>
                </div>
              </td>

              <td className="px-4 py-3">
                <VenueStatusBadge isActive={venue.is_active} />
              </td>

              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(venue)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Edit
                  </button>

                  <form
                    action={(formData) => {
                      startTransition(async () => {
                        await toggleVenueActive(formData)
                      })
                    }}
                  >
                    <input type="hidden" name="venueId" value={venue.id} />
                    <input
                      type="hidden"
                      name="nextValue"
                      value={String(!venue.is_active)}
                    />
                    <button
                      disabled={pending}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      {venue.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}