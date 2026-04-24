'use client'

import { useState, useTransition } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import {
  createOrganizationInvite,
  revokeOrganizationInvite,
  type InviteState,
} from '@/app/actions/invitations'

type InviteRow = {
  id: string
  email: string
  role: string
  accepted_at: string | null
  revoked_at: string | null
  expires_at: string
  created_at: string
}

const initialState: InviteState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Creating invite...' : 'Create Invite'}
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

export function TeamInvitePanel({ invites }: { invites: InviteRow[] }) {
  const [state, formAction] = useFormState(createOrganizationInvite, initialState)
  const [copied, setCopied] = useState<string | null>(null)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  async function copyLink(url: string, inviteId: string) {
    await navigator.clipboard.writeText(url)
    setCopied(inviteId)
    window.setTimeout(() => setCopied(null), 2000)
  }

  function handleRevoke(inviteId: string) {
    if (!confirm('Revoke this invite?')) return
    setPendingId(inviteId)
    startTransition(async () => {
      await revokeOrganizationInvite(inviteId)
      window.location.reload()
    })
  }

  return (
    <div className="space-y-6">
      <form
        action={formAction}
        className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
      >
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-white">Invite User</h2>
          <p className="mt-1 text-sm text-slate-400">
            Create an invite link for a new user.
          </p>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-slate-300">Email</label>
            <input
              name="email"
              type="email"
              required
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Role</label>
            <select
              name="role"
              defaultValue="project_manager"
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
            >
              <option value="owner" className="bg-slate-900 text-white">Owner</option>
              <option value="org_admin" className="bg-slate-900 text-white">Org Admin</option>
              <option value="ops_manager" className="bg-slate-900 text-white">Ops Manager</option>
              <option value="project_manager" className="bg-slate-900 text-white">Project Manager</option>
              <option value="warehouse_admin" className="bg-slate-900 text-white">Warehouse Admin</option>
              <option value="coordinator" className="bg-slate-900 text-white">Coordinator</option>
              <option value="crew" className="bg-slate-900 text-white">Crew</option>
            </select>
          </div>
        </div>

        {state.error ? <p className="mt-4 text-sm text-rose-300">{state.error}</p> : null}
        {state.success ? <p className="mt-4 text-sm text-emerald-300">{state.success}</p> : null}

        {state.inviteUrl ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-sm font-medium text-white">Invite link</p>
            <p className="mt-2 break-all text-sm text-slate-400">{state.inviteUrl}</p>
            <button
              type="button"
              onClick={() => copyLink(state.inviteUrl!, 'new')}
              className="mt-3 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-slate-300 hover:bg-white/10 hover:text-white"
            >
              {copied === 'new' ? 'Copied' : 'Copy invite link'}
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          <SubmitButton />
        </div>
      </form>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <h2 className="text-lg font-semibold tracking-tight text-white">Invites</h2>
        <p className="mt-1 text-sm text-slate-400">Pending, accepted, and revoked invite history.</p>

        {!invites.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
            No invites yet.
          </div>
        ) : (
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Email</th>
                  <th className="px-4 py-3 font-semibold">Role</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Expires</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((invite) => {
                  const status = invite.revoked_at
                    ? 'Revoked'
                    : invite.accepted_at
                      ? 'Accepted'
                      : 'Pending'

                  return (
                    <tr key={invite.id} className="border-t border-white/10">
                      <td className="px-4 py-4 text-white">{invite.email}</td>
                      <td className="px-4 py-4 text-slate-300">{invite.role.replaceAll('_', ' ')}</td>
                      <td className="px-4 py-4 text-slate-400">{formatDateTime(invite.created_at)}</td>
                      <td className="px-4 py-4 text-slate-400">{formatDateTime(invite.expires_at)}</td>
                      <td className="px-4 py-4 text-slate-300">{status}</td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-2">
                          {!invite.accepted_at && !invite.revoked_at && state.inviteUrl ? null : null}
                          {!invite.accepted_at && !invite.revoked_at ? (
                            <button
                              type="button"
                              onClick={() => handleRevoke(invite.id)}
                              disabled={isPending && pendingId === invite.id}
                              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-sm text-rose-300 disabled:opacity-50"
                            >
                              {isPending && pendingId === invite.id ? 'Revoking...' : 'Revoke'}
                            </button>
                          ) : null}
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