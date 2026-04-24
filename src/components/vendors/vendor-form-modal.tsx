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
  website?: string | null
  default_cost: number | null
  notes: string | null
  travel_notes?: string | null
  travel_available?: boolean | null
  preferred_vendor?: boolean | null
  nationwide_coverage?: boolean | null
  is_active: boolean
  primary_service_area?: {
    label: string | null
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
    service_radius_miles: number | null
    service_mode: 'local' | 'regional' | 'national' | null
    notes: string | null
  } | null
}

const initialState: VendorState = {}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function cardClass() {
  return 'rounded-[24px] border border-white/10 bg-white/[0.02] p-4'
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
    if (state.success) onClose()
  }, [state.success, onClose])

  const primaryArea = vendor?.primary_service_area

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
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

        <form action={formAction} className="space-y-6">
          {mode === 'edit' && vendor ? (
            <input type="hidden" name="vendorId" value={vendor.id} />
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-300">Partner Type</label>
            <div className="mt-2 flex gap-3">
              <button
                type="button"
                onClick={() => setPartnerKind('business')}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  partnerKind === 'business'
                    ? 'border-white bg-white text-slate-950'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                }`}
              >
                Vendor Partner / Rental House
              </button>

              <button
                type="button"
                onClick={() => setPartnerKind('freelancer')}
                className={`rounded-2xl border px-4 py-2 text-sm font-medium transition ${
                  partnerKind === 'freelancer'
                    ? 'border-white bg-white text-slate-950'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
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
                <label className="block text-sm font-medium text-slate-300">Business Name</label>
                <input
                  name="businessName"
                  required
                  defaultValue={vendor?.business_name ?? vendor?.vendor_name ?? ''}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Contact Name</label>
                <input
                  name="contactName"
                  defaultValue={vendor?.contact_name ?? ''}
                  className={fieldClass()}
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-300">Freelancer Name</label>
                <input
                  name="freelancerName"
                  required
                  defaultValue={vendor?.freelancer_name ?? vendor?.vendor_name ?? ''}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Business Name <span className="text-slate-500">(optional)</span>
                </label>
                <input
                  name="businessName"
                  defaultValue={vendor?.business_name ?? ''}
                  className={fieldClass()}
                  placeholder="Optional LLC or business name"
                />
              </div>
            </>
          )}

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-slate-300">Service Type</label>
              <input
                name="serviceType"
                defaultValue={vendor?.service_type ?? ''}
                className={fieldClass()}
                placeholder="Audio, Video, Camera, Lighting, Labor, etc."
              />
            </div>

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

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Website</label>
              <input
                name="website"
                defaultValue={vendor?.website ?? ''}
                className={fieldClass()}
                placeholder="https://..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">
                {partnerKind === 'freelancer' ? 'Default Day Rate' : 'Default Cost'}
              </label>
              <input
                name="defaultCost"
                type="number"
                step="0.01"
                defaultValue={vendor?.default_cost ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className={cardClass()}>
            <h4 className="text-lg font-semibold text-white">Coverage & Travel</h4>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
                <input
                  type="checkbox"
                  name="travelAvailable"
                  value="true"
                  defaultChecked={Boolean(vendor?.travel_available)}
                />
                <span className="text-sm">Travel Available</span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
                <input
                  type="checkbox"
                  name="preferredVendor"
                  value="true"
                  defaultChecked={Boolean(vendor?.preferred_vendor)}
                />
                <span className="text-sm">Preferred Partner</span>
              </label>

              <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
                <input
                  type="checkbox"
                  name="nationwideCoverage"
                  value="true"
                  defaultChecked={Boolean(vendor?.nationwide_coverage)}
                />
                <span className="text-sm">Nationwide Coverage</span>
              </label>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300">Travel Notes</label>
              <textarea
                name="travelNotes"
                rows={3}
                defaultValue={vendor?.travel_notes ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className={cardClass()}>
            <h4 className="text-lg font-semibold text-white">Primary Service Area</h4>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Label</label>
                <input
                  name="serviceAreaLabel"
                  defaultValue={primaryArea?.label ?? 'Primary'}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Service Mode</label>
                <select
                  name="serviceAreaMode"
                  defaultValue={primaryArea?.service_mode ?? 'local'}
                  className={fieldClass()}
                >
                  <option value="local" className="bg-slate-900 text-white">Local</option>
                  <option value="regional" className="bg-slate-900 text-white">Regional</option>
                  <option value="national" className="bg-slate-900 text-white">National</option>
                </select>
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-300">City</label>
                <input
                  name="serviceAreaCity"
                  defaultValue={primaryArea?.city ?? ''}
                  required
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">State</label>
                <input
                  name="serviceAreaState"
                  defaultValue={primaryArea?.state ?? ''}
                  required
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Postal Code</label>
                <input
                  name="serviceAreaPostalCode"
                  defaultValue={primaryArea?.postal_code ?? ''}
                  className={fieldClass()}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Country</label>
                <input
                  name="serviceAreaCountry"
                  defaultValue={primaryArea?.country ?? 'USA'}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Service Radius (Miles)</label>
                <input
                  name="serviceAreaRadiusMiles"
                  type="number"
                  min="1"
                  defaultValue={primaryArea?.service_radius_miles ?? 50}
                  required
                  className={fieldClass()}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300">Service Area Notes</label>
              <textarea
                name="serviceAreaNotes"
                rows={3}
                defaultValue={primaryArea?.notes ?? ''}
                className={fieldClass()}
              />
            </div>
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