'use client'

import { useEffect, useMemo, useRef, useState } from 'react'

export type VenueSelectOption = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  is_active?: boolean
}

type VenueSelectFieldsProps = {
  venues: VenueSelectOption[]
  initialVenueId?: string | null
  initialVenueName?: string
  initialCity?: string
  initialState?: string
  initialVenueContactName?: string
  initialVenueContactEmail?: string
  initialVenueContactPhone?: string
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

export function VenueSelectFields({
  venues,
  initialVenueId = '',
  initialVenueName = '',
  initialCity = '',
  initialState = '',
  initialVenueContactName = '',
  initialVenueContactEmail = '',
  initialVenueContactPhone = '',
}: VenueSelectFieldsProps) {
  const activeVenues = useMemo(
    () => venues.filter((venue) => venue.is_active !== false),
    [venues]
  )

  const [selectedVenueId, setSelectedVenueId] = useState(initialVenueId || '')
  const [venueName, setVenueName] = useState(initialVenueName)
  const [city, setCity] = useState(initialCity)
  const [state, setState] = useState(initialState)
  const [venueContactName, setVenueContactName] = useState(initialVenueContactName)
  const [venueContactEmail, setVenueContactEmail] = useState(initialVenueContactEmail)
  const [venueContactPhone, setVenueContactPhone] = useState(initialVenueContactPhone)
  const [isOpen, setIsOpen] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const wrapperRef = useRef<HTMLDivElement | null>(null)

  const filteredVenues = useMemo(() => {
    const query = venueName.trim().toLowerCase()

    if (!query) return []

    return activeVenues
      .filter((venue) => {
        const haystack = [
          venue.name,
          venue.city,
          venue.state,
          venue.address,
          venue.primary_contact_name,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()

        return haystack.includes(query)
      })
      .slice(0, 8)
  }, [activeVenues, venueName])

  useEffect(() => {
    setHighlightedIndex(0)
  }, [venueName])

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!wrapperRef.current) return
      if (!wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function applyVenue(venue: VenueSelectOption) {
    setSelectedVenueId(venue.id)
    setVenueName(venue.name || '')
    setCity(venue.city || '')
    setState(venue.state || '')
    setVenueContactName(venue.primary_contact_name || '')
    setVenueContactEmail(venue.primary_contact_email || '')
    setVenueContactPhone(venue.primary_contact_phone || '')
    setIsOpen(false)
  }

  return (
    <div className="space-y-6">
      <input type="hidden" name="venueId" value={selectedVenueId} />

      <div className="grid gap-4 md:grid-cols-2">
        <div ref={wrapperRef} className="relative">
          <label className="block text-sm font-medium text-slate-300">Venue Name</label>
          <input
            name="venueName"
            value={venueName}
            onChange={(e) => {
              const nextValue = e.target.value
              setVenueName(nextValue)
              setSelectedVenueId('')
              setIsOpen(nextValue.trim().length > 0)
            }}
            onFocus={() => {
              if (venueName.trim()) {
                setIsOpen(true)
              }
            }}
            onKeyDown={(e) => {
              if (!filteredVenues.length) return

              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setIsOpen(true)
                setHighlightedIndex((prev) =>
                  prev < filteredVenues.length - 1 ? prev + 1 : prev
                )
              }

              if (e.key === 'ArrowUp') {
                e.preventDefault()
                setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0))
              }

              if (e.key === 'Enter' && isOpen && filteredVenues[highlightedIndex]) {
                e.preventDefault()
                applyVenue(filteredVenues[highlightedIndex])
              }

              if (e.key === 'Escape') {
                setIsOpen(false)
              }
            }}
            required
            autoComplete="off"
            placeholder="Start typing venue name..."
            className={fieldClass()}
          />

          {isOpen && filteredVenues.length > 0 ? (
            <div className="absolute z-20 mt-2 max-h-64 w-full overflow-auto rounded-2xl border border-white/10 bg-slate-900 shadow-2xl">
              {filteredVenues.map((venue, index) => (
                <button
                  key={venue.id}
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => applyVenue(venue)}
                  className={`block w-full px-3 py-2 text-left text-sm transition ${
                    highlightedIndex === index
                      ? 'bg-white/[0.06]'
                      : 'bg-transparent'
                  } hover:bg-white/[0.06]`}
                >
                  <div className="font-medium text-white">{venue.name}</div>
                  <div className="text-xs text-slate-500">
                    {[venue.city, venue.state].filter(Boolean).join(', ') || 'No location'}
                  </div>
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">City</label>
          <input
            name="city"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            required
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-slate-300">State</label>
          <input
            name="state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            required
            className={fieldClass()}
          />
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4">
        <h3 className="text-lg font-semibold text-white">Venue Point of Contact</h3>

        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-300">Name</label>
            <input
              name="venueContactName"
              value={venueContactName}
              onChange={(e) => setVenueContactName(e.target.value)}
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              name="venueContactEmail"
              type="email"
              value={venueContactEmail}
              onChange={(e) => setVenueContactEmail(e.target.value)}
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Phone</label>
            <input
              name="venueContactPhone"
              value={venueContactPhone}
              onChange={(e) => setVenueContactPhone(e.target.value)}
              className={fieldClass()}
            />
          </div>
        </div>
      </div>
    </div>
  )
}