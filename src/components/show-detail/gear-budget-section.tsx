'use client'

import { useMemo, useState } from 'react'
import { AddLineItemModal } from './add-line-item-modal'
import { BudgetSheetTable } from './budget-sheet-table'

type BudgetItem = {
  id: string
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  unit_cost: number | null
  subtotal: number | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  overtime_rate: number | null
  notes: string | null
  reference_id?: string | null
}

const DEFAULT_GEAR_SUBGROUPS = [
  'audio',
  'video',
  'lighting',
  'staging',
  'rigging',
  'decor',
]

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

export function GearBudgetSection({
  showId,
  items,
  subtotal,
}: {
  showId: string
  items: BudgetItem[]
  subtotal: number
}) {
  const [open, setOpen] = useState(true)
  const [addedSubgroups, setAddedSubgroups] = useState<string[]>([])
  const [selectedSubgroup, setSelectedSubgroup] = useState('')
  const [modalSubgroup, setModalSubgroup] = useState<string | null>(null)

  const grouped = useMemo(() => {
    const map = new Map<string, BudgetItem[]>()

    for (const item of items) {
      const key = (item.subgroup_type || 'uncategorized').toLowerCase()
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(item)
    }

    return map
  }, [items])

  const existingSubgroups = Array.from(grouped.keys())
  const visibleSubgroups = Array.from(
    new Set([...existingSubgroups, ...addedSubgroups])
  )

  const availableToAdd = DEFAULT_GEAR_SUBGROUPS.filter(
    (group) => !visibleSubgroups.includes(group)
  )

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="font-semibold">Gear</p>
          <p className="text-xs text-slate-500">
            {items.length} line item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Subtotal</p>
          <p className="font-semibold">${subtotal.toLocaleString()}</p>
        </div>
      </button>

      {open ? (
        <div className="border-t p-5 space-y-5">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h3 className="text-lg font-semibold">Gear</h3>
              <p className="text-sm text-slate-600">
                Add only the gear subcategories needed for this show.
              </p>
            </div>

            <div className="flex gap-2">
              <select
                value={selectedSubgroup}
                onChange={(e) => setSelectedSubgroup(e.target.value)}
                className="rounded-lg border px-3 py-2 text-sm"
              >
                <option value="">Select subcategory</option>
                {availableToAdd.map((group) => (
                  <option key={group} value={group}>
                    {titleCase(group)}
                  </option>
                ))}
              </select>

              <button
                type="button"
                disabled={!selectedSubgroup}
                onClick={() => {
                  if (!selectedSubgroup) return
                  setAddedSubgroups((prev) =>
                    prev.includes(selectedSubgroup) ? prev : [...prev, selectedSubgroup]
                  )
                  setSelectedSubgroup('')
                }}
                className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50"
              >
                Add Subcategory
              </button>
            </div>
          </div>

          {!visibleSubgroups.length ? (
            <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
              No gear subcategories added yet. Add one to start building the gear budget.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleSubgroups.map((group) => {
                const subgroupItems = grouped.get(group) ?? []
                const subgroupSubtotal = subgroupItems.reduce(
                  (sum, item) => sum + Number(item.subtotal ?? 0),
                  0
                )

                const canRemoveEmptyAddedGroup =
                  addedSubgroups.includes(group) && subgroupItems.length === 0

                return (
                  <div key={group} className="rounded-xl border">
                    <div className="flex items-center justify-between gap-4 border-b bg-slate-50 px-4 py-3">
                      <div>
                        <h4 className="font-semibold">{titleCase(group)}</h4>
                        <p className="text-xs text-slate-500">
                          {subgroupItems.length} line item{subgroupItems.length === 1 ? '' : 's'}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">
                          ${subgroupSubtotal.toLocaleString()}
                        </p>

                        <button
                          type="button"
                          onClick={() => setModalSubgroup(group)}
                          className="rounded-lg border px-3 py-2 text-sm"
                        >
                          Add Line Item
                        </button>

                        {canRemoveEmptyAddedGroup ? (
                          <button
                            type="button"
                            onClick={() =>
                              setAddedSubgroups((prev) => prev.filter((x) => x !== group))
                            }
                            className="rounded-lg border px-3 py-2 text-sm text-red-600"
                          >
                            Remove
                          </button>
                        ) : null}
                      </div>
                    </div>

                    <div className="p-4">
                      <BudgetSheetTable items={subgroupItems} showId={showId} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      ) : null}

      {modalSubgroup ? (
        <AddLineItemModal
          showId={showId}
          sectionType="gear"
          subgroupType={modalSubgroup}
          title={`Gear / ${titleCase(modalSubgroup)}`}
          onClose={() => setModalSubgroup(null)}
        />
      ) : null}
    </div>
  )
}