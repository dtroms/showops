'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { resolveShowAccess } from '@/lib/show-access'
import {
  canEditOperations,
  canViewShow,
  type ShowRole,
} from '@/lib/permissions'

type OrgMembershipRow = {
  id: string
  user_id: string
  role: string | null
  status: string | null
  reports_to_membership_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type ShowMembershipRow = {
  id: string
  show_id: string
  membership_id: string
  show_role: ShowRole
  assigned_by_membership_id: string | null
}

type ShowRow = {
  id: string
  organization_id: string
  lead_membership_id: string | null
  created_by_membership_id: string | null
}

export type ShowAssignmentListItem = {
  id: string
  membership_id: string
  show_role: ShowRole
  full_name: string | null
  email: string | null
  is_auto_inherited?: boolean
  inherited_from_name?: string | null
}

export type AssignableOrganizationUser = {
  membership_id: string
  full_name: string | null
  email: string | null
}

function revalidateShowTeamPaths(showId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/shows')
  revalidatePath(`/shows/${showId}`)
  revalidatePath(`/shows/${showId}/show-details`)
  revalidatePath(`/shows/${showId}/team`)
}

function roleRank(role: ShowRole) {
  if (role === 'lead') return 0
  if (role === 'coordinator') return 1
  if (role === 'co_pm') return 2
  if (role === 'warehouse') return 3
  if (role === 'crew') return 4
  return 5
}

function warehouseLeadershipRole(role: string | null | undefined) {
  const normalized = (role ?? '').toLowerCase()
  return normalized === 'warehouse_manager' || normalized === 'warehouse_director'
}

async function getOrgMembershipMap(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
}) {
  const { supabase, organizationId } = params

  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_memberships')
    .select('id, user_id, role, status, reports_to_membership_id')
    .eq('organization_id', organizationId)
    .returns<OrgMembershipRow[]>()

  if (membershipsError) {
    throw new Error(membershipsError.message)
  }

  const userIds = Array.from(
    new Set((memberships ?? []).map((row) => row.user_id).filter(Boolean))
  )

  let profileMap = new Map<string, ProfileRow>()

  if (userIds.length) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .returns<ProfileRow[]>()

    if (profilesError) {
      throw new Error(profilesError.message)
    }

    profileMap = new Map((profiles ?? []).map((row) => [row.id, row]))
  }

  const membershipMap = new Map(
    (memberships ?? []).map((row) => {
      const profile = profileMap.get(row.user_id)
      return [
        row.id,
        {
          ...row,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? null,
        },
      ]
    })
  )

  return {
    memberships: memberships ?? [],
    membershipMap,
  }
}

export async function listAssignableOrganizationUsers(): Promise<
  AssignableOrganizationUser[]
> {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const { memberships } = await getOrgMembershipMap({
    supabase,
    organizationId: ctx.organizationId,
  })

  const { membershipMap } = await getOrgMembershipMap({
    supabase,
    organizationId: ctx.organizationId,
  })

  return memberships
    .filter((row) => (row.status ?? 'active') === 'active')
    .map((row) => {
      const info = membershipMap.get(row.id)
      return {
        membership_id: row.id,
        full_name: info?.full_name ?? null,
        email: info?.email ?? null,
      }
    })
    .sort((a, b) => {
      const aLabel = a.full_name || a.email || ''
      const bLabel = b.full_name || b.email || ''
      return aLabel.localeCompare(bLabel)
    })
}

export async function listShowAssignments(
  showId: string
): Promise<ShowAssignmentListItem[]> {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId: ctx.organizationId,
    membershipId: ctx.membership.id,
    orgRole: ctx.orgRole,
  })

  if (!canViewShow(access)) {
    throw new Error('You do not have permission to view this show team.')
  }

  const [{ data: explicitAssignments, error: assignmentsError }, { membershipMap, memberships }] =
    await Promise.all([
      supabase
        .from('show_memberships')
        .select('id, show_id, membership_id, show_role, assigned_by_membership_id')
        .eq('show_id', showId)
        .eq('organization_id', ctx.organizationId)
        .returns<ShowMembershipRow[]>(),
      getOrgMembershipMap({
        supabase,
        organizationId: ctx.organizationId,
      }),
    ])

  if (assignmentsError) {
    throw new Error(assignmentsError.message)
  }

  const explicit = (explicitAssignments ?? []).map((row) => {
    const member = membershipMap.get(row.membership_id)
    return {
      id: row.id,
      membership_id: row.membership_id,
      show_role: row.show_role,
      full_name: member?.full_name ?? null,
      email: member?.email ?? null,
      is_auto_inherited: false,
      inherited_from_name: null,
    } satisfies ShowAssignmentListItem
  })

  const explicitMembershipIds = new Set(explicit.map((row) => row.membership_id))
  const autoInherited: ShowAssignmentListItem[] = []

  const warehouseLeads = explicit.filter((row) => {
    const member = membershipMap.get(row.membership_id)
    return warehouseLeadershipRole(member?.role)
  })

  for (const lead of warehouseLeads) {
    const directReports = memberships.filter(
      (row) =>
        row.reports_to_membership_id === lead.membership_id &&
        (row.status ?? 'active') === 'active'
    )

    for (const report of directReports) {
      if (explicitMembershipIds.has(report.id)) continue

      const reportInfo = membershipMap.get(report.id)

      autoInherited.push({
        id: `auto-${report.id}`,
        membership_id: report.id,
        show_role: 'crew',
        full_name: reportInfo?.full_name ?? null,
        email: reportInfo?.email ?? null,
        is_auto_inherited: true,
        inherited_from_name: lead.full_name ?? lead.email ?? null,
      })
    }
  }

  return [...explicit, ...autoInherited].sort((a, b) => {
    const roleDelta = roleRank(a.show_role) - roleRank(b.show_role)
    if (roleDelta !== 0) return roleDelta

    const aLabel = a.full_name || a.email || ''
    const bLabel = b.full_name || b.email || ''
    return aLabel.localeCompare(bLabel)
  })
}

export async function assignUserToShow(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const showId = String(formData.get('showId') || '').trim()
  const membershipId = String(formData.get('membershipId') || '').trim()
  const showRole = String(formData.get('showRole') || 'crew').trim() as ShowRole

  if (!showId || !membershipId) {
    throw new Error('Show and user are required.')
  }

  const [{ show, access }, { data: targetMembership, error: targetMembershipError }] =
    await Promise.all([
      resolveShowAccess({
        supabase,
        showId,
        organizationId: ctx.organizationId,
        membershipId: ctx.membership.id,
        orgRole: ctx.orgRole,
      }),
      supabase
        .from('organization_memberships')
        .select('id')
        .eq('id', membershipId)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle(),
    ])

  if (!canEditOperations(access)) {
    throw new Error('You do not have permission to assign team members to this show.')
  }

  if (targetMembershipError) {
    throw new Error(targetMembershipError.message)
  }

  if (!targetMembership) {
    throw new Error('Selected user is not part of this organization.')
  }

  const { data: existing, error: existingError } = await supabase
    .from('show_memberships')
    .select('id')
    .eq('organization_id', ctx.organizationId)
    .eq('show_id', showId)
    .eq('membership_id', membershipId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from('show_memberships')
      .update({
        show_role: showRole,
        assigned_by_membership_id: ctx.membership.id,
      })
      .eq('id', existing.id)
      .eq('organization_id', ctx.organizationId)

    if (updateError) {
      throw new Error(updateError.message)
    }
  } else {
    const { error: insertError } = await supabase
      .from('show_memberships')
      .insert({
        organization_id: ctx.organizationId,
        show_id: showId,
        membership_id: membershipId,
        show_role: showRole,
        assigned_by_membership_id: ctx.membership.id,
      })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  if (showRole === 'lead') {
    const { error: updateShowError } = await supabase
      .from('shows')
      .update({ lead_membership_id: membershipId })
      .eq('id', show.id)
      .eq('organization_id', ctx.organizationId)

    if (updateShowError) {
      throw new Error(updateShowError.message)
    }
  }

  revalidateShowTeamPaths(showId)
}

export async function removeUserFromShow(assignmentId: string, showId: string) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!assignmentId || !showId) {
    throw new Error('Assignment and show are required.')
  }

  if (assignmentId.startsWith('auto-')) {
    revalidateShowTeamPaths(showId)
    return
  }

  const [{ show, access }, { data: assignment, error: assignmentError }] =
    await Promise.all([
      resolveShowAccess({
        supabase,
        showId,
        organizationId: ctx.organizationId,
        membershipId: ctx.membership.id,
        orgRole: ctx.orgRole,
      }),
      supabase
        .from('show_memberships')
        .select('id, membership_id, show_role')
        .eq('id', assignmentId)
        .eq('organization_id', ctx.organizationId)
        .eq('show_id', showId)
        .maybeSingle(),
    ])

  if (!canEditOperations(access)) {
    throw new Error('You do not have permission to remove team members from this show.')
  }

  if (assignmentError) {
    throw new Error(assignmentError.message)
  }

  if (!assignment) {
    throw new Error('Assignment not found.')
  }

  const { error: deleteError } = await supabase
    .from('show_memberships')
    .delete()
    .eq('id', assignmentId)
    .eq('organization_id', ctx.organizationId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (
    assignment.show_role === 'lead' &&
    show.lead_membership_id === assignment.membership_id
  ) {
    const nextLead =
      show.created_by_membership_id && show.created_by_membership_id !== assignment.membership_id
        ? show.created_by_membership_id
        : null

    const { error: updateShowError } = await supabase
      .from('shows')
      .update({ lead_membership_id: nextLead })
      .eq('id', show.id)
      .eq('organization_id', ctx.organizationId)

    if (updateShowError) {
      throw new Error(updateShowError.message)
    }
  }

  revalidateShowTeamPaths(showId)
}