import { listOrganizationUsers, listPendingInvitations } from '@/app/actions/users'
import { OrganizationUsersPageShell } from '@/components/settings/organization-users-page-shell'

export default async function OrganizationUsersPage() {
  const [users, invitations] = await Promise.all([
    listOrganizationUsers(),
    listPendingInvitations(),
  ])

  return (
    <OrganizationUsersPageShell
      initialUsers={users}
      initialInvitations={invitations}
    />
  )
}