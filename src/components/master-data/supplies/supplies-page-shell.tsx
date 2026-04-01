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

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Supplies</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage your reusable master supply list and default costs.
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            Add Supply
          </button>
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