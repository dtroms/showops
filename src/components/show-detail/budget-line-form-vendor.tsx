'use client'

import { useActionState, useMemo, useState } from 'react'
import { createBudgetLine, updateBudgetLine } from '@/app/actions/budget-lines'

type ShowVendor = {
  id: string
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
  contact_name_snapshot?: string | null
  email_snapshot?: string | null
  phone_snapshot?: string | null
}

type InitialValues = {
  id?: string
  referenceId?: string | null
  lineName?: string
  quantity?: number | null
  unitCost?: number | null
  notes?: string | null
  overtimeEnabled?: boolean | null
  overtimeHours?: number | null
}

export function BudgetLineFormVendor({
  mode = 'create',
  showId,
  showVendors,
  initialValues,
  onSuccess,
}: {
  mode?: 'create' | 'edit'
  showId: string
  showVendors: ShowVendor[]
  initialValues?: InitialValues
  onSuccess?: () => void
}) {
  const action = mode === 'edit' ? updateBudgetLine : createBudgetLine
  const [state, formAction, pending] = useActionState(action, {})
  const [selectedVendorId, setSelectedVendorId] = useState(
    initialValues?.referenceId ?? ''
  )
  const [customMode, setCustomMode] = useState(false)
  const [lineName, setLineName] = useState(initialValues?.lineName ?? '')
  const [serviceType, setServiceType] = useState('')
  const [dayRate, setDayRate] = useState(String(initialValues?.unitCost ?? 0))
  const [quantity, setQuantity] = useState(String(initialValues?.quantity ?? 1))
  const [notes, setNotes] = useState(initialValues?.notes ?? '')
  const [overtimeEnabled, setOvertimeEnabled] = useState(
    initialValues?.overtimeEnabled ?? false
  )
  const [overtimeHours, setOvertimeHours] = useState(
    String(initialValues?.overtimeHours ?? 0)
  )

  const sortedVendors = useMemo(
    () =>
      [...showVendors].sort((a, b) =>
        a.vendor_name_snapshot.localeCompare(b.vendor_name_snapshot)
      ),
    [showVendors]
  )

  const selectedVendor = sortedVendors.find((vendor) => vendor.id === selectedVendorId)

  function handleVendorChange(vendorId: string) {
    setSelectedVendorId(vendorId)

    const match = sortedVendors.find((vendor) => vendor.id === vendorId)
    if (!match) return

    setCustomMode(false)
    setLineName(match.vendor_name_snapshot)
    setServiceType(match.service_type_snapshot || '')
    setDayRate(String(match.default_day_rate_snapshot ?? 0))
  }

  const overtimeRatePreview = (() => {
    const num = Number(dayRate)
    if (Number.isNaN(num)) return 0
    return (num / 10) * 1.5
  })()

  if ((state as any)?.success && onSuccess) {
    onSuccess()
  }

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="showId" value={showId} />
      <input type="hidden" name="sectionType" value="vendor" />
      <input type="hidden" name="subgroupType" value="" />
      {mode === 'edit' && initialValues?.id ? (
        <input type="hidden" name="lineItemId" value={initialValues.id} />
      ) : null}

      <div>
        <label className="block text-sm font-medium">Assigned Freelancer</label>
        <select
          value={selectedVendorId}
          onChange={(e) => handleVendorChange(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        >
          <option value="">Select assigned freelancer</option>
          {sortedVendors.map((vendor) => (
            <option key={vendor.id} value={vendor.id}>
              {vendor.vendor_name_snapshot}
              {vendor.service_type_snapshot ? ` — ${vendor.service_type_snapshot}` : ''}
            </option>
          ))}
        </select>
      </div>

      {selectedVendor ? (
        <div className="rounded-xl border bg-slate-50 p-4 text-sm">
          <div className="grid gap-3 md:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Service
              </p>
              <p className="mt-1 text-slate-900">
                {selectedVendor.service_type_snapshot || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Default Day Rate
              </p>
              <p className="mt-1 text-slate-900">
                ${Number(selectedVendor.default_day_rate_snapshot ?? 0).toLocaleString()}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Contact
              </p>
              <p className="mt-1 text-slate-900">
                {selectedVendor.contact_name_snapshot || '—'}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Email / Phone
              </p>
              <p className="mt-1 text-slate-900">
                {selectedVendor.email_snapshot || '—'}
                {selectedVendor.phone_snapshot
                  ? ` • ${selectedVendor.phone_snapshot}`
                  : ''}
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="flex items-center gap-2">
        <input
          id="customMode"
          type="checkbox"
          checked={customMode}
          onChange={(e) => setCustomMode(e.target.checked)}
        />
        <label htmlFor="customMode" className="text-sm">
          Override name/rate manually
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Line Item Name</label>
          <input
            name="lineName"
            value={lineName}
            onChange={(e) => setLineName(e.target.value)}
            readOnly={!customMode && Boolean(selectedVendor)}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Service Type</label>
          <input
            value={serviceType}
            onChange={(e) => setServiceType(e.target.value)}
            readOnly={!customMode && Boolean(selectedVendor)}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div>
          <label className="block text-sm font-medium">Days</label>
          <input
            name="quantity"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Day Rate</label>
          <input
            name="unitCost"
            type="number"
            min="0"
            step="0.01"
            value={dayRate}
            onChange={(e) => setDayRate(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>
      </div>

      <div className="rounded-xl border bg-slate-50 p-4">
        <div className="flex items-center gap-2">
          <input
            id="overtimeEnabled"
            name="overtimeEnabled"
            type="checkbox"
            checked={overtimeEnabled}
            onChange={(e) => setOvertimeEnabled(e.target.checked)}
            value="true"
          />
          <label htmlFor="overtimeEnabled" className="text-sm font-medium">
            Enable Overtime
          </label>
        </div>

        <input
          type="hidden"
          name="overtimeEnabled"
          value={overtimeEnabled ? 'true' : 'false'}
        />

        {overtimeEnabled ? (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Overtime Hours</label>
              <input
                name="overtimeHours"
                type="number"
                min="0"
                step="0.1"
                value={overtimeHours}
                onChange={(e) => setOvertimeHours(e.target.value)}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">OT Rate Preview</label>
              <div className="mt-1 rounded-lg border bg-white px-3 py-2 text-sm text-slate-700">
                ${overtimeRatePreview.toLocaleString()}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium">Notes</label>
        <textarea
          name="notes"
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
      </div>

      {(state as any)?.error ? (
        <p className="text-sm text-red-600">{(state as any).error}</p>
      ) : null}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {pending
            ? mode === 'edit'
              ? 'Saving...'
              : 'Adding...'
            : mode === 'edit'
            ? 'Save Freelance Labor'
            : 'Add Freelance Labor'}
        </button>
      </div>
    </form>
  )
}