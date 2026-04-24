'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createVenue, updateVenue, type VenueState } from '@/app/actions/venues'

type Venue = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  notes: string | null
  primary_contact_name: string | null
  primary_contact_role: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  is_active: boolean
}

const initialState: VenueState = {}

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
      {pending ? 'Saving...' : mode === 'edit' ? 'Save Venue' : 'Create Venue'}
    </button>
  )
}

export function VenueFormModal({
  mode,
  venue,
  onClose,
}: {
  mode: 'create' | 'edit'
  venue?: Venue
  onClose: () => void
}) {
  const action = mode === 'edit' ? updateVenue : createVenue
  const [state, formAction] = useFormState(action, initialState)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-3xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {mode === 'edit' ? 'Edit Venue' : 'Add Venue'}
          </h3>

          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === 'edit' && venue ? (
            <input type="hidden" name="venueId" value={venue.id} />
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-300">Venue Name</label>
            <input
              name="name"
              defaultValue={venue?.name ?? ''}
              required
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Address</label>
            <input
              name="address"
              defaultValue={venue?.address ?? ''}
              className={fieldClass()}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">City</label>
              <input
                name="city"
                defaultValue={venue?.city ?? ''}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">State</label>
              <input
                name="state"
                defaultValue={venue?.state ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4">
            <h4 className="text-lg font-semibold text-white">Primary Venue Contact</h4>

            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input
                  name="primaryContactName"
                  defaultValue={venue?.primary_contact_name ?? ''}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Role</label>
                <input
                  name="primaryContactRole"
                  defaultValue={venue?.primary_contact_role ?? ''}
                  className={fieldClass()}
                  placeholder="Sales Manager, Event Manager, AV Contact, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                  name="primaryContactEmail"
                  type="email"
                  defaultValue={venue?.primary_contact_email ?? ''}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Phone</label>
                <input
                  name="primaryContactPhone"
                  defaultValue={venue?.primary_contact_phone ?? ''}
                  className={fieldClass()}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Notes</label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={venue?.notes ?? ''}
              className={fieldClass()}
              placeholder="Loading dock notes, rigging restrictions, union notes, preferred rooms, etc."
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