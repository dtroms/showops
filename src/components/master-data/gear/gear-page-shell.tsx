'use client'

import { useMemo, useState } from 'react'
import { GearFilterBar } from './gear-filter-bar'
import { GearTable } from './gear-table'
import { GearFormModal } from './gear-form-modal'

type GearItem = {
  id: string
  item_name: string
  internal_cost: number | null
  notes: string | null
  is_active: boolean
  category_name: string
  subcategory_name: string
}

export function GearPageShell({ gearItems }: { gearItems: GearItem[] }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editingItem, setEditingItem] = useState<GearItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const categories = useMemo(
    () =>
      Array.from(
        new Set(gearItems.map((item) => item.category_name).filter(Boolean))
      ) as string[],
    [gearItems]
  )

  const filtered = useMemo(() => {
    return gearItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        item.category_name.toLowerCase().includes(search.toLowerCase()) ||
        item.subcategory_name.toLowerCase().includes(search.toLowerCase())

      const matchesCategory =
        categoryFilter === 'all' || item.category_name === categoryFilter

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? item.is_active : !item.is_active)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [gearItems, search, categoryFilter, statusFilter])

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Gear</h1>
            <p className="mt-2 text-sm text-slate-600">
              Manage your master gear list, categories, and internal costs.
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
          >
            Add Gear
          </button>
        </div>
      </div>

      <GearFilterBar
        search={search}
        onSearchChange={setSearch}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        categories={categories}
      />

      <GearTable gearItems={filtered} onEdit={setEditingItem} />

      {createOpen ? (
        <GearFormModal mode="create" onClose={() => setCreateOpen(false)} />
      ) : null}

      {editingItem ? (
        <GearFormModal
          mode="edit"
          gearItem={editingItem}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </div>
  )
}