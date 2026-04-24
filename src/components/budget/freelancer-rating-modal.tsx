'use client'

import { useEffect } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import {
  saveFreelancerRatings,
  type SaveFreelancerRatingsState,
} from '@/app/actions/freelancer-ratings'

type FreelancerForRating = {
  vendor_id: string
  vendor_name: string
  service_type: string | null
}

const initialState: SaveFreelancerRatingsState = {}

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
      {pending ? 'Saving...' : 'Save Ratings'}
    </button>
  )
}

export function FreelancerRatingModal({
  showId,
  freelancers,
}: {
  showId: string
  freelancers: FreelancerForRating[]
}) {
  const [state, formAction] = useFormState(saveFreelancerRatings, initialState)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function closeModal() {
    const params = new URLSearchParams(searchParams.toString())
    params.delete('rate')

    const next = params.toString()
    router.replace(next ? `${pathname}?${next}` : pathname, { scroll: false })
  }

  useEffect(() => {
    if (state.success) {
      closeModal()
    }
  }, [state.success])

  if (!freelancers.length) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Rate Freelancers From This Show</h3>
            <p className="mt-1 text-sm text-slate-400">
              Give a quick 1–5 star rating for each freelancer used on this show.
            </p>
          </div>

          <button
            onClick={closeModal}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Skip for Now
          </button>
        </div>

        <form action={formAction} className="space-y-6">
          <input type="hidden" name="showId" value={showId} />

          {freelancers.map((freelancer) => (
            <div
              key={freelancer.vendor_id}
              className="rounded-[24px] border border-white/10 bg-white/[0.02] p-4"
            >
              <input type="hidden" name="ratingVendorId" value={freelancer.vendor_id} />

              <div className="mb-3">
                <p className="font-medium text-white">{freelancer.vendor_name}</p>
                <p className="text-sm text-slate-500">
                  {freelancer.service_type ?? 'Freelancer'}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-[140px,1fr]">
                <div>
                  <label className="block text-sm font-medium text-slate-300">Rating</label>
                  <select
                    name={`rating_${freelancer.vendor_id}`}
                    className={fieldClass()}
                    defaultValue=""
                  >
                    <option value="" className="bg-slate-900 text-white">Skip</option>
                    <option value="1" className="bg-slate-900 text-white">1 Star</option>
                    <option value="2" className="bg-slate-900 text-white">2 Stars</option>
                    <option value="3" className="bg-slate-900 text-white">3 Stars</option>
                    <option value="4" className="bg-slate-900 text-white">4 Stars</option>
                    <option value="5" className="bg-slate-900 text-white">5 Stars</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">Notes</label>
                  <textarea
                    name={`notes_${freelancer.vendor_id}`}
                    rows={2}
                    className={fieldClass()}
                    placeholder="Optional notes about performance, reliability, communication, etc."
                  />
                </div>
              </div>
            </div>
          ))}

          {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}

          <div className="flex items-center gap-3">
            <SubmitButton />
            <button
              type="button"
              onClick={closeModal}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
            >
              Skip for Now
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}