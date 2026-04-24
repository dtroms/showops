import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { resolveShowAccess } from '@/lib/show-access'
import {
  canEditOperations,
  canViewShow,
} from '@/lib/permissions'
import {
  listAssignableOrganizationUsers,
  listShowAssignments,
} from '@/app/actions/show-memberships'
import { ShowTeamPageShell } from '@/components/show-detail/show-team-page-shell'

type ShowRow = {
  id: string
  show_name: string | null
  show_number: string | null
  status: string | null
}

export default async function ShowTeamPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const [{ data: show, error: showError }, { access }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, show_name, show_number, status')
      .eq('id', showId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle<ShowRow>(),
    resolveShowAccess({
      supabase,
      showId,
      organizationId: ctx.organizationId,
      membershipId: ctx.membership.id,
      orgRole: ctx.orgRole,
    }),
  ])

  if (showError) {
    throw new Error(showError.message)
  }

  if (!show) {
    notFound()
  }

  if (!canViewShow(access)) {
    notFound()
  }

  const [assignments, users] = await Promise.all([
    listShowAssignments(showId),
    listAssignableOrganizationUsers(),
  ])

  return (
    <ShowTeamPageShell
      showId={showId}
      showName={show.show_name ?? 'Untitled Show'}
      showNumber={show.show_number}
      showStatus={show.status}
      initialAssignments={assignments}
      assignableUsers={users}
      canEdit={canEditOperations(access)}
    />
  )
}