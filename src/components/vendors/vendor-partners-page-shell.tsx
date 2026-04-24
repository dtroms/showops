'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'

type VendorRecord = {
  id: string
  vendor_name: string
  vendor_type: string | null
  partner_kind?: string | null
  freelancer_name?: string | null
  business_name?: string | null
  service_type: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  website?: string | null
  default_cost: number | null
  notes: string | null
  travel_notes?: string | null
  travel_available?: boolean | null
  preferred_vendor?: boolean | null
  nationwide_coverage?: boolean | null
  average_rating?: number | null
  rating_count?: number | null
  is_active: boolean
  primary_service_area?: {
    label: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    service_radius_miles: number | null
    service_mode: 'local' | 'regional' | 'national' | null
    notes: string | null
  } | null
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function statusClasses(isActive: boolean) {
  return isActive
    ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
    : 'border-white/10 bg-white/10 text-slate-400'
}

function tabClasses(active: boolean) {
  return active
    ? 'border-white bg-white text-slate-950'
    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
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

  const rounded = Math.round(average ?? 0)
  const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded)

  return (
    <div className="space-y-1">
      <p className="text-sm text-amber-300">{stars}</p>
      <p className="text-xs text-slate-500">
        {(average ?? 0).toFixed(1)} ({count})
      </p>
    </div>
  )
}

export function VendorPartnersPageShell({
  title,
  description,
  partnerKind,
  vendors,
}: {
  title: string
  description: string
  partnerKind: 'business' | 'freelancer'
  vendors: VendorRecord[]
}) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>(
    'active'
  )

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const primaryName =
        partnerKind === 'freelancer'
          ? vendor.freelancer_name || vendor.vendor_name || ''
          : vendor.business_name || vendor.vendor_name || ''

      const market = vendor.primary_service_area
        ? `${vendor.primary_service_area.city ?? ''} ${vendor.primary_service_area.state ?? ''}`
        : ''

      const haystack = [
        primaryName,
        vendor.business_name ?? '',
        vendor.freelancer_name ?? '',
        vendor.service_type ?? '',
        vendor.contact_name ?? '',
        vendor.email ?? '',
        vendor.phone ?? '',
        market,
      ]
        .join(' ')
        .toLowerCase()

      const matchesSearch = !search || haystack.includes(search.toLowerCase())
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? vendor.is_active : !vendor.is_active)

      return matchesSearch && matchesStatus
    })
  }, [vendors, search, statusFilter, partnerKind])

  const createHref =
    partnerKind === 'freelancer' ? '/vendors/freelance/new' : '/vendors/business/new'

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">{title}</h1>
            <p className="mt-2 text-sm text-slate-400">{description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/vendors/business"
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${tabClasses(
                partnerKind === 'business'
              )}`}
            >
              Vendor Partners
            </Link>

            <Link
              href="/vendors/freelance"
              className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${tabClasses(
                partnerKind === 'freelancer'
              )}`}
            >
              Freelance Partners
            </Link>

            <Link
              href={createHref}
              className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
            >
              Add Vendor
            </Link>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              partnerKind === 'freelancer'
                ? 'Search freelancers'
                : 'Search vendor partners'
            }
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')
            }
            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none"
          >
            <option value="active" className="bg-slate-900 text-white">Active</option>
            <option value="inactive" className="bg-slate-900 text-white">Inactive</option>
            <option value="all" className="bg-slate-900 text-white">All Statuses</option>
          </select>
        </div>
      </div>

      {!filteredVendors.length ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
          <p className="text-sm font-medium text-slate-300">No partners found.</p>
          <p className="mt-1 text-sm text-slate-500">
            Add your first {partnerKind === 'freelancer' ? 'freelancer' : 'vendor partner'} to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {partnerKind === 'freelancer' ? 'Freelancer' : 'Business'}
                </th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Market</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">
                  {partnerKind === 'freelancer' ? 'Rating' : 'Contact Name'}
                </th>
                <th className="px-4 py-3 font-semibold">
                  {partnerKind === 'freelancer' ? 'Day Rate' : 'Default Cost'}
                </th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredVendors.map((vendor) => {
                const primaryName =
                  partnerKind === 'freelancer'
                    ? vendor.freelancer_name || vendor.vendor_name
                    : vendor.business_name || vendor.vendor_name

                const market = vendor.primary_service_area
                  ? `${vendor.primary_service_area.city ?? '—'}, ${vendor.primary_service_area.state ?? '—'}`
                  : '—'

                const marketSub =
                  partnerKind === 'freelancer'
                    ? vendor.travel_available
                      ? 'Will travel'
                      : 'Local only'
                    : vendor.primary_service_area
                    ? `${vendor.primary_service_area.service_mode ?? 'local'} · ${vendor.primary_service_area.service_radius_miles ?? 0} mi`
                    : 'No service area'

                const editHref =
                  partnerKind === 'freelancer'
                    ? `/vendors/freelance/${vendor.id}`
                    : `/vendors/business/${vendor.id}`

                return (
                  <tr
                    key={vendor.id}
                    className="border-t border-white/10 hover:bg-white/[0.02]"
                  >
                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p className="font-medium text-white">{primaryName}</p>
                        <div className="flex flex-wrap gap-2">
                          {vendor.preferred_vendor ? (
                            <span className="rounded-full border border-amber-500/20 bg-amber-500/15 px-2 py-0.5 text-[11px] font-medium text-amber-300">
                              Preferred
                            </span>
                          ) : null}
                          {partnerKind === 'freelancer' && vendor.travel_available ? (
                            <span className="rounded-full border border-sky-500/20 bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                              Travel
                            </span>
                          ) : null}
                          {partnerKind === 'business' && vendor.nationwide_coverage ? (
                            <span className="rounded-full border border-sky-500/20 bg-sky-500/15 px-2 py-0.5 text-[11px] font-medium text-sky-300">
                              Nationwide
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {vendor.service_type ?? '—'}
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-300">{market}</p>
                      <p className="mt-1 text-xs text-slate-500">{marketSub}</p>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-slate-300">{vendor.email ?? '—'}</p>
                      <p className="mt-1 text-xs text-slate-500">{vendor.phone ?? '—'}</p>
                    </td>

                    <td className="px-4 py-4">
                      {partnerKind === 'freelancer' ? (
                        <RatingDisplay
                          average={vendor.average_rating}
                          count={vendor.rating_count}
                        />
                      ) : (
                        <span className="text-slate-300">{vendor.contact_name ?? '—'}</span>
                      )}
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {formatCurrency(vendor.default_cost)}
                    </td>

                    <td className="px-4 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClasses(vendor.is_active)}`}>
                        {vendor.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="flex justify-end">
                        <Link
                          href={editHref}
                          className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                        >
                          Open
                        </Link>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}