'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canManageUsers } from '@/lib/permissions'
import { getUserDisplayMap } from '@/lib/user-display'

export type TeamStructureState = {
  error?: string
  success?: string
}

type MembershipRow = {
  id: string
  user_id: string
  organization_id: string
  role: string
  status: string
  reports_to_membership_id: string | null
  created_at?: string
}

export async function listOrganizationMembersForHierarchy() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!canManageUsers(ctx.orgRole)) {
    throw new Error('Only org leadership can manage team structure.')
  }

  const { data, error } = await supabase
    .from('organization_memberships')
    .select('id, user_id, organization_id, role, status, reports_to_membership_id, created_at')
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: true })
    .returns<MembershipRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  const memberships = data ?? []
  const displayMap = await getUserDisplayMap(
    supabase,
    memberships.map((row) => row.user_id)
  )
  const byId = new Map(memberships.map((row) => [row.id, row]))

  return memberships.map((row) => ({
    membership_id: row.id,
    user_id: row.user_id,
    role: row.role,
    status: row.status,
    full_name: displayMap.get(row.user_id)?.full_name ?? null,
    email: displayMap.get(row.user_id)?.email ?? null,
    reports_to_membership_id: row.reports_to_membership_id,
    manager_label: row.reports_to_membership_id
      ? ((): string | null => {
          const manager = byId.get(row.reports_to_membership_id)
          if (!manager) return null
          const managerDisplay = displayMap.get(manager.user_id)
          return managerDisplay?.label ?? null
        })()
      : null,
  }))
}

export async function updateMemberManager(
  _prevState: TeamStructureState,
  formData: FormData
): Promise<TeamStructureState> {
  try {
    const supabase = await createClient()
    const ctx = await requireMembershipContext()

    if (!canManageUsers(ctx.orgRole)) {
      return { error: 'Only org leadership can manage team structure.' }
    }

    const membershipId = String(formData.get('membershipId') || '').trim()
    const reportsToMembershipIdRaw = String(formData.get('reportsToMembershipId') || '').trim()
    const reportsToMembershipId = reportsToMembershipIdRaw || null

    if (!membershipId) {
      return { error: 'Membership is required.' }
    }

    const { data: targetRows, error: targetError } = await supabase
      .from('organization_memberships')
      .select('id, role, organization_id, status')
      .eq('id', membershipId)
      .eq('organization_id', ctx.organizationId)
      .limit(1)

    if (targetError) return { error: targetError.message }

    const target = targetRows?.[0] ?? null
    if (!target) return { error: 'Team member not found.' }

    if (target.role === 'owner' || target.role === 'org_admin') {
      return { error: 'Owners and org admins cannot be assigned under a manager.' }
    }

    if (reportsToMembershipId === membershipId) {
      return { error: 'A user cannot report to themselves.' }
    }

    if (reportsToMembershipId) {
      const { data: managerRows, error: managerError } = await supabase
        .from('organization_memberships')
        .select('id, role, organization_id, status')
        .eq('id', reportsToMembershipId)
        .eq('organization_id', ctx.organizationId)
        .limit(1)

      if (managerError) return { error: managerError.message }

      const manager = managerRows?.[0] ?? null
      if (!manager) return { error: 'Manager not found.' }
      if (manager.status !== 'active') return { error: 'Manager must be active.' }

      if (
        manager.role !== 'owner' &&
        manager.role !== 'org_admin' &&
        manager.role !== 'ops_manager'
      ) {
        return { error: 'Only owners, org admins, or ops managers can be assigned as managers.' }
      }
    }

    const { error: updateError } = await supabase
      .from('organization_memberships')
      .update({ reports_to_membership_id: reportsToMembershipId })
      .eq('id', membershipId)
      .eq('organization_id', ctx.organizationId)

    if (updateError) {
      return { error: updateError.message }
    }

    revalidatePath('/settings/team')
    revalidatePath('/dashboard')
    revalidatePath('/shows')

    return { success: 'Manager assignment updated.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update manager assignment.',
    }
  }
}