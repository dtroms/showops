'use client'

import { useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  createOrganizationAndOwnerInvite,
  deleteOrganizationPermanently,
  disableOrganization,
  enableOrganization,
  type PlatformCreateOrganizationState,
} from '@/app/actions/platform-admin'
import { enterOrganizationSupportMode } from '@/app/actions/platform-support'

type OrganizationListRow = {
  id: string
  name: string
  subscription_status: string | null
  trial_ends_at: string | null
  disabled_at: string | null
  created_at: string
  latest_invite: {
    email: string
    role: string
    accepted_at: string | null
    revoked_at: string | null
    created_at: string
  } | null
}

const initialState: PlatformCreateOrganizationState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-50"
    >
      {pending ? 'Creating...' : 'Create Organization'}
    </button>
  )
}

function formatDateTime(value: string | null) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export function AdminOrganizationsPageShell({
  organizations,
}: {
  organizations: OrganizationListRow[]
}) {
  const [state, formAction] = useFormState(createOrganizationAndOwnerInvite, initialState)
  const [copied, setCopied] = useState(false)
  const [pendingOrgId, setPendingOrgId] = useState<string | null>(null)
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function copyInvite(url: string) {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  function refreshPage() {
    window.location.reload()
  }

  function handleEnter(orgId: string) {
    setPendingOrgId(orgId)
    setActionMessage(null)
    setActionError(null)

    startTransition(async () => {
      try {
        await enterOrganizationSupportMode(orgId)
      } catch (error) {
        setActionError(error instanceof Error ? error.message : 'Failed to enter organization.')
        setPendingOrgId(null)
      }
    })
  }

  function handleDisable(orgId: string) {
    if (!confirm('Disable this organization? Users will lose access until it is re-enabled.')) {
      return
    }

    setPendingOrgId(orgId)
    setActionMessage(null)
    setActionError(null)

    startTransition(async () => {
      const result = await disableOrganization(orgId)

      if (result.error) {
        setActionError(result.error)
        setPendingOrgId(null)
        return
      }

      setActionMessage(result.success ?? 'Organization disabled.')
      window.location.reload()
    })
  }

  function handleEnable(orgId: string) {
    setPendingOrgId(orgId)
    setActionMessage(null)
    setActionError(null)

    startTransition(async () => {
      const result = await enableOrganization(orgId)

      if (result.error) {
        setActionError(result.error)
        setPendingOrgId(null)
        return
      }

      setActionMessage(result.success ?? 'Organization enabled.')
      window.location.reload()
    })
  }

  function handleDelete(orgId: string, orgName: string) {
    const confirmed = confirm(
      `Permanently delete "${orgName}"?\n\nThis is destructive and intended mainly for test or accidental organizations.`
    )

    if (!confirmed) return

    setPendingOrgId(orgId)
    setActionMessage(null)
    setActionError(null)

    startTransition(async () => {
      const result = await deleteOrganizationPermanently(orgId)

      if (result.error) {
        setActionError(result.error)
        setPendingOrgId(null)
        return
      }

      setActionMessage(result.success ?? 'Organization permanently deleted.')
      window.location.reload()
    })
  }

  return (
    <div className="space-y-6">
      <form action={formAction} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Organizations
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Create a customer organization and generate the first owner invite.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-700">Organization Name</label>
            <input
              name="organizationName"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">Owner Email</label>
            <input
              name="ownerEmail"
              type="email"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2"
            />
          </div>
        </div>

        {state.error ? <p className="mt-4 text-sm text-rose-600">{state.error}</p> : null}
        {state.success ? <p className="mt-4 text-sm text-emerald-600">{state.success}</p> : null}

        {state.inviteUrl ? (
          <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-medium text-slate-900">Owner invite link</p>
            <p className="mt-2 break-all text-sm text-slate-600">{state.inviteUrl}</p>

            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => copyInvite(state.inviteUrl!)}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100"
              >
                {copied ? 'Copied' : 'Copy Invite Link'}
              </button>

              <button
                type="button"
                onClick={refreshPage}
                disabled={isPending}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {isPending ? 'Refreshing...' : 'Refresh List'}
              </button>
            </div>
          </div>
        ) : null}

        <div className="mt-5">
          <SubmitButton />
        </div>
      </form>

      {actionError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
          {actionError}
        </div>
      ) : null}

      {actionMessage ? (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
          {actionMessage}
        </div>
      ) : null}

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">
          Existing Organizations
        </h2>

        {!organizations.length ? (
          <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-6 text-sm text-slate-500">
            No organizations created yet.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Organization</th>
                  <th className="px-4 py-3 font-semibold">Subscription</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Latest Invite</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {organizations.map((org) => {
                  const invite = org.latest_invite
                  const inviteStatus = !invite
                    ? 'none'
                    : invite.revoked_at
                      ? 'revoked'
                      : invite.accepted_at
                        ? 'accepted'
                        : 'pending'

                  const orgStatus = org.disabled_at ? 'disabled' : 'active'
                  const isRowPending = isPending && pendingOrgId === org.id

                  return (
                    <tr key={org.id} className="border-t border-slate-200">
                      <td className="px-4 py-4">
                        <div className="font-medium text-slate-900">{org.name}</div>
                        <div className="mt-1 text-xs text-slate-500">{org.id.slice(0, 8)}</div>
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {org.subscription_status ?? '—'}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {formatDateTime(org.created_at)}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        {invite?.email ?? '—'}
                      </td>

                      <td className="px-4 py-4 text-slate-600">
                        <div>{orgStatus}</div>
                        <div className="mt-1 text-xs text-slate-400">Invite: {inviteStatus}</div>
                      </td>

                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            disabled={isRowPending}
                            onClick={() => handleEnter(org.id)}
                            className="rounded-lg border border-sky-300 px-3 py-1.5 text-xs font-medium text-sky-700 hover:bg-sky-50 disabled:opacity-50"
                          >
                            {isRowPending ? 'Working...' : 'Enter Organization'}
                          </button>

                          {org.disabled_at ? (
                            <button
                              type="button"
                              disabled={isRowPending}
                              onClick={() => handleEnable(org.id)}
                              className="rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-50"
                            >
                              {isRowPending ? 'Working...' : 'Enable'}
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled={isRowPending}
                              onClick={() => handleDisable(org.id)}
                              className="rounded-lg border border-amber-300 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 disabled:opacity-50"
                            >
                              {isRowPending ? 'Working...' : 'Disable'}
                            </button>
                          )}

                          <button
                            type="button"
                            disabled={isRowPending}
                            onClick={() => handleDelete(org.id, org.name)}
                            className="rounded-lg border border-rose-300 px-3 py-1.5 text-xs font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                          >
                            {isRowPending ? 'Working...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}