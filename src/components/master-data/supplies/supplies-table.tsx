'use client'

import { useTransition } from 'react'
import { toggleSupplyItemActive } from '@/app/actions/supplies'
import { SupplyStatusBadge } from './supply-status-badge'

type SupplyItem = {
  id: string
  supply_name: string
  unit_type: string | null
  default_cost: number | null
  notes: string | null
  is_active: boolean
}

export function SuppliesTable({
  supplyItems,
  onEdit,
}: {
  supplyItems: SupplyItem[]
  onEdit: (item: SupplyItem) => void
}) {
  const [pending, startTransition] = useTransition()

  if (!supplyItems.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-500">
        No supplies found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Supply</th>
            <th className="px-4 py-3">Unit Type</th>
            <th className="px-4 py-3">Default Cost</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {supplyItems.map((item) => (
            <tr key={item.id} className="border-t">
              <td className="px-4 py-3 font-medium">{item.supply_name}</td>
              <td className="px-4 py-3">{item.unit_type || '—'}</td>
              <td className="px-4 py-3">
                ${Number(item.default_cost ?? 0).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <SupplyStatusBadge isActive={item.is_active} />
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
                        await toggleSupplyItemActive(formData)
                      })
                    }}
                  >
                    <input type="hidden" name="supplyItemId" value={item.id} />
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