'use client'

import { useMemo, useState, useTransition } from 'react'
import {
  disableOrganizationUser,
  enableOrganizationUser,
  inviteOrganizationUser,
  revokeInvitation,
  updateOrganizationUserManager,
  updateOrganizationUserRole,
  type OrganizationInvitationRow,
  type OrganizationUserRow,
} from '@/app/actions/users'

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'org_admin', label: 'Org Admin' },
  { value: 'ops_manager', label: 'Ops Manager' },
  { value: 'project_manager', label: 'Project Manager' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'warehouse_admin', label: 'Warehouse Admin' },
  { value: 'crew', label: 'Crew' },
] as const

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="inline-flex rounded-full border border-white/10 bg-white/10 px-2 py-1 text-xs font-medium text-slate-300">
      {role.replaceAll('_', ' ')}
    </span>
  )
}

function StatusBadge({ status }: { status: string }) {
  const styles =
    status === 'active'
      ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
      : status === 'disabled'
        ? 'border-rose-500/20 bg-rose-500/15 text-rose-300'
        : status === 'pending'
          ? 'border-amber-500/20 bg-amber-500/15 text-amber-300'
          : 'border-white/10 bg-white/10 text-slate-300'

  return <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-medium ${styles}`}>{status}</span>
}

function ActionButton({
  idleLabel,
  pendingLabel,
  pending,
  type = 'submit',
  onClick,
  className = 'rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50',
}: {
  idleLabel: string
  pendingLabel: string
  pending: boolean
  type?: 'button' | 'submit'
  onClick?: () => void
  className?: string
}) {
  return (
    <button type={type} onClick={onClick} disabled={pending} className={className}>
      {pending ? pendingLabel : idleLabel}
    </button>
  )
}

function CollapsibleSection({
  title,
  description,
  count,
  defaultOpen = true,
  children,
}: {
  title: string
  description: string
  count: number
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold tracking-tight text-white">{title}</h2>
            <span className="rounded-full border border-white/10 bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-400">
              {count}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-400">{description}</p>
        </div>

        <div className="shrink-0 text-sm font-medium text-slate-500">
          {open ? 'Hide' : 'Show'}
        </div>
      </button>

      {open ? <div className="border-t border-white/10 px-6 py-5">{children}</div> : null}
    </section>
  )
}

function InviteUserForm({
  managerOptions,
  onRefresh,
}: {
  managerOptions: { id: string; label: string }[]
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setSuccess(null)

    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const result = await inviteOrganizationUser({}, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      setSuccess(result.success ?? 'Invitation created.')
      form.reset()
      onRefresh()
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Invite User</h2>
        <p className="mt-1 text-sm text-slate-400">
          Create an organization invitation and assign the user’s role.
        </p>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <label className="block text-sm font-medium text-slate-300">Email</label>
          <input name="email" type="email" required className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white" />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Role</label>
          <select name="role" required defaultValue="project_manager" className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
            {ROLE_OPTIONS.map((role) => (
              <option key={role.value} value={role.value} className="bg-slate-900 text-white">
                {role.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300">Reports To</label>
          <select name="reportsToMembershipId" defaultValue="" className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white">
            <option value="" className="bg-slate-900 text-white">No manager selected</option>
            {managerOptions.map((manager) => (
              <option key={manager.id} value={manager.id} className="bg-slate-900 text-white">
                {manager.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? <p className="mt-4 text-sm text-rose-300">{error}</p> : null}
      {success ? <p className="mt-4 text-sm text-emerald-300">{success}</p> : null}

      <ActionButton idleLabel="Send Invitation" pendingLabel="Sending..." pending={isPending} />
    </form>
  )
}

function UserRoleRowForm({
  user,
  managerOptions,
  onRefresh,
}: {
  user: OrganizationUserRow
  managerOptions: { id: string; label: string }[]
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)

  async function handleDisable() {
    setActionMessage(null)
    setActionError(null)
    startTransition(async () => {
      const result = await disableOrganizationUser(user.membership_id)
      if (result.error) {
        setActionError(result.error)
        return
      }
      setActionMessage(result.success ?? 'User disabled.')
      onRefresh()
    })
  }

  async function handleEnable() {
    setActionMessage(null)
    setActionError(null)
    startTransition(async () => {
      const result = await enableOrganizationUser(user.membership_id)
      if (result.error) {
        setActionError(result.error)
        return
      }
      setActionMessage(result.success ?? 'User enabled.')
      onRefresh()
    })
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionMessage(null)
    setActionError(null)

    const form = event.currentTarget
    const formData = new FormData(form)

    startTransition(async () => {
      const roleResult = await updateOrganizationUserRole({}, formData)
      if (roleResult.error) {
        setActionError(roleResult.error)
        return
      }

      const managerResult = await updateOrganizationUserManager({}, formData)
      if (managerResult.error) {
        setActionError(managerResult.error)
        return
      }

      setActionMessage(managerResult.success || roleResult.success || 'User updated.')
      onRefresh()
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-start justify-between gap-4 px-5 py-5 text-left"
      >
        <div className="space-y-2">
          <div>
            <p className="text-base font-semibold text-white">
              {user.full_name || user.email || 'Unnamed User'}
            </p>
            <p className="text-sm text-slate-500">{user.email ?? 'No email on profile'}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <RoleBadge role={user.role} />
            <StatusBadge status={user.status} />
          </div>
        </div>

        <div className="shrink-0 text-sm font-medium text-slate-500">
          {open ? 'Hide' : 'Edit'}
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/10 px-5 py-5">
          <div className="mb-4 flex flex-wrap gap-2">
            {user.status === 'disabled' ? (
              <ActionButton
                type="button"
                onClick={handleEnable}
                idleLabel="Enable"
                pendingLabel="Working..."
                pending={isPending}
                className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 disabled:opacity-50"
              />
            ) : (
              <ActionButton
                type="button"
                onClick={handleDisable}
                idleLabel="Disable"
                pendingLabel="Working..."
                pending={isPending}
                className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
              />
            )}
          </div>

          <form onSubmit={handleSubmit} className="grid gap-4 md:grid-cols-3">
            <input type="hidden" name="membershipId" value={user.membership_id} />

            <div>
              <label className="block text-sm font-medium text-slate-300">Role</label>
              <select
                name="role"
                defaultValue={user.role}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
              >
                {ROLE_OPTIONS.map((role) => (
                  <option key={role.value} value={role.value} className="bg-slate-900 text-white">
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Reports To</label>
              <select
                name="reportsToMembershipId"
                defaultValue={user.reports_to_membership_id ?? ''}
                className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
              >
                <option value="" className="bg-slate-900 text-white">No manager selected</option>
                {managerOptions
                  .filter((manager) => manager.id !== user.membership_id)
                  .map((manager) => (
                    <option key={manager.id} value={manager.id} className="bg-slate-900 text-white">
                      {manager.label}
                    </option>
                  ))}
              </select>
            </div>

            <div className="flex items-end">
              <ActionButton idleLabel="Update User" pendingLabel="Updating..." pending={isPending} />
            </div>
          </form>

          {actionError ? <p className="mt-3 text-sm text-rose-300">{actionError}</p> : null}
          {actionMessage ? <p className="mt-3 text-sm text-emerald-300">{actionMessage}</p> : null}
        </div>
      ) : null}
    </div>
  )
}

function InvitationRow({
  invitation,
  onRefresh,
}: {
  invitation: OrganizationInvitationRow
  onRefresh: () => void
}) {
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleRevoke() {
    setMessage(null)
    setError(null)
    startTransition(async () => {
      const result = await revokeInvitation(invitation.id)
      if (result.error) {
        setError(result.error)
        return
      }
      setMessage(result.success ?? 'Invitation revoked.')
      onRefresh()
    })
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="font-medium text-white">{invitation.email}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <RoleBadge role={invitation.role} />
            <StatusBadge status={invitation.status} />
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {invitation.status === 'pending' ? (
            <ActionButton
              type="button"
              onClick={handleRevoke}
              idleLabel="Revoke"
              pendingLabel="Working..."
              pending={isPending}
              className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm font-medium text-rose-300 transition hover:bg-rose-500/20 disabled:opacity-50"
            />
          ) : null}
        </div>
      </div>

      {message ? <p className="mt-3 text-sm text-emerald-300">{message}</p> : null}
      {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
    </div>
  )
}

export function OrganizationUsersPageShell({
  initialUsers,
  initialInvitations,
}: {
  initialUsers: OrganizationUserRow[]
  initialInvitations: OrganizationInvitationRow[]
}) {
  const managerOptions = useMemo(() => {
    return initialUsers
      .filter((user) => user.status === 'active')
      .map((user) => ({
        id: user.membership_id,
        label: `${user.full_name || user.email || 'Unnamed User'} (${user.role.replaceAll('_', ' ')})`,
      }))
  }, [initialUsers])

  const activeUsers = useMemo(
    () => initialUsers.filter((user) => user.status === 'active'),
    [initialUsers]
  )

  const disabledUsers = useMemo(
    () => initialUsers.filter((user) => user.status === 'disabled'),
    [initialUsers]
  )

  const visibleInvitations = useMemo(
    () => initialInvitations.filter((invite) => invite.status !== 'accepted'),
    [initialInvitations]
  )

  function handleRefresh() {
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-3xl font-bold tracking-tight text-white">Users & Roles</h1>
        <p className="mt-2 text-sm text-slate-400">
          Invite users, assign roles, and manage organization access.
        </p>
      </div>

      <InviteUserForm managerOptions={managerOptions} onRefresh={handleRefresh} />

      <CollapsibleSection
        title="Active Users"
        description="Click a user to open role and reporting controls."
        count={activeUsers.length}
        defaultOpen={true}
      >
        {!activeUsers.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
            No active users found.
          </div>
        ) : (
          <div className="space-y-4">
            {activeUsers.map((user) => (
              <UserRoleRowForm
                key={user.membership_id}
                user={user}
                managerOptions={managerOptions}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Pending Invitations"
        description="Review or revoke invitations that have not been accepted yet."
        count={visibleInvitations.length}
        defaultOpen={false}
      >
        {!visibleInvitations.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
            No pending invitations found.
          </div>
        ) : (
          <div className="space-y-3">
            {visibleInvitations.map((invitation) => (
              <InvitationRow
                key={invitation.id}
                invitation={invitation}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>

      <CollapsibleSection
        title="Disabled Users"
        description="Re-enable users when they should regain access."
        count={disabledUsers.length}
        defaultOpen={false}
      >
        {!disabledUsers.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-sm text-slate-500">
            No disabled users found.
          </div>
        ) : (
          <div className="space-y-4">
            {disabledUsers.map((user) => (
              <UserRoleRowForm
                key={user.membership_id}
                user={user}
                managerOptions={managerOptions}
                onRefresh={handleRefresh}
              />
            ))}
          </div>
        )}
      </CollapsibleSection>
    </div>
  )
}