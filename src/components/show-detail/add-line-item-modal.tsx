'use client'

import { useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { createBudgetLine, type BudgetLineState } from '@/app/actions/budget-lines'

type ShowVendorOption = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
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
      {pending ? 'Saving...' : 'Save Line Item'}
    </button>
  )
}

export function AddLineItemModal({
  showId,
  sectionType,
  subgroupType,
  title,
  showVendors = [],
  onClose,
}: {
  showId: string
  sectionType: string
  subgroupType?: string
  title: string
  showVendors?: ShowVendorOption[]
  onClose: () => void
}) {
  const [state, formAction] = useFormState(createBudgetLine, initialState)
  const [overtimeEnabled, setOvertimeEnabled] = useState(false)
  const [selectedShowVendorId, setSelectedShowVendorId] = useState('')
  const isVendor = sectionType === 'vendor'
  const isTravel = sectionType === 'travel'

  const selectedVendor = useMemo(
    () => showVendors.find((vendor) => vendor.id === selectedShowVendorId) ?? null,
    [showVendors, selectedShowVendorId]
  )

  const travelSuggestions = [
    'Hotel',
    'Flight',
    'Per Diem',
    'Mileage',
    'Parking',
    'Rental Car',
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">Add Line Item — {title}</h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          <input type="hidden" name="showId" value={showId} />
          <input type="hidden" name="sectionType" value={sectionType} />
          <input type="hidden" name="subgroupType" value={subgroupType ?? ''} />
          <input type="hidden" name="overtimeEnabled" value={String(overtimeEnabled)} />
          <input
            type="hidden"
            name="referenceId"
            value={isTravel || isVendor ? selectedShowVendorId : ''}
          />

          {isVendor ? (
            <div>
              <label className="block text-sm font-medium">Assigned Vendor</label>
              <select
                name="lineName"
                required
                value={selectedShowVendorId}
                onChange={(e) => setSelectedShowVendorId(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="">Select assigned vendor</option>
                {showVendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.vendor_name_snapshot}
                    {vendor.service_type_snapshot
                      ? ` — ${vendor.service_type_snapshot}`
                      : ''}
                  </option>
                ))}
              </select>
            </div>
          ) : isTravel ? (
            <>
              <div>
                <label className="block text-sm font-medium">Assigned Vendor</label>
                <select
                  name="linkedVendor"
                  value={selectedShowVendorId}
                  onChange={(e) => setSelectedShowVendorId(e.target.value)}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="">No linked vendor</option>
                  {showVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.vendor_name_snapshot}
                      {vendor.service_type_snapshot
                        ? ` — ${vendor.service_type_snapshot}`
                        : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium">Travel Item Name</label>
                <select
                  name="lineName"
                  required
                  defaultValue=""
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                >
                  <option value="" disabled>
                    Select travel item
                  </option>
                  {travelSuggestions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-sm font-medium">Item Name</label>
              <input
                name="lineName"
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          )}

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
                defaultValue="1"
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
                defaultValue={isVendor ? selectedVendor?.default_day_rate_snapshot ?? 0 : 0}
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
                    defaultValue="0"
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