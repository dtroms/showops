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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
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
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
        No gear found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Item</th>
            <th className="px-4 py-3 font-semibold">Category</th>
            <th className="px-4 py-3 font-semibold">Subcategory</th>
            <th className="px-4 py-3 font-semibold">Internal Cost</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {gearItems.map((item) => (
            <tr key={item.id} className="border-t border-white/10 hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-white">{item.item_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.notes || '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">{item.category_name || '—'}</td>
              <td className="px-4 py-3 text-slate-300">{item.subcategory_name || '—'}</td>
              <td className="px-4 py-3 text-slate-300">{formatCurrency(item.internal_cost)}</td>
              <td className="px-4 py-3">
                <GearStatusBadge isActive={item.is_active} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(item)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
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
                    <input type="hidden" name="nextValue" value={String(!item.is_active)} />
                    <button
                      disabled={pending}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
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