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

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {mode === 'edit' ? 'Edit Vendor' : 'Add Vendor'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === 'edit' && vendor ? (
            <input type="hidden" name="vendorId" value={vendor.id} />
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Vendor Name</label>
              <input
                name="vendorName"
                defaultValue={vendor?.vendor_name ?? ''}
                required
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Vendor Type</label>
              <select
                name="vendorType"
                defaultValue={vendor?.vendor_type ?? 'freelance'}
                className={fieldClass()}
              >
                <option value="freelance" className="bg-slate-900 text-white">Freelance</option>
                <option value="gear_rental" className="bg-slate-900 text-white">Gear Rental</option>
                <option value="both" className="bg-slate-900 text-white">Both</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Service Type</label>
              <input
                name="serviceType"
                defaultValue={vendor?.service_type ?? ''}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Default Cost</label>
              <input
                name="defaultCost"
                type="number"
                step="0.01"
                defaultValue={vendor?.default_cost ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Contact Name</label>
              <input
                name="contactName"
                defaultValue={vendor?.contact_name ?? ''}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">City / Market</label>
              <input
                name="city"
                defaultValue={vendor?.city ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={vendor?.email ?? ''}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Phone</label>
              <input
                name="phone"
                defaultValue={vendor?.phone ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Notes</label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={vendor?.notes ?? ''}
              className={fieldClass()}
            />
          </div>

          {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
          {state.success ? (
            <p className="text-sm text-emerald-300">Saved successfully.</p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton mode={mode} />
          </div>
        </form>
      </div>
    </div>
  )
}