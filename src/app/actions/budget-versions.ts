'use server'

import { createClient } from '@/lib/supabase/server'
import { resolveShowAccess } from '@/lib/show-access'
import type { ShowAccessContext } from '@/lib/permissions'

/**
 * CENTRALIZED PERMISSION FOR BUDGET VERSION ACTIONS
 */
function canManageBudgetVersions(params: {
  orgRole: string | null
  access: ShowAccessContext
}) {
  const { orgRole, access } = params

  return (
    orgRole === 'owner' ||
    orgRole === 'org_admin' ||
    orgRole === 'ops_manager' ||
    (
      orgRole === 'project_manager' &&
      (
        access.isAssigned === true ||
        access.isManagedTeam === true ||
        access.showRole === 'lead' ||
        access.showRole === 'co_pm'
      )
    )
  )
}

/**
 * CREATE POST SHOW BUDGET FROM PRE SHOW
 */
export async function createPostShowBudgetFromPreShow(params: {
  showId: string
  organizationId: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { showId, organizationId } = params

  // get membership + role
  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single()

  if (!membership) {
    return { error: 'Membership not found' }
  }

  const membershipId = membership.id
  const orgRole = membership.role

  // resolve access
  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId,
    orgRole,
  })

  // ✅ FIXED PERMISSION CHECK
  if (!canManageBudgetVersions({ orgRole, access })) {
    return { error: 'You do not have permission to create a post-show budget.' }
  }

  // get PRE version
  const { data: preVersion } = await supabase
    .from('budget_versions')
    .select('*')
    .eq('show_id', showId)
    .eq('type', 'pre')
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (!preVersion) {
    return { error: 'No pre-show budget found' }
  }

  // create POST version
  const { data: postVersion, error: createError } = await supabase
    .from('budget_versions')
    .insert({
      show_id: showId,
      organization_id: organizationId,
      type: 'post',
      name: 'Post Show Budget',
    })
    .select()
    .single()

  if (createError || !postVersion) {
    return { error: createError?.message || 'Failed to create post budget' }
  }

  // copy line items
  const { data: lineItems } = await supabase
    .from('budget_line_items')
    .select('*')
    .eq('version_id', preVersion.id)

  if (lineItems && lineItems.length > 0) {
    const newItems = lineItems.map((item) => ({
      ...item,
      id: undefined,
      version_id: postVersion.id,
      created_at: undefined,
    }))

    const { error: insertError } = await supabase
      .from('budget_line_items')
      .insert(newItems)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  return { success: true, versionId: postVersion.id }
}

/**
 * DUPLICATE BUDGET VERSION
 */
export async function duplicateBudgetVersion(params: {
  versionId: string
  showId: string
  organizationId: string
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const { versionId, showId, organizationId } = params

  const { data: membership } = await supabase
    .from('organization_memberships')
    .select('id, role')
    .eq('user_id', user.id)
    .eq('organization_id', organizationId)
    .single()

  if (!membership) {
    return { error: 'Membership not found' }
  }

  const membershipId = membership.id
  const orgRole = membership.role

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId,
    orgRole,
  })

  // ✅ SAME FIX HERE
  if (!canManageBudgetVersions({ orgRole, access })) {
    return { error: 'You do not have permission to duplicate budget versions.' }
  }

  const { data: version } = await supabase
    .from('budget_versions')
    .select('*')
    .eq('id', versionId)
    .single()

  if (!version) {
    return { error: 'Version not found' }
  }

  const { data: newVersion, error: createError } = await supabase
    .from('budget_versions')
    .insert({
      show_id: showId,
      organization_id: organizationId,
      type: version.type,
      name: `${version.name} (Copy)`,
    })
    .select()
    .single()

  if (createError || !newVersion) {
    return { error: createError?.message || 'Failed to duplicate version' }
  }

  const { data: items } = await supabase
    .from('budget_line_items')
    .select('*')
    .eq('version_id', versionId)

  if (items && items.length > 0) {
    const newItems = items.map((item) => ({
      ...item,
      id: undefined,
      version_id: newVersion.id,
      created_at: undefined,
    }))

    const { error: insertError } = await supabase
      .from('budget_line_items')
      .insert(newItems)

    if (insertError) {
      return { error: insertError.message }
    }
  }

  return { success: true, versionId: newVersion.id }
}