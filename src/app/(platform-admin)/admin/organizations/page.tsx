import { createClient } from '@/lib/supabase/server'
import { AdminOrganizationsPageShell } from '@/components/platform-admin/admin-organizations-page-shell'

type OrganizationRow = {
  id: string
  name: string
  subscription_status: string | null
  trial_ends_at: string | null
  disabled_at: string | null
  created_at: string
}

type InviteRow = {
  organization_id: string
  email: string
  role: string
  accepted_at: string | null
  revoked_at: string | null
  created_at: string
}

export default async function AdminOrganizationsPage() {
  const supabase = await createClient()

  const [{ data: orgs, error: orgsError }, { data: invites, error: invitesError }] =
    await Promise.all([
      supabase
        .from('organizations')
        .select('id, name, subscription_status, trial_ends_at, disabled_at, created_at')
        .order('created_at', { ascending: false })
        .returns<OrganizationRow[]>(),

      supabase
        .from('organization_invites')
        .select('organization_id, email, role, accepted_at, revoked_at, created_at')
        .order('created_at', { ascending: false })
        .returns<InviteRow[]>(),
    ])

  if (orgsError) throw new Error(orgsError.message)
  if (invitesError) throw new Error(invitesError.message)

  const latestInviteByOrgId = new Map<string, InviteRow>()
  for (const invite of invites ?? []) {
    if (!latestInviteByOrgId.has(invite.organization_id)) {
      latestInviteByOrgId.set(invite.organization_id, invite)
    }
  }

  const organizations = (orgs ?? []).map((org) => ({
    ...org,
    latest_invite: latestInviteByOrgId.get(org.id) ?? null,
  }))

  return <AdminOrganizationsPageShell organizations={organizations} />
}