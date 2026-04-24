'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import {
  updateBudgetLine,
  type BudgetLineState,
} from '@/app/actions/budget-lines'

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

const initialState: BudgetLineState = {}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function panelClass() {
  return 'rounded-2xl border border-white/10 bg-white/[0.02] p-4'
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function getAutoCalculationType(sectionType: string) {
  const normalized = normalizeSectionType(sectionType)

  switch (normalized) {
    case 'gear':
      return 'quantity_x_days_x_unit_cost'
    case 'w2_labor':
      return 'quantity_x_hours_x_unit_cost'
    case 'freelance_labor':
      return 'days_x_unit_cost'
    default:
      return 'quantity_x_unit_cost'
  }
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
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const router = useRouter()

  const normalizedSectionType = normalizeSectionType(item.section_type)
  const calculationType =
    item.calculation_type || getAutoCalculationType(normalizedSectionType)

  const isFreelanceLabor = normalizedSectionType === 'freelance_labor'
  const isW2Labor = normalizedSectionType === 'w2_labor'
  const isLabor = isFreelanceLabor || isW2Labor

  const [lineName, setLineName] = useState(item.line_name)
  const [quantity, setQuantity] = useState(String(item.quantity ?? 1))
  const [days, setDays] = useState(String(item.days ?? ''))
  const [hours, setHours] = useState(String(item.hours ?? ''))
  const [unitCost, setUnitCost] = useState(String(item.unit_cost ?? 0))
  const [notes, setNotes] = useState(item.notes ?? '')
  const [overtimeEnabled, setOvertimeEnabled] = useState(Boolean(item.overtime_enabled))
  const [overtimeHours, setOvertimeHours] = useState(String(item.overtime_hours ?? ''))
  const [overtimeRate, setOvertimeRate] = useState(String(item.overtime_rate ?? ''))

  useEffect(() => {
    if (hasSubmitted && state && !state.error) {
      router.refresh()
      onClose()
    }
  }, [hasSubmitted, state, onClose, router])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Edit Line Item</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form
          action={(formData) => {
            setHasSubmitted(true)
            return formAction(formData)
          }}
          className="space-y-4"
        >
          <input type="hidden" name="lineItemId" value={item.id} />
          <input type="hidden" name="showId" value={showId} />
          <input type="hidden" name="calculationType" value={calculationType} />
          <input type="hidden" name="subtotal" value="" />
          <input type="hidden" name="overtimeEnabled" value={String(overtimeEnabled)} />

          <div>
            <label className="block text-sm font-medium text-slate-300">Item Name</label>
            <input
              name="lineName"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
              required
              className={fieldClass()}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Quantity</label>
              <input
                name="quantity"
                type="number"
                step="1"
                min="0"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Rate</label>
              <input
                name="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                className={fieldClass()}
              />
            </div>

            {normalizedSectionType === 'gear' || normalizedSectionType === 'freelance_labor' ? (
              <div>
                <label className="block text-sm font-medium text-slate-300">Days</label>
                <input
                  name="days"
                  type="number"
                  step="1"
                  min="0"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  className={fieldClass()}
                />
              </div>
            ) : (
              <input type="hidden" name="days" value="" />
            )}

            {isW2Labor ? (
              <div>
                <label className="block text-sm font-medium text-slate-300">Hours</label>
                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  className={fieldClass()}
                />
              </div>
            ) : (
              <input type="hidden" name="hours" value={hours} />
            )}
          </div>

          {isLabor ? (
            <div className={panelClass()}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Overtime</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Toggle overtime and update the OT hours/rate for this labor line.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOvertimeEnabled((value) => !value)}
                  className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                    overtimeEnabled
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {overtimeEnabled ? 'OT On' : 'Enable OT'}
                </button>
              </div>

              {overtimeEnabled ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Overtime Hours
                    </label>
                    <input
                      name="overtimeHours"
                      type="number"
                      step="0.25"
                      min="0"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                      className={fieldClass()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Overtime Rate
                    </label>
                    <input
                      name="overtimeRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(e.target.value)}
                      className={fieldClass()}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <input type="hidden" name="overtimeHours" value="" />
                  <input type="hidden" name="overtimeRate" value="" />
                </>
              )}
            </div>
          ) : (
            <>
              <input type="hidden" name="overtimeHours" value="" />
              <input type="hidden" name="overtimeRate" value="" />
            </>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300">Notes</label>
            <textarea
              name="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={fieldClass()}
            />
          </div>

          {state?.error ? (
            <p className="text-sm text-rose-300">{state.error}</p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}