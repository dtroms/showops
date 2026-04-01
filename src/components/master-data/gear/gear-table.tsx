'use client'

import { useTransition } from 'react'
import { toggleGearItemActive } from '@/app/actions/gear'
import { GearStatusBadge } from './gear-status-badge'

type GearItem = {
  id: string
  item_name: string
  internal_cost: number | null
  notes: string | null
  is_active: boolean
  category_name: string
  subcategory_name: string
}

export function GearTable({
  gearItems,
  onEdit,
}: {
  gearItems: GearItem[]
  onEdit: (item: GearItem) => void
}) {
  const [pending, startTransition] = useTransition()

  if (!gearItems.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-500">
        No gear found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Item</th>
            <th className="px-4 py-3">Category</th>
            <th className="px-4 py-3">Subcategory</th>
            <th className="px-4 py-3">Internal Cost</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {gearItems.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="px-4 py-3 font-medium">{item.item_name}</td>
              <td className="px-4 py-3">{item.category_name || '—'}</td>
              <td className="px-4 py-3">{item.subcategory_name || '—'}</td>
              <td className="px-4 py-3">
                ${Number(item.internal_cost ?? 0).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <GearStatusBadge isActive={item.is_active} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="rounded border px-3 py-1 text-xs"
                  >
                    Edit
                  </button>

                  <form
                    action={(formData) => {
                      startTransition(async () => {
                        await toggleGearItemActive(formData)
                      })
                    }}
                  >
                    <input type="hidden" name="gearItemId" value={item.id} />
                    <input
                      type="hidden"
                      name="nextValue"
                      value={String(!item.is_active)}
                    />
                    <button
                      disabled={pending}
                      className="rounded border px-3 py-1 text-xs"
                    >
                      {item.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}