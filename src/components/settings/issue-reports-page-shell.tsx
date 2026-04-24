'use client'

import { useMemo, useState } from 'react'
import { useFormState } from 'react-dom'
import {
  updateIssueReportStatus,
  type IssueReportRow,
  type UpdateIssueReportState,
} from '@/app/actions/issue-reports'

const initialState: UpdateIssueReportState = {}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function severityTone(severity: IssueReportRow['severity']) {
  switch (severity) {
    case 'critical':
      return 'border-rose-500/20 bg-rose-500/15 text-rose-300'
    case 'high':
      return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
    case 'medium':
      return 'border-sky-500/20 bg-sky-500/15 text-sky-300'
    default:
      return 'border-white/10 bg-white/10 text-slate-300'
  }
}

function statusTone(status: IssueReportRow['status']) {
  switch (status) {
    case 'new':
      return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
    case 'acknowledged':
      return 'border-sky-500/20 bg-sky-500/15 text-sky-300'
    case 'fixed':
      return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
    case 'closed':
      return 'border-white/10 bg-white/10 text-slate-300'
    default:
      return 'border-white/10 bg-white/10 text-slate-300'
  }
}

function UpdateStatusForm({
  issue,
}: {
  issue: IssueReportRow
}) {
  const [state, formAction] = useFormState(updateIssueReportStatus, initialState)

  return (
    <form action={formAction} className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
      <input type="hidden" name="issueId" value={issue.id} />

      <div className="grid gap-3 md:grid-cols-[220px_minmax(0,1fr)_auto]">
        <div>
          <label className="block text-sm font-medium text-slate-300">Status</label>
          <select
            name="status"
            defaultValue={issue.status}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
          >
            <option value="new" className="bg-slate-900 text-white">New</option>
            <option value="acknowledged" className="bg-slate-900 text-white">Acknowledged</option>
            <option value="fixed" className="bg-slate-900 text-white">Fixed</option>
            <option value="closed" className="bg-slate-900 text-white">Closed</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Resolution Notes</label>
          <input
            name="resolutionNotes"
            defaultValue={issue.resolution_notes ?? ''}
            className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
          />
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Save
          </button>
        </div>
      </div>

      {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? <p className="text-sm text-emerald-300">{state.success}</p> : null}
    </form>
  )
}

export function IssueReportsPageShell({
  issues,
}: {
  issues: IssueReportRow[]
}) {
  const [statusFilter, setStatusFilter] = useState<'all' | IssueReportRow['status']>('all')
  const [severityFilter, setSeverityFilter] = useState<'all' | IssueReportRow['severity']>('all')
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    return issues.filter((issue) => {
      if (statusFilter !== 'all' && issue.status !== statusFilter) return false
      if (severityFilter !== 'all' && issue.severity !== severityFilter) return false

      if (!search.trim()) return true

      const haystack = [
        issue.title,
        issue.description,
        issue.route,
        issue.reporter_name ?? '',
        issue.reporter_email ?? '',
        issue.browser_info ?? '',
        issue.resolution_notes ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(search.toLowerCase())
    })
  }, [issues, statusFilter, severityFilter, search])

  const stats = useMemo(() => {
    return {
      total: issues.length,
      open: issues.filter((issue) => issue.status === 'new').length,
      active: issues.filter((issue) => issue.status === 'acknowledged').length,
      fixed: issues.filter((issue) => issue.status === 'fixed').length,
    }
  }, [issues])

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-semibold tracking-tight text-white">Issues Inbox</h1>
        <p className="mt-2 text-sm text-slate-400">
          Beta bug reports submitted from the in-app report button.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Total Reports" value={stats.total} />
        <MetricCard label="New" value={stats.open} />
        <MetricCard label="Acknowledged" value={stats.active} />
        <MetricCard label="Fixed" value={stats.fixed} />
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_220px_220px]">
          <div>
            <label className="block text-sm font-medium text-slate-300">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search title, description, route, reporter, or notes"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Status</label>
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="all" className="bg-slate-900 text-white">All statuses</option>
              <option value="new" className="bg-slate-900 text-white">New</option>
              <option value="acknowledged" className="bg-slate-900 text-white">Acknowledged</option>
              <option value="fixed" className="bg-slate-900 text-white">Fixed</option>
              <option value="closed" className="bg-slate-900 text-white">Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Severity</label>
            <select
              value={severityFilter}
              onChange={(event) => setSeverityFilter(event.target.value as typeof severityFilter)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="all" className="bg-slate-900 text-white">All severities</option>
              <option value="low" className="bg-slate-900 text-white">Low</option>
              <option value="medium" className="bg-slate-900 text-white">Medium</option>
              <option value="high" className="bg-slate-900 text-white">High</option>
              <option value="critical" className="bg-slate-900 text-white">Critical</option>
            </select>
          </div>
        </div>
      </div>

      {!filtered.length ? (
        <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm text-slate-500">
          No issues match the current filters.
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((issue) => (
            <div
              key={issue.id}
              className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-white">{issue.title}</h2>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${severityTone(
                          issue.severity
                        )}`}
                      >
                        {issue.severity}
                      </span>

                      <span
                        className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusTone(
                          issue.status
                        )}`}
                      >
                        {issue.status}
                      </span>
                    </div>

                    <p className="mt-2 whitespace-pre-wrap text-sm text-slate-300">
                      {issue.description}
                    </p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <InfoCard label="Reporter" value={issue.reporter_name || issue.reporter_email || 'Unknown'} />
                    <InfoCard label="Route" value={issue.route} />
                    <InfoCard label="Show" value={issue.show_id ?? '—'} />
                    <InfoCard label="Submitted" value={formatDateTime(issue.created_at)} />
                  </div>

                  {issue.browser_info ? (
                    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Browser
                      </p>
                      <p className="mt-2 break-words text-sm text-slate-400">
                        {issue.browser_info}
                      </p>
                    </div>
                  ) : null}
                </div>

                <div className="w-full lg:w-[460px]">
                  <UpdateStatusForm issue={issue} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
    </div>
  )
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-medium text-white">{value}</p>
    </div>
  )
}