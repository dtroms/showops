'use client'

import Link from 'next/link'
import { useMemo, useState, useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { VendorFormModal } from './vendor-form-modal'

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
  default_cost: number | null
  notes: string | null
  is_active: boolean
}

function PartnerStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <span className="rounded-full bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
      Active
    </span>
  ) : (
    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
      Inactive
    </span>
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
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active')
  const [createOpen, setCreateOpen] = useState(false)
  const [editingVendor, setEditingVendor] = useState<VendorRecord | null>(null)

  const searchParams = useSearchParams()
  const router = useRouter()

  // ✅ Auto-open modal from ?new=1
  useEffect(() => {
    if (searchParams.get('new') === '1') {
      setCreateOpen(true)

      const params = new URLSearchParams(searchParams.toString())
      params.delete('new')

      const newQuery = params.toString()
      router.replace(newQuery ? `?${newQuery}` : '', { scroll: false })
    }
  }, [searchParams, router])

  const filteredVendors = useMemo(() => {
    return vendors.filter((vendor) => {
      const primaryName =
        partnerKind === 'freelancer'
          ? vendor.freelancer_name || vendor.vendor_name || ''
          : vendor.business_name || vendor.vendor_name || ''

      const haystack = [
        primaryName,
        vendor.business_name ?? '',
        vendor.freelancer_name ?? '',
        vendor.service_type ?? '',
        vendor.contact_name ?? '',
        vendor.email ?? '',
        vendor.phone ?? '',
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

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-2 text-sm text-slate-500">{description}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/vendors/business"
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                partnerKind === 'business'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              Vendor Partners
            </Link>

            <Link
              href="/vendors/freelance"
              className={`rounded-lg border px-4 py-2 text-sm font-medium ${
                partnerKind === 'freelancer'
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-700'
              }`}
            >
              Freelance Partners
            </Link>

            <button
              type="button"
              onClick={() => setCreateOpen(true)}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Add Vendor
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={
              partnerKind === 'freelancer'
                ? 'Search freelancers'
                : 'Search vendor partners'
            }
            className="rounded-lg border border-slate-300 px-3 py-2"
          />

          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as 'active' | 'inactive' | 'all')
            }
            className="rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="all">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {!filteredVendors.length ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-600">No partners found.</p>
          <p className="mt-1 text-sm text-slate-400">
            Add your first {partnerKind === 'freelancer' ? 'freelancer' : 'vendor partner'} to get started.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">
                  {partnerKind === 'freelancer' ? 'Freelancer' : 'Business'}
                </th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">
                  {partnerKind === 'freelancer' ? 'Business Name' : 'Contact Name'}
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

                const secondaryValue =
                  partnerKind === 'freelancer'
                    ? vendor.business_name || '—'
                    : vendor.contact_name || '—'

                return (
                  <tr
                    key={vendor.id}
                    className="border-t border-slate-200 hover:bg-slate-50/70"
                  >
                    <td className="px-4 py-4">
                      <p className="font-semibold text-slate-900">{primaryName}</p>
                    </td>

                    <td className="px-4 py-4">{vendor.service_type ?? '—'}</td>

                    <td className="px-4 py-4">
                      <div className="space-y-1">
                        <p>{vendor.email ?? '—'}</p>
                        <p className="text-xs text-slate-500">{vendor.phone ?? '—'}</p>
                      </div>
                    </td>

                    <td className="px-4 py-4">{secondaryValue}</td>

                    <td className="px-4 py-4">
                      ${Number(vendor.default_cost ?? 0).toLocaleString()}
                    </td>

                    <td className="px-4 py-4">
                      <PartnerStatusBadge isActive={vendor.is_active} />
                    </td>

                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setEditingVendor(vendor)}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modals */}
      {createOpen && (
        <VendorFormModal
          mode="create"
          onClose={() => setCreateOpen(false)}
        />
      )}

      {editingVendor && (
        <VendorFormModal
          mode="edit"
          vendor={editingVendor}
          onClose={() => setEditingVendor(null)}
        />
      )}
    </div>
  )
}