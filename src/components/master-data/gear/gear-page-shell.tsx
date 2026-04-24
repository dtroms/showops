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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

export function GearPageShell({ gearItems }: { gearItems: GearItem[] }) {
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('active')
  const [editingItem, setEditingItem] = useState<GearItem | null>(null)
  const [createOpen, setCreateOpen] = useState(false)

  const categories = useMemo(
    () =>
      Array.from(new Set(gearItems.map((item) => item.category_name).filter(Boolean))) as string[],
    [gearItems]
  )

  const filtered = useMemo(() => {
    return gearItems.filter((item) => {
      const matchesSearch =
        !search ||
        item.item_name.toLowerCase().includes(search.toLowerCase()) ||
        item.category_name.toLowerCase().includes(search.toLowerCase()) ||
        item.subcategory_name.toLowerCase().includes(search.toLowerCase())

      const matchesCategory = categoryFilter === 'all' || item.category_name === categoryFilter
      const matchesStatus =
        statusFilter === 'all' || (statusFilter === 'active' ? item.is_active : !item.is_active)

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [gearItems, search, categoryFilter, statusFilter])

  const totalInternalCost = filtered.reduce(
    (sum, item) => sum + Number(item.internal_cost ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Gear</h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage your master gear list, categories, and internal costs.
            </p>
          </div>

          <button
            onClick={() => setCreateOpen(true)}
            className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Add Gear
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Gear Items
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {filtered.length}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Categories
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {new Set(filtered.map((item) => item.category_name)).size}
          </div>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Total Internal Cost
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(totalInternalCost)}
          </div>
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