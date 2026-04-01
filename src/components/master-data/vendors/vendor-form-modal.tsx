'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createVendor, updateVendor, type VendorState } from '@/app/actions/vendors'

type Vendor = {
  id: string
  vendor_name: string
  vendor_type: string
  service_type: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  default_cost: number | null
  notes: string | null
  is_active: boolean
}

const initialState: VendorState = {}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Saving...' : mode === 'edit' ? 'Save Vendor' : 'Create Vendor'}
    </button>
  )
}

export function VendorFormModal({
  mode,
  vendor,
  onClose,
}: {
  mode: 'create' | 'edit'
  vendor?: Vendor
  onClose: () => void
}) {
  const action = mode === 'edit' ? updateVendor : createVendor
  const [state, formAction] = useFormState(action, initialState)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {mode === 'edit' ? 'Edit Vendor' : 'Add Vendor'}
          </h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === 'edit' && vendor ? (
            <input type="hidden" name="vendorId" value={vendor.id} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Vendor Name</label>
              <input
                name="vendorName"
                defaultValue={vendor?.vendor_name ?? ''}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Vendor Type</label>
              <select
                name="vendorType"
                defaultValue={vendor?.vendor_type ?? 'freelance'}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="freelance">Freelance</option>
                <option value="gear_rental">Gear Rental</option>
                <option value="both">Both</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Service Type</label>
              <input
                name="serviceType"
                defaultValue={vendor?.service_type ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Default Cost</label>
              <input
                name="defaultCost"
                type="number"
                step="0.01"
                defaultValue={vendor?.default_cost ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Contact Name</label>
              <input
                name="contactName"
                defaultValue={vendor?.contact_name ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">City / Market</label>
              <input
                name="city"
                defaultValue={vendor?.city ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={vendor?.email ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Phone</label>
              <input
                name="phone"
                defaultValue={vendor?.phone ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={vendor?.notes ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">Saved successfully.</p> : null}

          <SubmitButton mode={mode} />
        </form>
      </div>
    </div>
  )
}