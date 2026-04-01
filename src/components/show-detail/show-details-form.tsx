'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { deleteShow, updateShowDetails, type UpdateShowState } from '@/app/actions/shows'

type ShowDetails = {
  id: string
  showName: string
  showNumber: string
  clientName: string
  venueName: string
  city: string
  state: string
  startDate: string
  endDate: string
  estimatedRevenue: number | string
  status: string
  internalNotes: string
  venueContactName: string
  venueContactEmail: string
  venueContactPhone: string
  eventContactName: string
  eventContactEmail: string
  eventContactPhone: string
}

const initialState: UpdateShowState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Show Details'}
    </button>
  )
}

export function ShowDetailsForm({ show }: { show: ShowDetails }) {
  const [state, formAction] = useFormState(updateShowDetails, initialState)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <div className="mb-6">
          <h2 className="text-2xl font-bold">Show Details</h2>
          <p className="mt-2 text-sm text-slate-600">
            Update the core and operational information for this show.
          </p>
        </div>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="showId" value={show.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Show Name</label>
              <input
                name="showName"
                defaultValue={show.showName}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Show Number</label>
              <input
                name="showNumber"
                defaultValue={show.showNumber}
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
                defaultValue={show.clientName}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Venue Name</label>
              <input
                name="venueName"
                defaultValue={show.venueName}
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
                defaultValue={show.city}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">State</label>
              <input
                name="state"
                defaultValue={show.state}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Start Date</label>
              <input
                name="startDate"
                type="date"
                defaultValue={show.startDate}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">End Date</label>
              <input
                name="endDate"
                type="date"
                defaultValue={show.endDate}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Estimated Revenue</label>
              <input
                name="estimatedRevenue"
                type="number"
                step="0.01"
                defaultValue={show.estimatedRevenue}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Status</label>
              <select
                name="status"
                defaultValue={show.status}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              >
                <option value="draft">Draft</option>
                <option value="quoted">Quoted</option>
                <option value="confirmed">Confirmed</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="archived">Archived</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <h3 className="text-lg font-semibold">Venue Point of Contact</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  name="venueContactName"
                  defaultValue={show.venueContactName}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  name="venueContactEmail"
                  type="email"
                  defaultValue={show.venueContactEmail}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input
                  name="venueContactPhone"
                  defaultValue={show.venueContactPhone}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-slate-50 p-4">
            <h3 className="text-lg font-semibold">Event Point of Contact</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium">Name</label>
                <input
                  name="eventContactName"
                  defaultValue={show.eventContactName}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Email</label>
                <input
                  name="eventContactEmail"
                  type="email"
                  defaultValue={show.eventContactEmail}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium">Phone</label>
                <input
                  name="eventContactPhone"
                  defaultValue={show.eventContactPhone}
                  className="mt-1 w-full rounded-lg border px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Internal Notes</label>
            <textarea
              name="internalNotes"
              rows={6}
              defaultValue={show.internalNotes}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">Saved successfully.</p> : null}

          <SubmitButton />
        </form>
      </div>

      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h3 className="text-xl font-semibold text-red-700">Danger Zone</h3>
        <p className="mt-2 text-sm text-red-600">
          Deleting a show will remove the show and its related budgeting and vendor assignment data.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              if (!confirm('Are you sure you want to delete this show? This cannot be undone.')) {
                return
              }
              deleteShow(show.id)
            }}
            className="rounded-lg border border-red-300 bg-white px-4 py-2 text-red-700"
          >
            Delete Show
          </button>
        </div>
      </div>
    </div>
  )
}