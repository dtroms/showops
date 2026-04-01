'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { addVendorToShow, type ShowVendorState } from '@/app/actions/show-vendors'
import { VendorSearchSelect } from './vendor-search-select'

type VendorOption = {
  id: string
  vendor_name: string
  vendor_type: string | null
  service_type: string | null
  business_name?: string | null
}

const initialState: ShowVendorState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Assigning...' : 'Assign Freelance Labor'}
    </button>
  )
}

export function ShowVendorForm({
  showId,
  vendors,
}: {
  showId: string
  vendors: VendorOption[]
}) {
  const [state, formAction] = useFormState(addVendorToShow, initialState)

  return (
    <div className="rounded-2xl border bg-white p-6">
      <h2 className="text-xl font-semibold">Assign Freelance Labor</h2>
      <p className="mt-1 text-sm text-slate-600">
        Add a freelancer to this show so they can be used in budgeting and conflict checks.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="showId" value={showId} />

        <VendorSearchSelect vendors={vendors} />

        <div>
          <label className="block text-sm font-medium">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <SubmitButton />
      </form>
    </div>
  )
}