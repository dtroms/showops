'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { usePathname } from 'next/navigation'
import {
  createIssueReport,
  type CreateIssueReportState,
} from '@/app/actions/issue-reports'

const initialState: CreateIssueReportState = {}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Sending...' : 'Submit Issue'}
    </button>
  )
}

export function IssueReportButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [browserInfo, setBrowserInfo] = useState('')
  const [state, formAction] = useFormState(createIssueReport, initialState)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setBrowserInfo(window.navigator.userAgent)
    }
  }, [])

  useEffect(() => {
    if (state.success) {
      const timer = window.setTimeout(() => {
        setOpen(false)
      }, 1200)

      return () => window.clearTimeout(timer)
    }
  }, [state.success])

  const inferredShowId = useMemo(() => {
    const match = pathname.match(/\/shows\/([^/]+)/)
    return match?.[1] ?? ''
  }, [pathname])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-50 rounded-full border border-white/10 bg-white px-4 py-3 text-sm font-semibold text-slate-950 shadow-2xl transition hover:bg-slate-100"
      >
        Report Issue
      </button>

      {open ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-end bg-black/50 p-4 backdrop-blur-sm sm:items-center sm:justify-center">
          <div className="w-full max-w-xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-white">Report an Issue</h2>
                <p className="mt-1 text-sm text-slate-400">
                  This goes directly into the admin issue inbox for beta testing.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Close
              </button>
            </div>

            <form action={formAction} className="mt-5 space-y-4">
              <input type="hidden" name="route" value={pathname} />
              <input type="hidden" name="showId" value={inferredShowId} />
              <input type="hidden" name="browserInfo" value={browserInfo} />

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Title
                </label>
                <input
                  name="title"
                  placeholder="Short summary of the bug"
                  required
                  className={fieldClass()}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Severity
                  </label>
                  <select
                    name="severity"
                    defaultValue="medium"
                    className={fieldClass()}
                  >
                    <option value="low" className="bg-slate-900 text-white">Low</option>
                    <option value="medium" className="bg-slate-900 text-white">Medium</option>
                    <option value="high" className="bg-slate-900 text-white">High</option>
                    <option value="critical" className="bg-slate-900 text-white">Critical</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300">
                    Current Route
                  </label>
                  <input
                    value={pathname}
                    readOnly
                    className={`${fieldClass()} text-slate-400`}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Description
                </label>
                <textarea
                  name="description"
                  rows={6}
                  placeholder="What happened? What were you trying to do? Can you reproduce it?"
                  required
                  className={fieldClass()}
                />
              </div>

              {state.error ? (
                <p className="text-sm text-rose-300">{state.error}</p>
              ) : null}

              {state.success ? (
                <p className="text-sm text-emerald-300">{state.success}</p>
              ) : null}

              <div className="flex items-center gap-3">
                <SubmitButton />
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}