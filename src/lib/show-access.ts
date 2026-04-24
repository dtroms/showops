import type { SupabaseClient } from '@supabase/supabase-js'
import { normalizeShowStatus, type ShowAccessContext, type ShowRole } from '@/lib/permissions'
import { listManagedMembershipIds } from '@/lib/team-scope'
import type { OrgRole } from '@/lib/auth-context'

type ShowRow = {
  id: string
  organization_id: string
  created_by_membership_id: string | null
  lead_membership_id: string | null
  status: string | null
}

type ShowMembershipRow = {
  show_role: ShowRole
}

export async function resolveShowAccess(params: {
  supabase: SupabaseClient
  showId: string
  organizationId: string
  membershipId: string
  orgRole: OrgRole | null
}): Promise<{ show: ShowRow; access: ShowAccessContext }> {
  const { supabase, showId, organizationId, membershipId, orgRole } = params

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, organization_id, created_by_membership_id, lead_membership_id, status')
    .eq('id', showId)
    .eq('organization_id', organizationId)
    .single<ShowRow>()

  if (showError || !show) {
    throw new Error(showError?.message || 'Show not found.')
  }

  let showRole: ShowRole | null = null
  let isAssigned = false

  const { data: showMembership } = await supabase
    .from('show_memberships')
    .select('show_role')
    .eq('show_id', showId)
    .eq('membership_id', membershipId)
    .maybeSingle<ShowMembershipRow>()

  if (showMembership?.show_role) {
    showRole = showMembership.show_role
    isAssigned = true
  } else if (
    show.lead_membership_id === membershipId ||
    show.created_by_membership_id === membershipId
  ) {
    showRole = 'lead'
    isAssigned = true
  }

  let isManagedTeam = false

  if (orgRole === 'ops_manager' || orgRole === 'project_manager') {
    const managedMembershipIds = await listManagedMembershipIds(
      supabase,
      organizationId,
      membershipId
    )

    const managedIds = managedMembershipIds.filter((id) => id !== membershipId)

    if (
      (show.lead_membership_id && managedIds.includes(show.lead_membership_id)) ||
      (show.created_by_membership_id && managedIds.includes(show.created_by_membership_id))
    ) {
      isManagedTeam = true
    } else if (managedIds.length > 0) {
      const { data: managedShowMembership } = await supabase
        .from('show_memberships')
        .select('show_role')
        .eq('show_id', showId)
        .in('membership_id', managedIds)
        .limit(1)
        .maybeSingle<ShowMembershipRow>()

      if (managedShowMembership?.show_role) {
        isManagedTeam = true
      }
    }
  }

  return {
    show,
    access: {
      orgRole,
      showRole,
      showStatus: normalizeShowStatus(show.status),
      isAssigned,
      isManagedTeam,
    },
  }
}