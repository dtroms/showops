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
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Assigning...' : 'Assign Freelance Labor'}
    </button>
  )
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
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
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <h2 className="text-xl font-semibold text-white">Assign Freelance Labor</h2>
      <p className="mt-1 text-sm text-slate-400">
        Add a freelancer to this show so they can be used in budgeting and conflict checks.
      </p>

      <form action={formAction} className="mt-6 space-y-4">
        <input type="hidden" name="showId" value={showId} />

        <VendorSearchSelect vendors={vendors} />

        <div>
          <label className="block text-sm font-medium text-slate-300">Notes</label>
          <textarea
            name="notes"
            rows={3}
            className={fieldClass()}
          />
        </div>

        {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
        {state.success ? <p className="text-sm text-emerald-300">{state.success}</p> : null}

        <SubmitButton />
      </form>
    </div>
  )
}