'use client'

import { useState } from 'react'
import { deleteBudgetLine } from '@/app/actions/budget-lines'
import { EditLineItemModal } from './edit-line-item-modal'

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
}

export function BudgetSheetTable({
  items,
  showId,
}: {
  items: BudgetItem[]
  showId: string
}) {
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)

  if (!items.length) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
        <p className="text-sm font-medium text-slate-600">No line items yet.</p>
        <p className="mt-1 text-sm text-slate-400">
          Add your first line item to start building this section.
        </p>
      </div>
    )
  }

  const isVendorSection = items.some((item) => item.section_type === 'vendor')

  return (
    <>
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Quantity</th>
              <th className="px-4 py-3 font-semibold">Unit Cost</th>
              {isVendorSection ? <th className="px-4 py-3 font-semibold">OT</th> : null}
              <th className="px-4 py-3 font-semibold">Subtotal</th>
              <th className="px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-t border-slate-200 align-top hover:bg-slate-50/70">
                <td className="px-4 py-4 font-medium text-slate-900">{item.line_name}</td>
                <td className="px-4 py-4">{item.quantity ?? 0}</td>
                <td className="px-4 py-4">
                  ${Number(item.unit_cost ?? 0).toLocaleString()}
                </td>

                {isVendorSection ? (
                  <td className="px-4 py-4">
                    {item.overtime_enabled
                      ? `${item.overtime_hours ?? 0}h @ $${Number(
                          item.overtime_rate ?? 0
                        ).toLocaleString()}`
                      : '—'}
                  </td>
                ) : null}

                <td className="px-4 py-4 font-semibold text-slate-900">
                  ${Number(item.subtotal ?? 0).toLocaleString()}
                </td>

                <td className="px-4 py-4 text-slate-600">
                  {item.notes || '—'}
                </td>

                <td className="px-4 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setEditingItem(item)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-100"
                    >
                      Edit
                    </button>

                    <button
                      onClick={() => {
                        if (!confirm('Delete this line item?')) return
                        deleteBudgetLine(item.id, showId)
                      }}
                      className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editingItem ? (
        <EditLineItemModal
          item={editingItem}
          showId={showId}
          onClose={() => setEditingItem(null)}
        />
      ) : null}
    </>
  )
}