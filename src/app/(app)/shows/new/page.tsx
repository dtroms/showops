'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createShow, type CreateShowState } from '@/app/actions/shows'

const initialState: CreateShowState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Creating show...' : 'Create Show'}
    </button>
  )
}

export default function NewShowPage() {
  const [state, formAction] = useFormState(createShow, initialState)

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-3xl font-bold">Create Show</h1>
        <p className="mt-2 text-sm text-slate-600">
          Add a new show to your workspace.
        </p>
      </div>

      <form action={formAction} className="rounded-2xl border bg-white p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Show Name</label>
            <input
              name="showName"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Show Number</label>
            <input
              name="showNumber"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Client Name</label>
            <input
              name="clientName"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Venue Name</label>
            <input
              name="venueName"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <div>
            <label className="block text-sm font-medium">City</label>
            <input
              name="city"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">State</label>
            <input
              name="state"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Start Date</label>
            <input
              name="startDate"
              type="date"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">End Date</label>
            <input
              name="endDate"
              type="date"
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>
        </div>

        <div className="max-w-sm">
          <label className="block text-sm font-medium">Estimated Revenue</label>
          <input
            name="estimatedRevenue"
            type="number"
            step="0.01"
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {state.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}

        <SubmitButton />
      </form>
    </div>
  )
}