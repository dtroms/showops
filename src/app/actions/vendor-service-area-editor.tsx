'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
  createVendorServiceArea,
  deleteVendorServiceArea,
  saveVendorPrimaryServiceArea,
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

function SaveButton({ label }: { label: string }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
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
      className="rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-700 disabled:opacity-50"
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
  const primaryArea = serviceAreas.find((area) => area.is_primary) ?? null
  const additionalAreas = serviceAreas.filter((area) => !area.is_primary)

  const [primaryState, primaryAction] = useFormState(
    saveVendorPrimaryServiceArea,
    initialState
  )
  const [newAreaState, newAreaAction] = useFormState(
    createVendorServiceArea,
    initialState
  )

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-xl font-semibold">Primary Service Area</h3>
        <p className="mt-2 text-sm text-slate-600">
          This is the main market or home base for the freelancer or vendor.
        </p>

        <form action={primaryAction} className="mt-6 space-y-4">
          <input type="hidden" name="vendorId" value={vendorId} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Label</label>
              <input
                name="label"
                defaultValue={primaryArea?.label ?? 'Primary'}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="Primary, HQ, Nashville Base, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Service Mode</label>
              <select
                name="serviceMode"
                defaultValue={primaryArea?.service_mode ?? 'local'}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="local">Local</option>
                <option value="regional">Regional</option>
                <option value="national">National</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">City</label>
              <input
                name="city"
                defaultValue={primaryArea?.city ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">State</label>
              <input
                name="state"
                defaultValue={primaryArea?.state ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Postal Code</label>
              <input
                name="postalCode"
                defaultValue={primaryArea?.postal_code ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Country</label>
              <input
                name="country"
                defaultValue={primaryArea?.country ?? 'USA'}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Service Radius (Miles)</label>
              <input
                name="serviceRadiusMiles"
                type="number"
                min="1"
                defaultValue={primaryArea?.service_radius_miles ?? 50}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={3}
              defaultValue={primaryArea?.notes ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Covers the Southeast, prefers fly dates, has local labor contacts, etc."
            />
          </div>

          {primaryState.error ? (
            <p className="text-sm text-red-600">{primaryState.error}</p>
          ) : null}
          {primaryState.success ? (
            <p className="text-sm text-emerald-600">Primary service area saved.</p>
          ) : null}

          <SaveButton label="Save Primary Area" />
        </form>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-xl font-semibold">Additional Service Areas</h3>
        <p className="mt-2 text-sm text-slate-600">
          Add extra markets, branch locations, or secondary coverage areas.
        </p>

        <div className="mt-6 space-y-4">
          {additionalAreas.length === 0 ? (
            <div className="rounded-xl border border-dashed p-4 text-sm text-slate-500">
              No additional service areas yet.
            </div>
          ) : (
            additionalAreas.map((area) => (
              <div
                key={area.id}
                className="flex flex-col gap-4 rounded-xl border p-4 md:flex-row md:items-start md:justify-between"
              >
                <div>
                  <p className="font-medium">
                    {area.label || 'Additional Area'} — {area.city}, {area.state}
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
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

        <form action={newAreaAction} className="mt-6 space-y-4 border-t pt-6">
          <input type="hidden" name="vendorId" value={vendorId} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Label</label>
              <input
                name="label"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                placeholder="West Coast, Atlanta Branch, Texas Market, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Service Mode</label>
              <select
                name="serviceMode"
                defaultValue="local"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="local">Local</option>
                <option value="regional">Regional</option>
                <option value="national">National</option>
              </select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium">City</label>
              <input
                name="city"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">State</label>
              <input
                name="state"
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Postal Code</label>
              <input
                name="postalCode"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium">Country</label>
              <input
                name="country"
                defaultValue="USA"
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Service Radius (Miles)</label>
              <input
                name="serviceRadiusMiles"
                type="number"
                min="1"
                defaultValue={50}
                className="mt-1 w-full rounded-lg border px-3 py-2"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={3}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          {newAreaState.error ? (
            <p className="text-sm text-red-600">{newAreaState.error}</p>
          ) : null}
          {newAreaState.success ? (
            <p className="text-sm text-emerald-600">Additional service area added.</p>
          ) : null}

          <SaveButton label="Add Service Area" />
        </form>
      </div>
    </div>
  )
}