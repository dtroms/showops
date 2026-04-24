'use client'

import { useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import {
  createVendor,
  updateVendor,
  type VendorState,
} from '@/app/actions/vendors'
import {
  VendorServiceAreaEditor,
  type VendorServiceArea,
} from '@/components/vendors/vendor-service-area-editor'

type VendorPartnerRecord = {
  id: string
  vendor_name: string
  vendor_type: string | null
  partner_kind?: string | null
  business_name?: string | null
  contact_name: string | null
  service_type: string | null
  email: string | null
  phone: string | null
  website?: string | null
  default_cost: number | null
  notes: string | null
  preferred_vendor?: boolean | null
  rating?: number | null
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
  service_areas?: VendorServiceArea[]
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
      {pending ? 'Saving...' : mode === 'edit' ? 'Save Vendor Partner' : 'Create Vendor Partner'}
    </button>
  )
}

export function VendorPartnerProfileForm({
  mode,
  vendor,
}: {
  mode: 'create' | 'edit'
  vendor?: VendorPartnerRecord
}) {
  const action = mode === 'edit' ? updateVendor : createVendor
  const [state, formAction] = useFormState(action, initialState)
  const [serviceMode, setServiceMode] = useState(
    vendor?.primary_service_area?.service_mode ?? 'local'
  )

  const showAdditionalAreaFields = useMemo(
    () => serviceMode === 'regional' || serviceMode === 'national',
    [serviceMode]
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {mode === 'edit' ? 'Edit Vendor Partner' : 'Add Vendor Partner'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage rental houses, fabrication partners, and outside service providers.
            </p>
          </div>

          <Link
            href="/vendors/business"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Back
          </Link>
        </div>
      </div>

      <form
        action={formAction}
        className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
      >
        {mode === 'edit' && vendor ? (
          <input type="hidden" name="vendorId" value={vendor.id} />
        ) : null}

        <input type="hidden" name="partnerKind" value="business" />

        <div>
          <label className="block text-sm font-medium text-slate-300">Business Name</label>
          <input
            name="businessName"
            required
            defaultValue={vendor?.business_name ?? vendor?.vendor_name ?? ''}
            className={fieldClass()}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-6">
          <div>
            <label className="block text-sm font-medium text-slate-300">Contact Name</label>
            <input
              name="contactName"
              defaultValue={vendor?.contact_name ?? ''}
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Service Type</label>
            <input
              name="serviceType"
              defaultValue={vendor?.service_type ?? ''}
              className={fieldClass()}
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

          <div>
            <label className="block text-sm font-medium text-slate-300">Rating</label>
            <input
              name="rating"
              type="number"
              min="0"
              max="5"
              step="0.5"
              defaultValue={vendor?.rating ?? ''}
              className={fieldClass()}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Website</label>
          <input
            name="website"
            defaultValue={vendor?.website ?? ''}
            className={fieldClass()}
          />
        </div>

        <div className={cardClass()}>
          <h3 className="text-lg font-semibold text-white">Vendor Partner Settings</h3>

          <div className="mt-4">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
              <input
                type="checkbox"
                name="preferredVendor"
                value="true"
                defaultChecked={Boolean(vendor?.preferred_vendor)}
              />
              <span className="text-sm">Preferred Vendor</span>
            </label>
          </div>
        </div>

        <div className={cardClass()}>
          <h3 className="text-lg font-semibold text-white">Primary Service Area</h3>
          <p className="mt-1 text-sm text-slate-400">
            Regional or national service mode will reveal additional service area fields below.
          </p>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Label</label>
              <input
                name="serviceAreaLabel"
                defaultValue={vendor?.primary_service_area?.label ?? 'Primary'}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Service Mode</label>
              <select
                name="serviceAreaMode"
                defaultValue={vendor?.primary_service_area?.service_mode ?? 'local'}
                onChange={(e) => setServiceMode(e.target.value)}
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
                defaultValue={vendor?.primary_service_area?.city ?? ''}
                required
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">State</label>
              <input
                name="serviceAreaState"
                defaultValue={vendor?.primary_service_area?.state ?? ''}
                required
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Postal Code</label>
              <input
                name="serviceAreaPostalCode"
                defaultValue={vendor?.primary_service_area?.postal_code ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Country</label>
              <input
                name="serviceAreaCountry"
                defaultValue={vendor?.primary_service_area?.country ?? 'USA'}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Service Radius (Miles)</label>
              <input
                name="serviceAreaRadiusMiles"
                type="number"
                min="1"
                defaultValue={vendor?.primary_service_area?.service_radius_miles ?? 50}
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
              defaultValue={vendor?.primary_service_area?.notes ?? ''}
              className={fieldClass()}
            />
          </div>
        </div>

        {showAdditionalAreaFields ? (
          <div className={cardClass()}>
            <h3 className="text-lg font-semibold text-white">Additional Service Areas</h3>
            <p className="mt-1 text-sm text-slate-400">
              Add one additional service area now. More can be added after save on the profile page.
            </p>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Label</label>
                <input
                  name="additionalServiceAreaLabel"
                  className={fieldClass()}
                  placeholder="Atlanta Branch, West Coast, Texas Market, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Service Mode</label>
                <select
                  name="additionalServiceAreaMode"
                  defaultValue="regional"
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
                  name="additionalServiceAreaCity"
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">State</label>
                <input
                  name="additionalServiceAreaState"
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Postal Code</label>
                <input
                  name="additionalServiceAreaPostalCode"
                  className={fieldClass()}
                />
              </div>
            </div>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Country</label>
                <input
                  name="additionalServiceAreaCountry"
                  defaultValue="USA"
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Service Radius (Miles)</label>
                <input
                  name="additionalServiceAreaRadiusMiles"
                  type="number"
                  min="1"
                  defaultValue={150}
                  className={fieldClass()}
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-300">Notes</label>
              <textarea
                name="additionalServiceAreaNotes"
                rows={3}
                className={fieldClass()}
              />
            </div>
          </div>
        ) : null}

        <div>
          <label className="block text-sm font-medium text-slate-300">General Notes</label>
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

        <div className="flex items-center gap-3">
          <SubmitButton mode={mode} />
          <Link
            href="/vendors/business"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>

      {mode === 'edit' && vendor?.id ? (
        <VendorServiceAreaEditor
          vendorId={vendor.id}
          serviceAreas={vendor.service_areas ?? []}
        />
      ) : null}
    </div>
  )
}