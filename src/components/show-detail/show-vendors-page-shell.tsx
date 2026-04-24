'use client'

import { useEffect, useMemo, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import {
  addVendorToShowFromShowPartners,
  removeVendorFromShowFromShowPartners,
} from '@/app/actions/show-vendors'

type AssignedVendor = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
}

type FreelancerRecord = {
  id: string
  vendorId: string
  vendorName: string
  serviceType: string | null
  email: string | null
  phone: string | null
  defaultCost: number | null
  preferredVendor: boolean
  travelAvailable: boolean
  averageRating: number | null
  ratingCount: number
  serviceAreaCity: string | null
  serviceAreaState: string | null
  serviceAreaPostalCode: string | null
  serviceAreaCountry: string | null
  serviceAreaNotes: string | null
  distanceMiles: number | null
  matchReason: string
  alreadyAssigned: boolean
}

type NearbyVendor = {
  id: string
  vendorId: string
  vendorName: string
  serviceType: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  website: string | null
  vendorNotes: string | null
  preferredVendor: boolean
  nationwideCoverage: boolean
  serviceAreaCity: string | null
  serviceAreaState: string | null
  serviceAreaPostalCode: string | null
  serviceAreaCountry: string | null
  serviceRadiusMiles: number | null
  serviceMode: 'local' | 'regional' | 'national' | null
  serviceAreaNotes: string | null
  distanceMiles: number | null
  matchReason: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatDistance(value: number | null) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value)} mi`
}

function formatRate(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function fieldClass() {
  return 'w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none'
}

function panelClass() {
  return 'rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
}

function metricCardClass() {
  return 'rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
}

function smallStatClass() {
  return 'rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3'
}

function RatingDisplay({
  average,
  count,
}: {
  average?: number | null
  count?: number | null
}) {
  if (!count) {
    return <span className="text-xs text-slate-500">No ratings</span>
  }

  const rounded = Math.max(0, Math.min(5, Math.round(average ?? 0)))
  const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded)

  return (
    <div className="space-y-1 text-right">
      <p className="text-sm text-amber-300">{stars}</p>
      <p className="text-xs text-slate-500">
        {(average ?? 0).toFixed(1)} ({count})
      </p>
    </div>
  )
}

function Tag({
  children,
  tone = 'default',
}: {
  children: React.ReactNode
  tone?: 'default' | 'success' | 'warning' | 'info'
}) {
  const toneClass =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
      : tone === 'warning'
        ? 'border-amber-500/20 bg-amber-500/15 text-amber-300'
        : tone === 'info'
          ? 'border-sky-500/20 bg-sky-500/15 text-sky-300'
          : 'border-white/10 bg-white/10 text-slate-300'

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-1 text-[11px] font-semibold',
        toneClass
      )}
    >
      {children}
    </span>
  )
}

function AddFreelancerButton({
  showId,
  vendorId,
  label = 'Add to Show',
  compact = false,
}: {
  showId: string
  vendorId: string
  label?: string
  compact?: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await addVendorToShowFromShowPartners(formData)
        })
      }}
    >
      <input type="hidden" name="showId" value={showId} />
      <input type="hidden" name="vendorId" value={vendorId} />
      <button
        type="submit"
        disabled={pending}
        className={
          compact
            ? 'rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-950 disabled:opacity-50'
            : 'rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50'
        }
      >
        {pending ? 'Adding...' : label}
      </button>
    </form>
  )
}

function RemoveFreelancerButton({
  showId,
  assignmentId,
}: {
  showId: string
  assignmentId: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await removeVendorFromShowFromShowPartners(formData)
        })
      }}
    >
      <input type="hidden" name="showId" value={showId} />
      <input type="hidden" name="assignmentId" value={assignmentId} />
      <button
        type="submit"
        disabled={pending}
        className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-300 disabled:opacity-50"
      >
        {pending ? 'Removing...' : 'Remove'}
      </button>
    </form>
  )
}

function FreelancerCard({
  showId,
  freelancer,
}: {
  showId: string
  freelancer: FreelancerRecord
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-lg font-semibold text-white">
              {freelancer.vendorName}
            </p>

            {freelancer.preferredVendor ? <Tag tone="warning">Preferred</Tag> : null}
            {freelancer.alreadyAssigned ? <Tag tone="success">Assigned</Tag> : null}
            {freelancer.travelAvailable ? <Tag tone="info">Will Travel</Tag> : null}
          </div>

          <p className="mt-1 text-sm text-slate-400">
            {freelancer.serviceType ?? 'Freelancer'}
          </p>
        </div>

        <RatingDisplay
          average={freelancer.averageRating}
          count={freelancer.ratingCount}
        />
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className={smallStatClass()}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Market
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {[freelancer.serviceAreaCity, freelancer.serviceAreaState]
              .filter(Boolean)
              .join(', ') || '—'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatDistance(freelancer.distanceMiles)} •{' '}
            {freelancer.travelAvailable ? 'Will travel' : 'Local only'}
          </p>
        </div>

        <div className={smallStatClass()}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Contact
          </p>
          <p className="mt-1 text-sm font-medium text-white">
            {freelancer.email ?? 'No email'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {freelancer.phone ?? 'No phone'}
          </p>
        </div>
      </div>

      <div className={cn('mt-4', smallStatClass())}>
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Day Rate / Match Reason
        </p>
        <p className="mt-1 text-sm font-medium text-white">
          {formatRate(freelancer.defaultCost)}
        </p>
        <p className="mt-1 text-xs text-slate-500">{freelancer.matchReason}</p>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/vendors/freelance/${freelancer.vendorId}`}
          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
        >
          Open Profile
        </Link>

        {freelancer.alreadyAssigned ? (
          <span className="rounded-2xl border border-white/10 px-4 py-2 text-sm text-slate-500">
            Already assigned
          </span>
        ) : (
          <AddFreelancerButton showId={showId} vendorId={freelancer.vendorId} />
        )}
      </div>
    </div>
  )
}

export function ShowVendorsPageShell({
  showId,
  showName,
  venueName,
  venueCity,
  venueState,
  assignedVendors,
  nearbyFreelancers,
  allFreelancers,
  nearbyVendors,
}: {
  showId: string
  showName: string
  venueName: string | null
  venueCity: string | null
  venueState: string | null
  assignedVendors: AssignedVendor[]
  nearbyFreelancers: FreelancerRecord[]
  allFreelancers: FreelancerRecord[]
  nearbyVendors: NearbyVendor[]
}) {
  const [assignedSearch, setAssignedSearch] = useState('')
  const [discoverySearch, setDiscoverySearch] = useState('')
  const [showFreelancers, setShowFreelancers] = useState(true)
  const [showVendorPartners, setShowVendorPartners] = useState(false)
  const [freelancerSearch, setFreelancerSearch] = useState('')
  const [searchOpen, setSearchOpen] = useState(false)
  const searchRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!searchRef.current) return
      if (!searchRef.current.contains(event.target as Node)) {
        setSearchOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredAssigned = useMemo(() => {
    return assignedVendors.filter((vendor) => {
      const haystack = [
        vendor.vendor_name_snapshot,
        vendor.service_type_snapshot ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return !assignedSearch || haystack.includes(assignedSearch.toLowerCase())
    })
  }, [assignedVendors, assignedSearch])

  const filteredFreelancers = useMemo(() => {
    return nearbyFreelancers.filter((vendor) => {
      const haystack = [
        vendor.vendorName,
        vendor.serviceType ?? '',
        vendor.email ?? '',
        vendor.phone ?? '',
        vendor.serviceAreaCity ?? '',
        vendor.serviceAreaState ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return !discoverySearch || haystack.includes(discoverySearch.toLowerCase())
    })
  }, [nearbyFreelancers, discoverySearch])

  const filteredVendors = useMemo(() => {
    return nearbyVendors.filter((vendor) => {
      const haystack = [
        vendor.vendorName,
        vendor.serviceType ?? '',
        vendor.contactName ?? '',
        vendor.email ?? '',
        vendor.phone ?? '',
        vendor.serviceAreaCity ?? '',
        vendor.serviceAreaState ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return !discoverySearch || haystack.includes(discoverySearch.toLowerCase())
    })
  }, [nearbyVendors, discoverySearch])

  const freelancerSuggestions = useMemo(() => {
    const trimmed = freelancerSearch.trim().toLowerCase()
    if (!trimmed) return []

    return allFreelancers
      .filter((freelancer) => {
        const haystack = [
          freelancer.vendorName,
          freelancer.serviceType ?? '',
          freelancer.email ?? '',
          freelancer.phone ?? '',
          freelancer.serviceAreaCity ?? '',
          freelancer.serviceAreaState ?? '',
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(trimmed)
      })
      .slice(0, 8)
  }, [allFreelancers, freelancerSearch])

  return (
    <div className="space-y-6">
      <div className={panelClass()}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight text-white">
              Freelancers & Vendors
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              {showName}
              {venueName ? ` · ${venueName}` : ''}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs text-slate-400">
            {venueCity || venueState ? (
              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1">
                Market: {[venueCity, venueState].filter(Boolean).join(', ')}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={metricCardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Assigned
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {assignedVendors.length}
          </p>
        </div>

        <div className={metricCardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Nearby Freelancers
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {nearbyFreelancers.length}
          </p>
        </div>

        <div className={metricCardClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Nearby Vendors
          </p>
          <p className="mt-3 text-3xl font-semibold tracking-tight text-white">
            {nearbyVendors.length}
          </p>
        </div>
      </div>

      <div className={panelClass()}>
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold tracking-tight text-white">
              Assigned Freelancers
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Already tied to this show and available in budgeting.
            </p>
          </div>

          <input
            value={assignedSearch}
            onChange={(e) => setAssignedSearch(e.target.value)}
            placeholder="Search assigned freelancers..."
            className="w-full max-w-sm rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none"
          />
        </div>

        {!filteredAssigned.length ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            No assigned freelancers match your search.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-2">
            {filteredAssigned.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-semibold text-white">
                      {vendor.vendor_name_snapshot}
                    </p>
                    <p className="mt-1 text-sm text-slate-400">
                      {vendor.service_type_snapshot ?? 'Freelancer'}
                    </p>
                  </div>

                  <Tag tone="success">Assigned</Tag>
                </div>

                <div className={cn('mt-4', smallStatClass())}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Default Day Rate
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatRate(vendor.default_day_rate_snapshot)}
                  </p>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {vendor.vendor_id ? (
                    <Link
                      href={`/vendors/freelance/${vendor.vendor_id}`}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                    >
                      Open Freelancer
                    </Link>
                  ) : null}

                  <RemoveFreelancerButton showId={showId} assignmentId={vendor.id} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className={panelClass()}>
          <div className="mb-4">
            <h3 className="text-lg font-semibold tracking-tight text-white">
              Find Any Freelancer
            </h3>
            <p className="mt-1 text-sm text-slate-400">
              Search the full freelancer database and assign directly to this show.
            </p>
          </div>

          <div ref={searchRef} className="relative">
            <input
              value={freelancerSearch}
              onChange={(e) => {
                setFreelancerSearch(e.target.value)
                setSearchOpen(true)
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Start typing a freelancer name, service, email, or market..."
              className={fieldClass()}
            />

            {searchOpen && freelancerSearch.trim().length > 0 ? (
              <div className="absolute z-20 mt-2 max-h-96 w-full overflow-y-auto rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
                {!freelancerSuggestions.length ? (
                  <div className="px-3 py-3 text-sm text-slate-500">
                    No freelancers matched your search.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {freelancerSuggestions.map((freelancer) => (
                      <div
                        key={`${freelancer.vendorId}-${freelancer.id}`}
                        className="flex items-center justify-between gap-3 rounded-xl px-3 py-3 hover:bg-white/5"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-white">
                            {freelancer.vendorName}
                          </p>
                          <p className="mt-1 truncate text-xs text-slate-500">
                            {[
                              freelancer.serviceType,
                              freelancer.email,
                              freelancer.serviceAreaCity,
                              freelancer.serviceAreaState,
                            ]
                              .filter(Boolean)
                              .join(' • ')}
                          </p>
                        </div>

                        {freelancer.alreadyAssigned ? (
                          <span className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-slate-500">
                            Assigned
                          </span>
                        ) : (
                          <AddFreelancerButton
                            showId={showId}
                            vendorId={freelancer.vendorId}
                            label="Assign"
                            compact
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}
          </div>
        </div>

        <div className={panelClass()}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-lg font-semibold text-white">Nearby Freelancers</p>
              <p className="text-sm text-slate-400">
                Venue-based recommendations for local coverage.
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 lg:w-auto lg:flex-row lg:items-center">
              <input
                value={discoverySearch}
                onChange={(e) => setDiscoverySearch(e.target.value)}
                placeholder="Search nearby freelancers and vendor partners..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none lg:w-80"
              />
              <button
                type="button"
                onClick={() => setShowFreelancers((prev) => !prev)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
              >
                {showFreelancers ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>

        {showFreelancers ? (
          <div className={panelClass()}>
            {!filteredFreelancers.length ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
                No matching nearby freelancers found.
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {filteredFreelancers.map((freelancer) => (
                  <FreelancerCard
                    key={freelancer.id}
                    showId={showId}
                    freelancer={freelancer}
                  />
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="space-y-4">
        <div className={panelClass()}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-lg font-semibold text-white">Nearby Vendor Partners</p>
              <p className="text-sm text-slate-400">
                Business vendors that can support this market.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowVendorPartners((prev) => !prev)}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {showVendorPartners ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        {showVendorPartners ? (
          <div className={panelClass()}>
            {!filteredVendors.length ? (
              <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
                No matching nearby vendor partners found.
              </div>
            ) : (
              <div className="space-y-4">
                {filteredVendors.map((vendor) => (
                  <div
                    key={vendor.id}
                    className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5"
                  >
                    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-lg font-semibold text-white">
                            {vendor.vendorName}
                          </p>

                          {vendor.preferredVendor ? <Tag tone="warning">Preferred</Tag> : null}
                          {vendor.nationwideCoverage ? <Tag tone="info">Nationwide</Tag> : null}
                        </div>

                        <p className="text-sm text-slate-400">
                          {[vendor.serviceType, vendor.matchReason]
                            .filter(Boolean)
                            .join(' • ')}
                        </p>

                        <div className="grid gap-3 md:grid-cols-3">
                          <div className={smallStatClass()}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Contact
                            </p>
                            <p className="mt-1 text-sm font-medium text-white">
                              {vendor.contactName ?? '—'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">{vendor.email ?? '—'}</p>
                            <p className="mt-1 text-xs text-slate-500">{vendor.phone ?? '—'}</p>
                          </div>

                          <div className={smallStatClass()}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Service Area
                            </p>
                            <p className="mt-1 text-sm font-medium text-white">
                              {[vendor.serviceAreaCity, vendor.serviceAreaState]
                                .filter(Boolean)
                                .join(', ') || 'General coverage'}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {(vendor.serviceMode ?? '—') +
                                (vendor.serviceRadiusMiles ? ` • ${vendor.serviceRadiusMiles} mi` : '')}
                            </p>
                          </div>

                          <div className={smallStatClass()}>
                            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                              Distance
                            </p>
                            <p className="mt-1 text-sm font-medium text-white">
                              {formatDistance(vendor.distanceMiles)}
                            </p>
                          </div>
                        </div>

                        {vendor.serviceAreaNotes || vendor.vendorNotes ? (
                          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-slate-300">
                            {vendor.serviceAreaNotes ? (
                              <p>
                                <span className="font-medium text-white">Area Notes:</span>{' '}
                                {vendor.serviceAreaNotes}
                              </p>
                            ) : null}
                            {vendor.vendorNotes ? (
                              <p className={vendor.serviceAreaNotes ? 'mt-1' : ''}>
                                <span className="font-medium text-white">Vendor Notes:</span>{' '}
                                {vendor.vendorNotes}
                              </p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Link
                          href={`/vendors/business/${vendor.vendorId}`}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10 hover:text-white"
                        >
                          Open Profile
                        </Link>
                        {vendor.website ? (
                          <a
                            href={vendor.website}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 hover:bg-slate-100"
                          >
                            Website
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}