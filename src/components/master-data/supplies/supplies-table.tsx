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

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
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
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
        No supplies found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Supply</th>
            <th className="px-4 py-3 font-semibold">Unit Type</th>
            <th className="px-4 py-3 font-semibold">Default Cost</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {supplyItems.map((item) => (
            <tr key={item.id} className="border-t border-white/10 hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-white">{item.supply_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{item.notes || '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">{item.unit_type || '—'}</td>
              <td className="px-4 py-3 text-slate-300">{formatCurrency(item.default_cost)}</td>
              <td className="px-4 py-3">
                <SupplyStatusBadge isActive={item.is_active} />
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
                        await toggleSupplyItemActive(formData)
                      })
                    }}
                  >
                    <input type="hidden" name="supplyItemId" value={item.id} />
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