'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { resolveShowAccess } from '@/lib/show-access'
import { logUpdateAuditEvent } from '@/lib/audit'

type ShowRow = {
  id: string
  organization_id: string
  show_name: string | null
  status: string | null
  lead_membership_id: string | null
  created_by_membership_id: string | null
}

type OrgMembershipRow = {
  id: string
  role: string | null
  reports_to_membership_id: string | null
}

function revalidateFinancialClosePaths(showId: string) {
  revalidatePath(`/shows/${showId}`)
  revalidatePath(`/shows/${showId}/show-details`)
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-comparison`)
  revalidatePath('/shows')
  revalidatePath('/dashboard')
  revalidatePath('/reports')
  revalidatePath('/audit')
}

function canSubmitFinancialClose(params: {
  orgRole: string | null
  access: {
    isAssigned: boolean
    isManagedTeam?: boolean
    showRole: string | null
  }
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

async function submitShowForFinancialCloseById(showId: string) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole, userId } = ctx

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, organization_id, show_name, status, lead_membership_id, created_by_membership_id')
    .eq('id', showId)
    .eq('organization_id', organizationId)
    .maybeSingle<ShowRow>()

  if (showError || !show) {
    return { error: showError?.message || 'Show not found.' }
  }

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId: membership.id,
    orgRole,
  })

  if (!canSubmitFinancialClose({ orgRole, access })) {
    return { error: 'You do not have permission to submit this show for financial close.' }
  }

  const { data: currentPostVersion, error: currentPostVersionError } = await supabase
    .from('budget_versions')
    .select('id')
    .eq('show_id', showId)
    .eq('version_type', 'post')
    .eq('is_current', true)
    .is('archived_at', null)
    .maybeSingle<{ id: string }>()

  if (currentPostVersionError) {
    return { error: currentPostVersionError.message }
  }

  if (!currentPostVersion?.id) {
    return { error: 'Create a current post-show budget before submitting for financial close.' }
  }

  if (show.status === 'financial_closed') {
    return { success: 'This show is already financially closed.' }
  }

  const { data: actorMembership, error: actorMembershipError } = await supabase
    .from('organization_memberships')
    .select('id, role, reports_to_membership_id')
    .eq('id', membership.id)
    .eq('organization_id', organizationId)
    .maybeSingle<OrgMembershipRow>()

  if (actorMembershipError) {
    return { error: actorMembershipError.message }
  }

  const { data: leadershipMemberships, error: leadershipMembershipsError } = await supabase
    .from('organization_memberships')
    .select('id, role, reports_to_membership_id')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('role', ['owner', 'org_admin', 'ops_manager'])
    .returns<OrgMembershipRow[]>()

  if (leadershipMembershipsError) {
    return { error: leadershipMembershipsError.message }
  }

  const recipientMembershipIds = Array.from(
    new Set(
      [
        ...(leadershipMemberships ?? []).map((row) => row.id),
        actorMembership?.reports_to_membership_id ?? null,
      ].filter((value): value is string => Boolean(value) && value !== membership.id)
    )
  )

  const { error: showUpdateError } = await supabase
    .from('shows')
    .update({ status: 'financial_closed' })
    .eq('id', showId)
    .eq('organization_id', organizationId)

  if (showUpdateError) {
    return { error: showUpdateError.message }
  }

  if (recipientMembershipIds.length > 0) {
    const { error: notificationInsertError } = await supabase
      .from('organization_notifications')
      .insert(
        recipientMembershipIds.map((recipientMembershipId) => ({
          organization_id: organizationId,
          recipient_membership_id: recipientMembershipId,
          actor_membership_id: membership.id,
          show_id: showId,
          notification_type: 'financial_close_submitted',
          title: 'Show submitted for financial close',
          body: `${show.show_name ?? 'Untitled Show'} was submitted for financial close.`,
        }))
      )

    if (notificationInsertError) {
      return { error: notificationInsertError.message }
    }
  }

  await logUpdateAuditEvent({
    organizationId,
    actorUserId: userId,
    actorMembershipId: membership.id,
    entityType: 'show',
    entityId: showId,
    showId,
    changeSummary: 'Submitted show for financial close',
    before: {
      status: show.status,
    },
    after: {
      status: 'financial_closed',
    },
    metadataJson: {
      source: 'financial-close.submitShowForFinancialCloseAction',
      current_post_budget_version_id: currentPostVersion.id,
      notified_membership_ids: recipientMembershipIds,
    },
  })

  revalidateFinancialClosePaths(showId)

  return {
    success: 'Show submitted for financial close. Leadership has been notified.',
  }
}

export async function submitShowForFinancialCloseAction(formData: FormData) {
  const showId = String(formData.get('showId') || '').trim()

  if (!showId) {
    redirect('/shows')
  }

  const result = await submitShowForFinancialCloseById(showId)

  if (result.error) {
    redirect(
      `/shows/${showId}/budget-sheet?type=post&notice=${encodeURIComponent(result.error)}`
    )
  }

  redirect(
    `/shows/${showId}/budget-sheet?type=post&notice=${encodeURIComponent(
      result.success || 'Show submitted for financial close.'
    )}`
  )
}