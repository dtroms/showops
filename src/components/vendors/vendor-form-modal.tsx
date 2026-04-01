'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  createVendor,
  updateVendor,
  type VendorState,
} from '@/app/actions/vendors'

type VendorRecord = {
  id: string
  vendor_name: string
  vendor_type: string | null
  partner_kind?: string | null
  freelancer_name?: string | null
  business_name?: string | null
  service_type: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
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
  defaultPartnerKind = 'business',
  onClose,
}: {
  mode: 'create' | 'edit'
  vendor?: VendorRecord
  defaultPartnerKind?: 'business' | 'freelancer'
  onClose: () => void
}) {
  const action = mode === 'edit' ? updateVendor : createVendor
  const [state, formAction] = useFormState(action, initialState)

  const resolvedInitialPartnerKind =
    mode === 'edit'
      ? vendor?.partner_kind ||
        (vendor?.vendor_type === 'freelance' ? 'freelancer' : 'business')
      : defaultPartnerKind

  const [partnerKind, setPartnerKind] = useState<'business' | 'freelancer'>(
    resolvedInitialPartnerKind === 'freelancer' ? 'freelancer' : 'business'
  )

  useEffect(() => {
    if (state.success) {
      onClose()
    }
  }, [state.success, onClose])

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

        <form action={formAction} className="space-y-5">
          {mode === 'edit' && vendor ? (
            <input type="hidden" name="vendorId" value={vendor.id} />
          ) : null}

          <div>
            <label className="block text-sm font-medium">Partner Type</label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setPartnerKind('business')}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  partnerKind === 'business'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                Business Vendor
              </button>

              <button
                type="button"
                onClick={() => setPartnerKind('freelancer')}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  partnerKind === 'freelancer'
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-700'
                }`}
              >
                Freelancer
              </button>
            </div>

            <input type="hidden" name="partnerKind" value={partnerKind} />
          </div>

          {partnerKind === 'business' ? (
            <>
              <div>
                <label className="block text-sm font-medium">Business Name</label>
                <input
                  name="businessName"
                  required
                  defaultValue={vendor?.business_name ?? vendor?.vendor_name ?? ''}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Contact Name</label>
                <input
                  name="contactName"
                  defaultValue={vendor?.contact_name ?? ''}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium">Freelancer Name</label>
                <input
                  name="freelancerName"
                  required
                  defaultValue={vendor?.freelancer_name ?? vendor?.vendor_name ?? ''}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">
                  Business Name <span className="text-slate-400">(optional)</span>
                </label>
                <input
                  name="businessName"
                  defaultValue={vendor?.business_name ?? ''}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Service Type</label>
              <input
                name="serviceType"
                defaultValue={vendor?.service_type ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Audio, Video, Camera, Labor, etc."
              />
            </div>

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
            <label className="block text-sm font-medium">
              {partnerKind === 'freelancer' ? 'Default Day Rate' : 'Default Cost'}
            </label>
            <input
              name="defaultCost"
              type="number"
              step="0.01"
              defaultValue={vendor?.default_cost ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
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

          <SubmitButton mode={mode} />
        </form>
      </div>
    </div>
  )
}