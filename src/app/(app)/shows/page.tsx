import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'
import { AllShowsPageShell } from '@/components/shows/all-shows-page-shell'

type ShowBudgetSummaryRow = {
  show_id: string
  show_name: string | null
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  state: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  estimated_revenue: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
  vendor_total: number | null
}

type ShowRow = {
  id: string
  lead_membership_id: string | null
  created_by_membership_id: string | null
}

type ShowMembershipRow = {
  show_id: string
}

type OrgMembershipRow = {
  id: string
  user_id: string
  reports_to_membership_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type ShowWithVisibility = ShowBudgetSummaryRow & {
  can_view_financials: boolean
  pm_label: string | null
  risk_flag: 'healthy' | 'warning' | 'risk'
  budget_status: 'missing' | 'ready'
  freelancer_status: 'missing' | 'assigned'
}

function labelForUser(profile?: ProfileRow | null) {
  if (!profile) return null
  return profile.full_name || profile.email || null
}

export default async function AllShowsPage() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const [{ data: orgShows, error: orgShowsError }, { data: allSummaries, error: summariesError }] =
    await Promise.all([
      supabase
        .from('shows')
        .select('id, lead_membership_id, created_by_membership_id')
        .eq('organization_id', organizationId)
        .returns<ShowRow[]>(),
      supabase
        .from('show_budget_summaries')
        .select(`
          show_id,
          show_name,
          show_number,
          client_name,
          venue_name,
          city,
          state,
          start_date,
          end_date,
          status,
          estimated_revenue,
          total_estimated_cost,
          projected_profit,
          margin_percent,
          vendor_total
        `)
        .order('start_date', { ascending: false })
        .returns<ShowBudgetSummaryRow[]>(),
    ])

  if (orgShowsError) {
    throw new Error(orgShowsError.message)
  }

  if (summariesError) {
    throw new Error(summariesError.message)
  }

  const orgShowRows = orgShows ?? []
  const orgShowIds = new Set(orgShowRows.map((row) => row.id))
  const ownershipMap = new Map(
    orgShowRows.map((row) => [
      row.id,
      {
        lead_membership_id: row.lead_membership_id,
        created_by_membership_id: row.created_by_membership_id,
      },
    ])
  )

  // Hard tenant scope
  const orgScopedShows = (allSummaries ?? []).filter((show) => orgShowIds.has(show.show_id))

  let visibleShows: ShowBudgetSummaryRow[] = []
  let financeVisibleIds = new Set<string>()

  if (isLeadershipRole(orgRole)) {
    visibleShows = orgScopedShows
    financeVisibleIds = new Set(orgScopedShows.map((show) => show.show_id))
  } else if (orgRole === 'ops_manager') {
    const { data: orgMemberships, error: orgMembershipsError } = await supabase
      .from('organization_memberships')
      .select('id, user_id, reports_to_membership_id')
      .eq('organization_id', organizationId)
      .returns<OrgMembershipRow[]>()

    if (orgMembershipsError) {
      throw new Error(orgMembershipsError.message)
    }

    const directReportIds = new Set(
      (orgMemberships ?? [])
        .filter((row) => row.reports_to_membership_id === membership.id)
        .map((row) => row.id)
    )

    const visibleShowIds = new Set<string>()

    for (const show of orgScopedShows) {
      const ownership = ownershipMap.get(show.show_id)

      if (
        ownership?.lead_membership_id === membership.id ||
        ownership?.created_by_membership_id === membership.id
      ) {
        visibleShowIds.add(show.show_id)
        financeVisibleIds.add(show.show_id)
      }

      if (
        ownership?.lead_membership_id &&
        directReportIds.has(ownership.lead_membership_id)
      ) {
        visibleShowIds.add(show.show_id)
        financeVisibleIds.add(show.show_id)
      }

      if (
        ownership?.created_by_membership_id &&
        directReportIds.has(ownership.created_by_membership_id)
      ) {
        visibleShowIds.add(show.show_id)
        financeVisibleIds.add(show.show_id)
      }
    }

    const { data: assignedMembershipRows, error: membershipError } = await supabase
      .from('show_memberships')
      .select('show_id')
      .eq('organization_id', organizationId)
      .eq('membership_id', membership.id)
      .returns<ShowMembershipRow[]>()

    if (membershipError) {
      throw new Error(membershipError.message)
    }

    for (const row of assignedMembershipRows ?? []) {
      visibleShowIds.add(row.show_id)
      financeVisibleIds.add(row.show_id)
    }

    visibleShows = orgScopedShows.filter((show) => visibleShowIds.has(show.show_id))
  } else {
    const { data: assignedMembershipRows, error: membershipError } = await supabase
      .from('show_memberships')
      .select('show_id')
      .eq('organization_id', organizationId)
      .eq('membership_id', membership.id)
      .returns<ShowMembershipRow[]>()

    if (membershipError) {
      throw new Error(membershipError.message)
    }

    const ownedShowIds = new Set(
      orgShowRows
        .filter(
          (row) =>
            row.lead_membership_id === membership.id ||
            row.created_by_membership_id === membership.id
        )
        .map((row) => row.id)
    )

    financeVisibleIds = new Set<string>([
      ...(assignedMembershipRows ?? []).map((row) => row.show_id),
      ...ownedShowIds,
    ])

    // PMs can browse org shows, but finance only on assigned/owned shows
    visibleShows = orgScopedShows
  }

  const membershipIds = Array.from(
    new Set(
      visibleShows.flatMap((show) => {
        const ownership = ownershipMap.get(show.show_id)
        return [ownership?.lead_membership_id, ownership?.created_by_membership_id].filter(
          (value): value is string => Boolean(value)
        )
      })
    )
  )

  let pmLabelMap = new Map<string, string | null>()

  if (membershipIds.length > 0) {
    const { data: memberships, error: membershipsError } = await supabase
      .from('organization_memberships')
      .select('id, user_id, reports_to_membership_id')
      .eq('organization_id', organizationId)
      .in('id', membershipIds)
      .returns<OrgMembershipRow[]>()

    if (membershipsError) {
      throw new Error(membershipsError.message)
    }

    const userIds = Array.from(
      new Set((memberships ?? []).map((row) => row.user_id).filter(Boolean))
    )

    let profileMap = new Map<string, ProfileRow>()

    if (userIds.length > 0) {
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

    pmLabelMap = new Map(
      (memberships ?? []).map((row) => [row.id, labelForUser(profileMap.get(row.user_id))])
    )
  }

  const mappedShows: ShowWithVisibility[] = visibleShows.map((show) => {
    const ownership = ownershipMap.get(show.show_id)
    const pmMembershipId =
      ownership?.lead_membership_id ?? ownership?.created_by_membership_id ?? null

    return {
      ...show,
      pm_label: pmMembershipId ? pmLabelMap.get(pmMembershipId) ?? null : null,
      can_view_financials: financeVisibleIds.has(show.show_id),
      budget_status:
        Number(show.total_estimated_cost ?? 0) <= 0 ? 'missing' : 'ready',
      freelancer_status:
        Number(show.vendor_total ?? 0) <= 0 ? 'missing' : 'assigned',
      risk_flag:
        !pmMembershipId
          ? 'risk'
          : Number(show.total_estimated_cost ?? 0) <= 0
            ? 'risk'
            : Number(show.margin_percent ?? 0) < 20
              ? 'risk'
              : Number(show.margin_percent ?? 0) < 30
                ? 'warning'
                : 'healthy',
    }
  })

  return <AllShowsPageShell shows={mappedShows} />
}