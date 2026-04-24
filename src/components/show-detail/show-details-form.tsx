'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
  deleteShow,
  updateShowDetails,
  type UpdateShowState,
} from '@/app/actions/shows'
import {
  VenueSelectFields,
  type VenueSelectOption,
} from '@/components/shows/venue-select-fields'

type ShowDetails = {
  id: string
  showName: string
  showNumber: string
  clientName: string
  venueId: string
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
      {pending ? 'Saving...' : 'Save Show Details'}
    </button>
  )
}

export function ShowDetailsForm({
  show,
  venues,
}: {
  show: ShowDetails
  venues: VenueSelectOption[]
}) {
  const [state, formAction] = useFormState(updateShowDetails, initialState)

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-white">Show Details</h2>
        </div>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="showId" value={show.id} />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Show Name</label>
              <input
                name="showName"
                defaultValue={show.showName}
                required
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Show Number</label>
              <input
                name="showNumber"
                defaultValue={show.showNumber}
                required
                className={fieldClass()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Client Name</label>
            <input
              name="clientName"
              defaultValue={show.clientName}
              required
              className={fieldClass()}
            />
          </div>

          <VenueSelectFields
            venues={venues}
            initialVenueId={show.venueId}
            initialVenueName={show.venueName}
            initialCity={show.city}
            initialState={show.state}
            initialVenueContactName={show.venueContactName}
            initialVenueContactEmail={show.venueContactEmail}
            initialVenueContactPhone={show.venueContactPhone}
          />

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Estimated Revenue</label>
              <input
                name="estimatedRevenue"
                type="number"
                step="0.01"
                defaultValue={show.estimatedRevenue}
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Status</label>
              <select
                name="status"
                defaultValue={show.status}
                className={fieldClass()}
              >
                <option value="draft" className="bg-slate-900 text-white">Draft</option>
                <option value="quoted" className="bg-slate-900 text-white">Quoted</option>
                <option value="confirmed" className="bg-slate-900 text-white">Confirmed</option>
                <option value="in_progress" className="bg-slate-900 text-white">In Progress</option>
                <option value="completed" className="bg-slate-900 text-white">Completed</option>
                <option value="archived" className="bg-slate-900 text-white">Archived</option>
              </select>
            </div>
          </div>

          <div className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4">
            <h3 className="text-lg font-semibold text-white">Event Point of Contact</h3>

            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-slate-300">Name</label>
                <input
                  name="eventContactName"
                  defaultValue={show.eventContactName}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                  name="eventContactEmail"
                  type="email"
                  defaultValue={show.eventContactEmail}
                  className={fieldClass()}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">Phone</label>
                <input
                  name="eventContactPhone"
                  defaultValue={show.eventContactPhone}
                  className={fieldClass()}
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Internal Notes</label>
            <textarea
              name="internalNotes"
              rows={6}
              defaultValue={show.internalNotes}
              className={fieldClass()}
            />
          </div>

          {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
          {state.success ? (
            <p className="text-sm text-emerald-300">Saved successfully.</p>
          ) : null}

          <SubmitButton />
        </form>
      </div>

      <div className="rounded-[28px] border border-rose-500/20 bg-rose-500/[0.08] p-6">
        <h3 className="text-xl font-semibold text-rose-300">Danger Zone</h3>
        <p className="mt-2 text-sm text-rose-200/90">
          Deleting a show will remove the show and its related budgeting and vendor assignment data.
        </p>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              if (
                !confirm(
                  'Are you sure you want to delete this show? This cannot be undone.'
                )
              ) {
                return
              }
              deleteShow(show.id)
            }}
            className="rounded-2xl border border-rose-500/20 bg-white/5 px-4 py-2 text-sm font-medium text-rose-300 transition hover:bg-white/10"
          >
            Delete Show
          </button>
        </div>
      </div>
    </div>
  )
}