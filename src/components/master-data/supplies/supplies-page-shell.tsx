'use client'

import { useMemo, useState } from 'react'
import { SuppliesFilterBar } from './supplies-filter-bar'
import { SuppliesTable } from './supplies-table'
import { SupplyFormModal } from './supply-form-modal'

type SupplyItem = {
  id: string
  supply_name: string
  unit_type: string | null
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

export function SuppliesPageShell({ supplyItems }: { supplyItems: SupplyItem[] }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editingItem, setEditingItem] = useState<SupplyItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const filtered = useMemo(() => {
    return supplyItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.supply_name.toLowerCase().includes(search.toLowerCase()) ||
        (item.unit_type || '').toLowerCase().includes(search.toLowerCase())

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? item.is_active : !item.is_active)

      return matchesSearch && matchesStatus
    })
  }, [supplyItems, search, statusFilter])

  const totalDefaultValue = filtered.reduce(
    (sum, item) => sum + Number(item.default_cost ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Supplies</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your reusable master supply list and default costs.
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Add Supply
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Supplies
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
            {filtered.filter((item) => item.is_active).length}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Default Value
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(totalDefaultValue)}
          </div>
        </div>
      </div>

      <SuppliesFilterBar
        search={search}
        onSearchChange={setSearch}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
      />

      <SuppliesTable supplyItems={filtered} onEdit={setEditingItem} />

      {createOpen ? (
        <SupplyFormModal mode="create" onClose={() => setCreateOpen(false)} />
      ) : null}

      {editingItem ? (
        <SupplyFormModal
          mode="edit"
          supplyItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  )
}