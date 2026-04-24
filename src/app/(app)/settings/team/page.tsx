import { requireMembershipContext } from '@/lib/auth-context'
import { canManageUsers } from '@/lib/permissions'
import { listOrganizationInvites } from '@/app/actions/invitations'
import { listOrganizationMembersForHierarchy } from '@/app/actions/team-structure'
import { TeamInvitePanel } from '@/components/settings/team-invite-panel'
import { TeamStructurePanel } from '@/components/settings/team-structure-panel'

export default async function TeamSettingsPage() {
  const ctx = await requireMembershipContext()

  if (!canManageUsers(ctx.orgRole)) {
    throw new Error('Only org leadership can manage team structure.')
  }

  const [invites, members] = await Promise.all([
    listOrganizationInvites(),
    listOrganizationMembersForHierarchy(),
  ])

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Team Management
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Invite users, define who reports to whom, and keep ops managers scoped to their team instead of the entire organization.
        </p>
      </div>

      <TeamInvitePanel invites={invites} />
      <TeamStructurePanel members={members} />
    </div>
  )
}