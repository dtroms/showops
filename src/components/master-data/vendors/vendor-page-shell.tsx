'use client'

import { useMemo, useState } from 'react'
import { VendorFilterBar } from './vendor-filter-bar'
import { VendorTable } from './vendor-table'
import { VendorFormModal } from './vendor-form-modal'

type Vendor = {
  id: string
  vendor_name: string
  vendor_type: string
  service_type: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  default_cost: number | null
  notes: string | null
  is_active: boolean
}

export function VendorPageShell({ vendors }: { vendors: Vendor[] }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    return vendors.filter((vendor) => {
      const matchesSearch =
        !search ||
        vendor.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
        (vendor.service_type || '').toLowerCase().includes(search.toLowerCase()) ||
        (vendor.contact_name || '').toLowerCase().includes(search.toLowerCase())

      const matchesType = typeFilter === 'all' || vendor.vendor_type === typeFilter
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? vendor.is_active : !vendor.is_active)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [vendors, search, typeFilter, statusFilter])

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Vendors</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage your workspace vendor directory for labor and rental partners.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            Add Vendor
          </button>
        </div>
      </div>

      <VendorFilterBar
        search={search}
        onSearchChange={setSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={setTypeFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <VendorTable vendors={filtered} onEdit={setEditingVendor} />

      {createOpen ? (
        <VendorFormModal mode="create" onClose={() => setCreateOpen(false)} />
      ) : null}

      {editingVendor ? (
        <VendorFormModal
          mode="edit"
          vendor={editingVendor}
          onClose={() => setEditingVendor(null)}
        />
      ) : null}
    </div>
  )
}