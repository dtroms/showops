'use client'

import { useFormState, useFormStatus } from 'react-dom'
import Link from 'next/link'
import {
  createVendor,
  updateVendor,
  type VendorState,
} from '@/app/actions/vendors'

type FreelancerRecord = {
  id: string
  vendor_name: string
  vendor_type: string | null
  partner_kind?: string | null
  freelancer_name?: string | null
  service_type: string | null
  email: string | null
  phone: string | null
  default_cost: number | null
  notes: string | null
  travel_notes?: string | null
  travel_available?: boolean | null
  preferred_vendor?: boolean | null
  average_rating?: number | null
  rating_count?: number | null
  is_active: boolean
  primary_service_area?: {
    city: string | null
    state: string | null
    postal_code: string | null
    country: string | null
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
      {pending ? 'Saving...' : mode === 'edit' ? 'Save Freelancer' : 'Create Freelancer'}
    </button>
  )
}

function RatingDisplay({
  average,
  count,
}: {
  average?: number | null
  count?: number | null
}) {
  if (!count) {
    return <span className="text-sm text-slate-500">No ratings yet</span>
  }

  const rounded = Math.round(average ?? 0)
  const stars = '★'.repeat(rounded) + '☆'.repeat(5 - rounded)

  return (
    <span className="text-sm text-slate-300">
      <span className="mr-2 text-amber-300">{stars}</span>
      {(average ?? 0).toFixed(1)} ({count})
    </span>
  )
}

export function FreelancerProfileForm({
  mode,
  vendor,
}: {
  mode: 'create' | 'edit'
  vendor?: FreelancerRecord
}) {
  const action = mode === 'edit' ? updateVendor : createVendor
  const [state, formAction] = useFormState(action, initialState)

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">
              {mode === 'edit' ? 'Edit Freelancer' : 'Add Freelancer'}
            </h1>
            <p className="mt-2 text-sm text-slate-400">
              Manage freelance operators, technicians, and labor partners.
            </p>
          </div>

          <div className="text-right">
            <RatingDisplay
              average={vendor?.average_rating}
              count={vendor?.rating_count}
            />
          </div>
        </div>
      </div>

      <form
        action={formAction}
        className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
      >
        {mode === 'edit' && vendor ? (
          <input type="hidden" name="vendorId" value={vendor.id} />
        ) : null}

        <input type="hidden" name="partnerKind" value="freelancer" />
        <input type="hidden" name="serviceAreaLabel" value="Home Base" />
        <input type="hidden" name="serviceAreaMode" value="local" />
        <input type="hidden" name="serviceAreaRadiusMiles" value="50" />

        <div>
          <label className="block text-sm font-medium text-slate-300">Freelancer Name</label>
          <input
            name="freelancerName"
            required
            defaultValue={vendor?.freelancer_name ?? vendor?.vendor_name ?? ''}
            className={fieldClass()}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
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
            <label className="block text-sm font-medium text-slate-300">Default Day Rate</label>
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
          <h3 className="text-lg font-semibold text-white">Freelancer Settings</h3>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
              <input
                type="checkbox"
                name="travelAvailable"
                value="true"
                defaultChecked={Boolean(vendor?.travel_available)}
              />
              <span className="text-sm">Will Travel</span>
            </label>

            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-slate-300">
              <input
                type="checkbox"
                name="preferredVendor"
                value="true"
                defaultChecked={Boolean(vendor?.preferred_vendor)}
              />
              <span className="text-sm">Preferred Freelancer</span>
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
          <h3 className="text-lg font-semibold text-white">Service Area</h3>
          <p className="mt-1 text-sm text-slate-400">
            Where this freelancer is based.
          </p>

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
              <label className="block text-sm font-medium text-slate-300">State / Region</label>
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

          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-300">Country</label>
            <input
              name="serviceAreaCountry"
              defaultValue={vendor?.primary_service_area?.country ?? 'USA'}
              className={fieldClass()}
            />
          </div>
        </div>

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
            href="/vendors/freelance"
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Cancel
          </Link>
        </div>
      </form>
    </div>
  )
}