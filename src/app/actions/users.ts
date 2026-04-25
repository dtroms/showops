'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext, type OrgRole } from '@/lib/auth-context'
import {
  canAssignLeadershipRoles,
  canAssignOperationalRoles,
  canDisableUsers,
  canManageUsers,
} from '@/lib/permissions'
import {
  logCreateAuditEvent,
  logDeleteAuditEvent,
  logUpdateAuditEvent,
} from '@/lib/audit'

export type UserActionState = {
  error?: string
  success?: string
}

export type OrganizationUserRow = {
  membership_id: string
  user_id: string
  organization_id: string
  role: OrgRole
  status: 'invited' | 'active' | 'disabled'
  reports_to_membership_id: string | null
  created_at: string
  updated_at: string
  full_name: string | null
  email: string | null
}

export type OrganizationInvitationRow = {
  id: string
  organization_id: string
  email: string
  role: OrgRole
  status: 'pending' | 'accepted' | 'revoked' | 'expired'
  reports_to_membership_id: string | null
  invited_by_membership_id: string | null
  token: string
  expires_at: string | null
  accepted_at: string | null
  accepted_user_id: string | null
  created_at: string
  updated_at: string
}

type MembershipRow = {
  id: string
  user_id: string
  organization_id: string
  role: OrgRole
  status: 'invited' | 'active' | 'disabled'
  reports_to_membership_id: string | null
  created_at: string
  updated_at: string
}

type ProfileRow = {
  id: string
  email: string | null
  full_name: string | null
}

type MembershipCursorRow = {
  id: string
  reports_to_membership_id: string | null
}

const VALID_ROLES: OrgRole[] = [
  'owner',
  'org_admin',
  'ops_manager',
  'project_manager',
  'coordinator',
  'warehouse_admin',
  'crew',
]

function isValidRole(value: string): value is OrgRole {
  return VALID_ROLES.includes(value as OrgRole)
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function revalidateUserPaths() {
  revalidatePath('/dashboard')
  revalidatePath('/settings')
  revalidatePath('/settings/users')
  revalidatePath('/admin/users')
}

async function getUsersActionContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  return {
    supabase,
    organizationId: ctx.organizationId,
    membership: ctx.membership,
    orgRole: ctx.orgRole,
    userId: ctx.userId,
  }
}

function assertCanAssignRole(actorRole: OrgRole, targetRole: OrgRole) {
  if (targetRole === 'owner' || targetRole === 'org_admin') {
    if (!canAssignLeadershipRoles(actorRole)) {
      throw new Error('You do not have permission to assign that role.')
    }
    return
  }

  if (
    targetRole === 'ops_manager' ||
    targetRole === 'project_manager' ||
    targetRole === 'coordinator' ||
    targetRole === 'warehouse_admin' ||
    targetRole === 'crew'
  ) {
    if (!canAssignOperationalRoles(actorRole)) {
      throw new Error('You do not have permission to assign that role.')
    }
  }
}

async function getMembershipCursor(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  cursor: string
}): Promise<{ data: MembershipCursorRow | null; error: string | null }> {
  const { supabase, organizationId, cursor } = params

  const result = await supabase
    .from('organization_memberships')
    .select('id, reports_to_membership_id')
    .eq('id', cursor)
    .eq('organization_id', organizationId)
    .maybeSingle<MembershipCursorRow>()

  if (result.error) {
    return { data: null, error: result.error.message }
  }

  return { data: result.data ?? null, error: null }
}

async function countOwnersForOrg(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
}) {
  const { supabase, organizationId } = params

  const { data, error } = await supabase
    .from('organization_memberships')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('role', 'owner')
    .eq('status', 'active')

  if (error) {
    throw new Error(error.message)
  }

  return (data ?? []).length
}

async function clearDirectReports(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  managerMembershipId: string
}) {
  const { supabase, organizationId, managerMembershipId } = params

  const { error } = await supabase
    .from('organization_memberships')
    .update({ reports_to_membership_id: null })
    .eq('organization_id', organizationId)
    .eq('reports_to_membership_id', managerMembershipId)

  if (error) {
    throw new Error(error.message)
  }
}

async function clearDirectReportsIfNeeded(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  membershipId: string
  nextRole: OrgRole
}) {
  const { supabase, organizationId, membershipId, nextRole } = params

  if (nextRole === 'owner' || nextRole === 'org_admin' || nextRole === 'ops_manager') {
    return
  }

  await clearDirectReports({
    supabase,
    organizationId,
    managerMembershipId: membershipId,
  })
}

export async function listOrganizationUsers(): Promise<OrganizationUserRow[]> {
  const { supabase, organizationId, orgRole } = await getUsersActionContext()

  if (!canManageUsers(orgRole)) {
    throw new Error('You do not have permission to view organization users.')
  }

  const { data: memberships, error: membershipsError } = await supabase
    .from('organization_memberships')
    .select(`
      id,
      user_id,
      organization_id,
      role,
      status,
      reports_to_membership_id,
      created_at,
      updated_at
    `)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: true })
    .returns<MembershipRow[]>()

  if (membershipsError) {
    throw new Error(membershipsError.message)
  }

  const userIds = Array.from(
    new Set((memberships ?? []).map((row) => row.user_id).filter(Boolean))
  )

  let profileMap = new Map<string, { email: string | null; full_name: string | null }>()

  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .in('id', userIds)
      .returns<ProfileRow[]>()

    if (profileError) {
      throw new Error(profileError.message)
    }

    profileMap = new Map(
      (profiles ?? []).map((row) => [
        row.id,
        {
          email: row.email ?? null,
          full_name: row.full_name ?? null,
        },
      ])
    )
  }

  return (memberships ?? []).map((row) => {
    const profile = profileMap.get(row.user_id)

    return {
      membership_id: row.id,
      user_id: row.user_id,
      organization_id: row.organization_id,
      role: row.role,
      status: row.status,
      reports_to_membership_id: row.reports_to_membership_id,
      created_at: row.created_at,
      updated_at: row.updated_at,
      full_name: profile?.full_name ?? null,
      email: profile?.email ?? null,
    }
  })
}

export async function listPendingInvitations(): Promise<OrganizationInvitationRow[]> {
  const { supabase, organizationId, orgRole } = await getUsersActionContext()

  if (!canManageUsers(orgRole)) {
    throw new Error('You do not have permission to view invitations.')
  }

  const { data, error } = await supabase
    .from('organization_invitations')
    .select('*')
    .eq('organization_id', organizationId)
    .in('status', ['pending', 'accepted', 'revoked', 'expired'])
    .order('created_at', { ascending: false })
    .returns<OrganizationInvitationRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}

export async function inviteOrganizationUser(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { supabase, organizationId, membership, orgRole, userId } =
      await getUsersActionContext()

    if (!canManageUsers(orgRole)) {
      return { error: 'You do not have permission to invite users.' }
    }

    const email = normalizeEmail(String(formData.get('email') || ''))
    const roleRaw = String(formData.get('role') || '').trim()
    const reportsToMembershipIdRaw =
      String(formData.get('reportsToMembershipId') || '').trim() || null

    if (!email) {
      return { error: 'Email is required.' }
    }

    if (!isValidRole(roleRaw)) {
      return { error: 'Invalid role.' }
    }

    assertCanAssignRole(orgRole, roleRaw)

    if (reportsToMembershipIdRaw) {
      const { data: reportsToRow, error: reportsToError } = await supabase
        .from('organization_memberships')
        .select('id, organization_id')
        .eq('id', reportsToMembershipIdRaw)
        .eq('organization_id', organizationId)
        .maybeSingle<{ id: string; organization_id: string }>()

      if (reportsToError) {
        return { error: reportsToError.message }
      }

      if (!reportsToRow) {
        return { error: 'Selected manager was not found.' }
      }
    }

    const { data: existingInvite } = await supabase
      .from('organization_invitations')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('email', email)
      .eq('status', 'pending')
      .maybeSingle<{ id: string }>()

    if (existingInvite?.id) {
      return { error: 'That user already has a pending invitation.' }
    }

    const token = crypto.randomUUID()
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString()

    const { data: invitation, error: invitationError } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email,
        role: roleRaw,
        status: 'pending',
        reports_to_membership_id: reportsToMembershipIdRaw,
        invited_by_membership_id: membership.id,
        token,
        expires_at: expiresAt,
      })
      .select('*')
      .single<OrganizationInvitationRow>()

    if (invitationError || !invitation) {
      return { error: invitationError?.message || 'Failed to create invitation.' }
    }

    await logCreateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'organization_invitation',
      entityId: invitation.id,
      changeSummary: `Invited ${email} as ${roleRaw}`,
      afterJson: {
        email,
        role: roleRaw,
        reports_to_membership_id: reportsToMembershipIdRaw,
        expires_at: expiresAt,
      },
      metadataJson: {
        source: 'users.inviteOrganizationUser',
      },
    })

    revalidateUserPaths()
    return { success: 'Invitation created.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to invite user.',
    }
  }
}

export async function updateOrganizationUserRole(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { supabase, organizationId, membership, orgRole, userId } =
      await getUsersActionContext()

    if (!canManageUsers(orgRole)) {
      return { error: 'You do not have permission to update users.' }
    }

    const membershipId = String(formData.get('membershipId') || '').trim()
    const nextRoleRaw = String(formData.get('role') || '').trim()

    if (!membershipId) {
      return { error: 'Membership is required.' }
    }

    if (!isValidRole(nextRoleRaw)) {
      return { error: 'Invalid role.' }
    }

    assertCanAssignRole(orgRole, nextRoleRaw)

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from('organization_memberships')
      .select('id, role, organization_id, reports_to_membership_id')
      .eq('id', membershipId)
      .eq('organization_id', organizationId)
      .single<{
        id: string
        role: OrgRole
        organization_id: string
        reports_to_membership_id: string | null
      }>()

    if (membershipLookupError || !existingMembership) {
      return { error: membershipLookupError?.message || 'User not found.' }
    }

    if (existingMembership.role === nextRoleRaw) {
      return { success: 'No role change needed.' }
    }

    if (existingMembership.role === 'owner' && nextRoleRaw !== 'owner') {
      const ownerCount = await countOwnersForOrg({ supabase, organizationId })
      if (ownerCount <= 1) {
        return { error: 'You cannot demote the last active owner.' }
      }
    }

    const { error: updateError } = await supabase
      .from('organization_memberships')
      .update({ role: nextRoleRaw })
      .eq('id', membershipId)
      .eq('organization_id', organizationId)

    if (updateError) {
      return { error: updateError.message }
    }

    await clearDirectReportsIfNeeded({
      supabase,
      organizationId,
      membershipId,
      nextRole: nextRoleRaw,
    })

    await logUpdateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'organization_membership',
      entityId: membershipId,
      changeSummary: `Changed user role from ${existingMembership.role} to ${nextRoleRaw}`,
      before: {
        role: existingMembership.role,
        reports_to_membership_id: existingMembership.reports_to_membership_id,
      },
      after: {
        role: nextRoleRaw,
        reports_to_membership_id:
          nextRoleRaw === 'owner' ||
          nextRoleRaw === 'org_admin' ||
          nextRoleRaw === 'ops_manager'
            ? existingMembership.reports_to_membership_id
            : null,
      },
      metadataJson: {
        source: 'users.updateOrganizationUserRole',
      },
    })

    revalidateUserPaths()
    return { success: 'User role updated.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update user role.',
    }
  }
}

export async function updateOrganizationUserManager(
  _prevState: UserActionState,
  formData: FormData
): Promise<UserActionState> {
  try {
    const { supabase, organizationId, membership, orgRole, userId } =
      await getUsersActionContext()

    if (!canManageUsers(orgRole)) {
      return { error: 'You do not have permission to update users.' }
    }

    const membershipId = String(formData.get('membershipId') || '').trim()
    const reportsToMembershipIdRaw =
      String(formData.get('reportsToMembershipId') || '').trim() || null

    if (!membershipId) {
      return { error: 'Membership is required.' }
    }

    if (membershipId === reportsToMembershipIdRaw) {
      return { error: 'A user cannot report to themselves.' }
    }

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from('organization_memberships')
      .select('id, role, reports_to_membership_id, organization_id')
      .eq('id', membershipId)
      .eq('organization_id', organizationId)
      .single<{
        id: string
        role: OrgRole
        reports_to_membership_id: string | null
        organization_id: string
      }>()

    if (membershipLookupError || !existingMembership) {
      return { error: membershipLookupError?.message || 'User not found.' }
    }

    if (reportsToMembershipIdRaw) {
      const { data: managerRow, error: managerError } = await supabase
        .from('organization_memberships')
        .select('id, role')
        .eq('id', reportsToMembershipIdRaw)
        .eq('organization_id', organizationId)
        .maybeSingle<{ id: string; role: OrgRole }>()

      if (managerError) {
        return { error: managerError.message }
      }

      if (!managerRow) {
        return { error: 'Selected manager was not found.' }
      }

      if (
        managerRow.role !== 'owner' &&
        managerRow.role !== 'org_admin' &&
        managerRow.role !== 'ops_manager'
      ) {
        return { error: 'Selected manager cannot have direct reports.' }
      }

      let cursor: string | null = reportsToMembershipIdRaw
      const visited = new Set<string>([membershipId])

      while (cursor) {
        if (visited.has(cursor)) {
          return { error: 'This reporting change would create a circular team structure.' }
        }

        visited.add(cursor)

        const cursorResult = await getMembershipCursor({
          supabase,
          organizationId,
          cursor,
        })

        if (cursorResult.error) {
          return { error: cursorResult.error }
        }

        cursor = cursorResult.data?.reports_to_membership_id ?? null
      }
    }

    const { error: updateError } = await supabase
      .from('organization_memberships')
      .update({ reports_to_membership_id: reportsToMembershipIdRaw })
      .eq('id', membershipId)
      .eq('organization_id', organizationId)

    if (updateError) {
      return { error: updateError.message }
    }

    await logUpdateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'organization_membership',
      entityId: membershipId,
      changeSummary: `Updated reporting structure`,
      before: {
        reports_to_membership_id: existingMembership.reports_to_membership_id,
      },
      after: {
        reports_to_membership_id: reportsToMembershipIdRaw,
      },
      metadataJson: {
        source: 'users.updateOrganizationUserManager',
      },
    })

    revalidateUserPaths()
    return { success: 'Reporting structure updated.' }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to update reporting structure.',
    }
  }
}

export async function disableOrganizationUser(
  membershipId: string
): Promise<UserActionState> {
  try {
    const { supabase, organizationId, membership, orgRole, userId } =
      await getUsersActionContext()

    if (!canDisableUsers(orgRole)) {
      return { error: 'You do not have permission to disable users.' }
    }

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from('organization_memberships')
      .select('id, role, status, reports_to_membership_id')
      .eq('id', membershipId)
      .eq('organization_id', organizationId)
      .single<{
        id: string
        role: OrgRole
        status: string
        reports_to_membership_id: string | null
      }>()

    if (membershipLookupError || !existingMembership) {
      return { error: membershipLookupError?.message || 'User not found.' }
    }

    if (existingMembership.status === 'disabled') {
      return { success: 'User is already disabled.' }
    }

    if (existingMembership.role === 'owner') {
      const ownerCount = await countOwnersForOrg({ supabase, organizationId })
      if (ownerCount <= 1) {
        return { error: 'You cannot disable the last active owner.' }
      }
    }

    const { error: disableError } = await supabase
      .from('organization_memberships')
      .update({
        status: 'disabled',
        reports_to_membership_id: null,
      })
      .eq('id', membershipId)
      .eq('organization_id', organizationId)

    if (disableError) {
      return { error: disableError.message }
    }

    await clearDirectReports({
      supabase,
      organizationId,
      managerMembershipId: membershipId,
    })

    await logUpdateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'organization_membership',
      entityId: membershipId,
      changeSummary: `Disabled organization user`,
      before: {
        status: existingMembership.status,
        reports_to_membership_id: existingMembership.reports_to_membership_id,
      },
      after: {
        status: 'disabled',
        reports_to_membership_id: null,
      },
      metadataJson: {
        source: 'users.disableOrganizationUser',
        direct_reports_cleared: true,
      },
    })

    revalidateUserPaths()
    return { success: 'User disabled.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to disable user.',
    }
  }
}

export async function enableOrganizationUser(
  membershipId: string
): Promise<UserActionState> {
  try {
    const { supabase, organizationId, membership, orgRole, userId } =
      await getUsersActionContext()

    if (!canDisableUsers(orgRole)) {
      return { error: 'You do not have permission to enable users.' }
    }

    const { data: existingMembership, error: membershipLookupError } = await supabase
      .from('organization_memberships')
      .select('id, status')
      .eq('id', membershipId)
      .eq('organization_id', organizationId)
      .single<{ id: string; status: string }>()

    if (membershipLookupError || !existingMembership) {
      return { error: membershipLookupError?.message || 'User not found.' }
    }

    if (existingMembership.status === 'active') {
      return { success: 'User is already active.' }
    }

    const { error: enableError } = await supabase
      .from('organization_memberships')
      .update({ status: 'active' })
      .eq('id', membershipId)
      .eq('organization_id', organizationId)

    if (enableError) {
      return { error: enableError.message }
    }

    await logUpdateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'organization_membership',
      entityId: membershipId,
      changeSummary: `Enabled organization user`,
      before: { status: existingMembership.status },
      after: { status: 'active' },
      metadataJson: {
        source: 'users.enableOrganizationUser',
      },
    })

    revalidateUserPaths()
    return { success: 'User enabled.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to enable user.',
    }
  }
}

export async function revokeInvitation(invitationId: string): Promise<UserActionState> {
  try {
    const { supabase, organizationId, membership, orgRole, userId } =
      await getUsersActionContext()

    if (!canManageUsers(orgRole)) {
      return { error: 'You do not have permission to revoke invitations.' }
    }

    const { data: invitation, error: invitationLookupError } = await supabase
      .from('organization_invitations')
      .select('id, status, email')
      .eq('id', invitationId)
      .eq('organization_id', organizationId)
      .single<{ id: string; status: string; email: string }>()

    if (invitationLookupError || !invitation) {
      return { error: invitationLookupError?.message || 'Invitation not found.' }
    }

    if (invitation.status === 'revoked') {
      return { success: 'Invitation already revoked.' }
    }

    const { error: revokeError } = await supabase
      .from('organization_invitations')
      .update({ status: 'revoked' })
      .eq('id', invitationId)
      .eq('organization_id', organizationId)

    if (revokeError) {
      return { error: revokeError.message }
    }

    await logDeleteAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'organization_invitation',
      entityId: invitationId,
      changeSummary: `Revoked invitation for ${invitation.email}`,
      beforeJson: {
        email: invitation.email,
        status: invitation.status,
      },
      metadataJson: {
        source: 'users.revokeInvitation',
      },
    })

    revalidateUserPaths()
    return { success: 'Invitation revoked.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to revoke invitation.',
    }
  }
}