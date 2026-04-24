'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createShow, type CreateShowState } from '@/app/actions/shows'
import {
  VenueSelectFields,
  type VenueSelectOption,
} from '@/components/shows/venue-select-fields'

const initialState: CreateShowState = {}

export type PMOption = {
  membership_id: string
  name: string
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
    >
      {pending ? 'Creating show...' : 'Create Show'}
    </button>
  )
}

export function NewShowForm({
  venues,
  isLeadership,
  pmOptions,
}: {
  venues: VenueSelectOption[]
  isLeadership: boolean
  pmOptions: PMOption[]
}) {
  const [state, formAction] = useFormState(createShow, initialState)

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Create Show</h1>
      </div>

      <form
        action={formAction}
        className="space-y-6 rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
      >
        {isLeadership ? (
          <div>
            <label className="block text-sm font-medium text-slate-300">
              Assign Project Manager
            </label>
            <select
              name="leadMembershipId"
              defaultValue=""
              className={fieldClass()}
            >
              <option value="" className="bg-slate-900 text-white">
                — Leave Unassigned —
              </option>
              {pmOptions.map((pm) => (
                <option
                  key={pm.membership_id}
                  value={pm.membership_id}
                  className="bg-slate-900 text-white"
                >
                  {pm.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Leadership can assign a lead PM now or leave the show unassigned.
            </p>
          </div>
        ) : null}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300">Show Name</label>
            <input name="showName" required className={fieldClass()} />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Show Number</label>
            <input name="showNumber" required className={fieldClass()} />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Client Name</label>
          <input name="clientName" required className={fieldClass()} />
        </div>

        <VenueSelectFields venues={venues} />

        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <label className="block text-sm font-medium text-slate-300">Start Date</label>
            <input
              name="startDate"
              type="date"
              required
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">End Date</label>
            <input
              name="endDate"
              type="date"
              required
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">
              Estimated Revenue
            </label>
            <input
              name="estimatedRevenue"
              type="number"
              step="0.01"
              className={fieldClass()}
            />
          </div>
        </div>

        {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}

        <div className="flex justify-end">
          <SubmitButton />
        </div>
      </form>
    </div>
  )
}