'use client'

import { useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { updateBudgetLine, type BudgetLineState } from '@/app/actions/budget-lines'

type BudgetItem = {
  id: string
  section_type: string
  line_name: string
  quantity: number | null
  unit_cost: number | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  notes: string | null
}

const initialState: BudgetLineState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

export function EditLineItemModal({
  item,
  showId,
  onClose,
}: {
  item: BudgetItem
  showId: string
  onClose: () => void
}) {
  const [state, formAction] = useFormState(updateBudgetLine, initialState)
  const [overtimeEnabled, setOvertimeEnabled] = useState(Boolean(item.overtime_enabled))
  const isVendor = item.section_type === 'vendor'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Edit Line Item</h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="lineItemId" value={item.id} />
          <input type="hidden" name="showId" value={showId} />
          <input type="hidden" name="sectionType" value={item.section_type} />
          <input type="hidden" name="overtimeEnabled" value={String(overtimeEnabled)} />

          <div>
            <label className="block text-sm font-medium">
              {isVendor ? 'Vendor Name' : 'Item Name'}
            </label>
            <input
              name="lineName"
              defaultValue={item.line_name}
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">
                {isVendor ? 'Days' : 'Quantity'}
              </label>
              <input
                name="quantity"
                type="number"
                step="1"
                min="0"
                defaultValue={item.quantity ?? 1}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">
                {isVendor ? 'Day Rate' : 'Unit Cost'}
              </label>
              <input
                name="unitCost"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item.unit_cost ?? 0}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          {isVendor ? (
            <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={overtimeEnabled}
                  onChange={(e) => setOvertimeEnabled(e.target.checked)}
                />
                Enable Overtime
              </label>

              {overtimeEnabled ? (
                <div>
                  <label className="block text-sm font-medium">Overtime Hours</label>
                  <input
                    name="overtimeHours"
                    type="number"
                    step="0.5"
                    min="0"
                    defaultValue={item.overtime_hours ?? 0}
                    className="mt-1 w-full rounded-lg border px-3 py-2"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    OT Rate = Day Rate ÷ 10 × 1.5
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={item.notes ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <SubmitButton />
        </form>
      </div>
    </div>
  )
}