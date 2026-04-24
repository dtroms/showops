'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteBudgetLine } from '@/app/actions/budget-lines'
import { EditLineItemModal } from './edit-line-item-modal'

type BudgetItem = {
  id: string
  version_id?: string | null
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  days?: number | null
  hours?: number | null
  unit_cost: number | null
  subtotal: number | null
  calculation_type?: string | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  overtime_rate: number | null
  notes: string | null
  reference_id?: string | null
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

function formatNumber(value: number | null | undefined) {
  return Number(value ?? 0).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

export function BudgetSheetTable({
  items,
  showId,
}: {
  items: BudgetItem[]
  showId: string
}) {
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const normalizedSectionTypes = useMemo(
    () => new Set(items.map((item) => normalizeSectionType(item.section_type))),
    [items]
  )

  const isLaborSection =
    normalizedSectionTypes.has('freelance_labor') || normalizedSectionTypes.has('w2_labor')

  const showDaysColumn = items.some((item) => Number(item.days ?? 0) > 0)
  const showHoursColumn = items.some((item) => Number(item.hours ?? 0) > 0)

  if (!items.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center">
        <p className="text-sm font-medium text-slate-300">No line items yet.</p>
        <p className="mt-1 text-sm text-slate-500">
          Add your first line item to start building this section.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/[0.02]">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-slate-500">
            <tr>
              <th className="px-4 py-3 font-semibold">Item</th>
              <th className="px-4 py-3 font-semibold">Qty</th>
              {showDaysColumn ? <th className="px-4 py-3 font-semibold">Days</th> : null}
              {showHoursColumn ? <th className="px-4 py-3 font-semibold">Hours</th> : null}
              <th className="px-4 py-3 font-semibold">Rate</th>
              {isLaborSection ? <th className="px-4 py-3 font-semibold">OT</th> : null}
              <th className="px-4 py-3 font-semibold">Subtotal</th>
              <th className="px-4 py-3 font-semibold">Notes</th>
              <th className="px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => (
              <tr
                key={item.id}
                className="border-t border-white/10 align-top hover:bg-white/[0.02]"
              >
                <td className="px-4 py-4 font-medium text-white">
                  <div className="space-y-1">
                    <div>{item.line_name}</div>
                    {item.subgroup_type ? (
                      <div className="text-xs font-normal text-slate-500">
                        {item.subgroup_type}
                      </div>
                    ) : null}
                  </div>
                </td>

                <td className="px-4 py-4 text-slate-300">{formatNumber(item.quantity)}</td>

                {showDaysColumn ? (
                  <td className="px-4 py-4 text-slate-300">
                    {item.days !== null && item.days !== undefined
                      ? formatNumber(item.days)
                      : '—'}
                  </td>
                ) : null}

                {showHoursColumn ? (
                  <td className="px-4 py-4 text-slate-300">
                    {item.hours !== null && item.hours !== undefined
                      ? formatNumber(item.hours)
                      : '—'}
                  </td>
                ) : null}

                <td className="px-4 py-4 text-slate-300">
                  {formatCurrency(item.unit_cost)}
                </td>

                {isLaborSection ? (
                  <td className="px-4 py-4 text-slate-300">
                    {item.overtime_enabled ? (
                      <div className="space-y-1">
                        <div>{formatNumber(item.overtime_hours)}h</div>
                        <div className="text-xs text-slate-500">
                          @ {formatCurrency(item.overtime_rate)}
                        </div>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                ) : null}

                <td className="px-4 py-4 font-medium text-white">
                  {formatCurrency(item.subtotal)}
                </td>

                <td className="px-4 py-4 text-slate-400">
                  {item.notes ? (
                    <div className="max-w-[280px] whitespace-pre-wrap text-sm leading-relaxed">
                      {item.notes}
                    </div>
                  ) : (
                    '—'
                  )}
                </td>

                <td className="px-4 py-4">
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          await deleteBudgetLine(item.id, showId)
                          router.refresh()
                        })
                      }
                      className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
                    >
                      {isPending ? 'Removing...' : 'Delete'}
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