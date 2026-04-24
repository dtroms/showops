'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
  createVendorServiceArea,
  deleteVendorServiceArea,
  type VendorServiceAreaState,
} from '@/app/actions/vendor-service-areas'

export type VendorServiceArea = {
  id: string
  label: string | null
  city: string
  state: string
  postal_code: string | null
  country: string | null
  service_radius_miles: number
  service_mode: 'local' | 'regional' | 'national'
  notes: string | null
  is_primary: boolean
}

const initialState: VendorServiceAreaState = {}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
    >
      {pending ? 'Saving...' : label}
    </button>
  )
}

function DeleteButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 disabled:opacity-50"
    >
      {pending ? 'Removing...' : 'Remove'}
    </button>
  )
}

export function VendorServiceAreaEditor({
  vendorId,
  serviceAreas,
}: {
  vendorId: string
  serviceAreas: VendorServiceArea[]
}) {
  const additionalAreas = serviceAreas.filter((area) => !area.is_primary)
  const [newAreaState, newAreaAction] = useFormState(
    createVendorServiceArea,
    initialState
  )

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <h3 className="text-xl font-semibold text-white">Additional Service Areas</h3>
      <p className="mt-2 text-sm text-slate-400">
        Add extra markets, branch locations, or secondary coverage areas beyond the primary service area above.
      </p>

      <div className="mt-6 space-y-4">
        {additionalAreas.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-4 text-sm text-slate-500">
            No additional service areas yet.
          </div>
        ) : (
          additionalAreas.map((area) => (
            <div
              key={area.id}
              className="flex flex-col gap-4 rounded-[24px] border border-white/10 bg-white/[0.02] p-4 md:flex-row md:items-start md:justify-between"
            >
              <div>
                <p className="font-medium text-white">
                  {area.label || 'Additional Area'} — {area.city}, {area.state}
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  {area.service_mode} · {area.service_radius_miles} mi radius
                </p>
                {area.notes ? (
                  <p className="mt-2 text-sm text-slate-500">{area.notes}</p>
                ) : null}
              </div>

              <form action={deleteVendorServiceArea}>
                <input type="hidden" name="serviceAreaId" value={area.id} />
                <input type="hidden" name="vendorId" value={vendorId} />
                <DeleteButton />
              </form>
            </div>
          ))
        )}
      </div>

      <form action={newAreaAction} className="mt-6 space-y-4 border-t border-white/10 pt-6">
        <input type="hidden" name="vendorId" value={vendorId} />

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300">Label</label>
            <input
              name="label"
              className={fieldClass()}
              placeholder="West Coast, Atlanta Branch, Texas Market, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Service Mode</label>
            <select
              name="serviceMode"
              defaultValue="local"
              className={fieldClass()}
            >
              <option value="local" className="bg-slate-900 text-white">Local</option>
              <option value="regional" className="bg-slate-900 text-white">Regional</option>
              <option value="national" className="bg-slate-900 text-white">National</option>
            </select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-slate-300">City</label>
            <input name="city" className={fieldClass()} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">State</label>
            <input name="state" className={fieldClass()} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Postal Code</label>
            <input name="postalCode" className={fieldClass()} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-300">Country</label>
            <input
              name="country"
              defaultValue="USA"
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Service Radius (Miles)</label>
            <input
              name="serviceRadiusMiles"
              type="number"
              min="1"
              defaultValue={50}
              className={fieldClass()}
              required
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className={fieldClass()}
          />
        </div>

        {newAreaState.error ? (
          <p className="text-sm text-rose-300">{newAreaState.error}</p>
        ) : null}
        {newAreaState.success ? (
          <p className="text-sm text-emerald-300">Additional service area added.</p>
        ) : null}

        <SaveButton label="Add Service Area" />
      </form>
    </div>
  )
}