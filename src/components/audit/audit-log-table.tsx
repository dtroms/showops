'use client'

import { useMemo, useState } from 'react'
import type { AuditLogWithDisplay } from '@/app/actions/audit-logs'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function prettyLabel(value: string | null | undefined) {
  if (!value) return '—'
  return value.replaceAll('_', ' ')
}

function actionTone(actionType: string) {
  if (actionType === 'delete' || actionType === 'disable' || actionType === 'reject') {
    return 'border-rose-500/20 bg-rose-500/15 text-rose-300'
  }

  if (
    actionType === 'update' ||
    actionType === 'assign' ||
    actionType === 'unassign' ||
    actionType === 'status_change'
  ) {
    return 'border-amber-500/20 bg-amber-500/15 text-amber-300'
  }

  if (
    actionType === 'create' ||
    actionType === 'approve' ||
    actionType === 'enable' ||
    actionType === 'invite'
  ) {
    return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
  }

  return 'border-white/10 bg-white/10 text-slate-300'
}

function jsonPreview(value: Record<string, unknown> | null) {
  if (!value) return '—'

  const entries = Object.entries(value)
  if (!entries.length) return '—'

  return entries
    .slice(0, 3)
    .map(([key, val]) => `${key}: ${String(val)}`)
    .join(' • ')
}

export function AuditLogTable({
  logs,
}: {
  logs: AuditLogWithDisplay[]
}) {
  const [entityFilter, setEntityFilter] = useState('all')
  const [actionFilter, setActionFilter] = useState('all')
  const [actorFilter, setActorFilter] = useState('all')
  const [showFilter, setShowFilter] = useState('all')
  const [search, setSearch] = useState('')

  const entityOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.entity_type))).sort(),
    [logs]
  )

  const actionOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.action_type))).sort(),
    [logs]
  )

  const actorOptions = useMemo(
    () => Array.from(new Set(logs.map((log) => log.actor_display))).sort(),
    [logs]
  )

  const showOptions = useMemo(
    () =>
      Array.from(
        new Set(
          logs
            .map((log) => log.show_display)
            .filter((value): value is string => Boolean(value))
        )
      ).sort(),
    [logs]
  )

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (entityFilter !== 'all' && log.entity_type !== entityFilter) return false
      if (actionFilter !== 'all' && log.action_type !== actionFilter) return false
      if (actorFilter !== 'all' && log.actor_display !== actorFilter) return false
      if (showFilter !== 'all' && log.show_display !== showFilter) return false

      if (!search.trim()) return true

      const haystack = [
        log.actor_display,
        log.entity_type,
        log.action_type,
        log.change_summary,
        log.reason ?? '',
        log.entity_id,
        log.show_display ?? '',
        jsonPreview(log.before_json),
        jsonPreview(log.after_json),
        jsonPreview(log.metadata_json),
      ]
        .join(' ')
        .toLowerCase()

      return haystack.includes(search.toLowerCase())
    })
  }, [logs, entityFilter, actionFilter, actorFilter, showFilter, search])

  const summary = useMemo(() => {
    return {
      total: filteredLogs.length,
      showChanges: filteredLogs.filter((log) => log.entity_type === 'show').length,
      staffingChanges: filteredLogs.filter(
        (log) => log.entity_type === 'show_membership' || log.entity_type === 'show_vendor'
      ).length,
      budgetChanges: filteredLogs.filter(
        (log) => log.entity_type === 'budget_version' || log.entity_type === 'budget_line_item'
      ).length,
      last24h: filteredLogs.filter((log) => {
        const diff = Date.now() - new Date(log.created_at).getTime()
        return diff <= 24 * 60 * 60 * 1000
      }).length,
    }
  }, [filteredLogs])

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-500">Visible Entries</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {summary.total}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-500">Show Changes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {summary.showChanges}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-500">Staffing Changes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {summary.staffingChanges}
          </p>
        </div>

        <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5">
          <p className="text-sm text-slate-500">Budget Changes</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {summary.budgetChanges}
          </p>
        </div>

        <div className="rounded-[24px] border border-amber-500/20 bg-amber-500/[0.08] p-5">
          <p className="text-sm text-slate-500">Last 24 Hours</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-amber-300">
            {summary.last24h}
          </p>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-4">
        <div className="grid gap-3 xl:grid-cols-[minmax(0,1.2fr)_220px_220px_220px_220px]">
          <div>
            <label className="block text-sm font-medium text-slate-300">Search</label>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search summary, actor, show, or metadata"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white placeholder:text-slate-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Actor</label>
            <select
              value={actorFilter}
              onChange={(event) => setActorFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="all" className="bg-slate-900 text-white">All actors</option>
              {actorOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Show</label>
            <select
              value={showFilter}
              onChange={(event) => setShowFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="all" className="bg-slate-900 text-white">All shows</option>
              {showOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Entity Type</label>
            <select
              value={entityFilter}
              onChange={(event) => setEntityFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="all" className="bg-slate-900 text-white">All entity types</option>
              {entityOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {prettyLabel(option)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Action Type</label>
            <select
              value={actionFilter}
              onChange={(event) => setActionFilter(event.target.value)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="all" className="bg-slate-900 text-white">All action types</option>
              {actionOptions.map((option) => (
                <option key={option} value={option} className="bg-slate-900 text-white">
                  {prettyLabel(option)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1250px] text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Time</th>
                <th className="px-4 py-3 font-semibold">Actor</th>
                <th className="px-4 py-3 font-semibold">Action</th>
                <th className="px-4 py-3 font-semibold">Entity</th>
                <th className="px-4 py-3 font-semibold">Show</th>
                <th className="px-4 py-3 font-semibold">Summary</th>
                <th className="px-4 py-3 font-semibold">Before</th>
                <th className="px-4 py-3 font-semibold">After</th>
              </tr>
            </thead>

            <tbody>
              {!filteredLogs.length ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-slate-500">
                    No audit log entries match the current filters.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="border-t border-white/10 align-top hover:bg-white/[0.02]">
                    <td className="px-4 py-4 text-slate-400">
                      <div>{formatDateTime(log.created_at)}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{log.actor_display}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        {log.actor_platform_role ? prettyLabel(log.actor_platform_role) : 'Org user'}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${actionTone(
                          log.action_type
                        )}`}
                      >
                        {prettyLabel(log.action_type)}
                      </span>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{prettyLabel(log.entity_type)}</div>
                      <div className="mt-1 text-xs text-slate-500">
                        ID: {log.entity_id.slice(0, 8)}
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{log.show_display ?? '—'}</div>
                    </td>

                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{log.change_summary}</div>
                      {log.reason ? (
                        <div className="mt-1 text-xs text-slate-500">Reason: {log.reason}</div>
                      ) : null}
                    </td>

                    <td className="px-4 py-4 text-slate-400">
                      <div className="max-w-[260px] whitespace-normal break-words">
                        {jsonPreview(log.before_json)}
                      </div>
                    </td>

                    <td className="px-4 py-4 text-slate-400">
                      <div className="max-w-[260px] whitespace-normal break-words">
                        {jsonPreview(log.after_json)}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}