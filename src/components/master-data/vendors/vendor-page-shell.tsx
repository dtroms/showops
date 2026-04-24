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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
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

  const totalDefaultValue = filtered.reduce(
    (sum, vendor) => sum + Number(vendor.default_cost ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Vendors</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your workspace vendor directory for labor and rental partners.
            </p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Add Vendor
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Vendors
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {filtered.length}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Active
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {filtered.filter((vendor) => vendor.is_active).length}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Default Cost
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(totalDefaultValue)}
          </div>
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