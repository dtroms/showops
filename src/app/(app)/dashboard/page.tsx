import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'
import { LeadershipDashboardShell } from '@/components/dashboard/leadership-dashboard-shell'
import { PmDashboardShell } from '@/components/dashboard/pm-dashboard-shell'

type ShowSummaryRow = {
  show_id: string
  organization_id: string
  show_name: string | null
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  estimated_revenue: number | null
}

type ShowRow = {
  id: string
  lead_membership_id: string | null
  created_by_membership_id: string | null
  organization_id: string
}

type ShowMembershipRow = {
  show_id: string
  membership_id: string
}

type OrgMembershipRow = {
  id: string
  user_id: string
  role: string | null
  reports_to_membership_id: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type BudgetVersionRow = {
  id: string
  show_id: string
  organization_id: string
  version_type: 'pre' | 'post'
  is_current: boolean
}

type BudgetLineRow = {
  version_id: string
  section_type: string
  subtotal: number | null
}

export type DashboardShow = {
  show_id: string
  show_name: string
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  estimated_revenue: number | null
  gear_total: number | null
  w2_labor_total: number | null
  freelance_labor_total: number | null
  vendor_total: number | null
  supply_total: number | null
  travel_total: number | null
  shipping_total: number | null
  expedited_total: number | null
  total_estimated_cost: number | null
  projected_profit: number | null
  margin_percent: number | null
  pm_membership_id: string | null
  pm_name: string
  pm_email: string | null
  financial_mode: 'actual' | 'projected'
}

type BudgetSnapshot = {
  estimated_revenue: number | null
  gear_total: number
  w2_labor_total: number
  freelance_labor_total: number
  vendor_total: number
  supply_total: number
  travel_total: number
  shipping_total: number
  expedited_total: number
  total_estimated_cost: number
  projected_profit: number
  margin_percent: number
}

function getProjectedSnapshot(summary: ShowSummaryRow): BudgetSnapshot {
  return {
    estimated_revenue: summary.estimated_revenue ?? 0,
    gear_total: 0,
    w2_labor_total: 0,
    freelance_labor_total: 0,
    vendor_total: 0,
    supply_total: 0,
    travel_total: 0,
    shipping_total: 0,
    expedited_total: 0,
    total_estimated_cost: 0,
    projected_profit: Number(summary.estimated_revenue ?? 0),
    margin_percent: 100,
  }
}

function buildBudgetSnapshot(revenue: number, lines: BudgetLineRow[]): BudgetSnapshot {
  let gearTotal = 0
  let w2LaborTotal = 0
  let freelanceLaborTotal = 0
  let supplyTotal = 0
  let travelTotal = 0
  let shippingTotal = 0
  let expeditedTotal = 0

  for (const line of lines) {
    const subtotal = Number(line.subtotal ?? 0)
    const section =
      line.section_type === 'vendor' ? 'freelance_labor' : line.section_type

    if (section === 'gear') gearTotal += subtotal
    if (section === 'w2_labor') w2LaborTotal += subtotal
    if (section === 'freelance_labor') freelanceLaborTotal += subtotal
    if (section === 'supply') supplyTotal += subtotal
    if (section === 'travel') travelTotal += subtotal
    if (section === 'shipping') shippingTotal += subtotal
    if (section === 'expedited') expeditedTotal += subtotal
  }

  const totalEstimatedCost =
    gearTotal +
    w2LaborTotal +
    freelanceLaborTotal +
    supplyTotal +
    travelTotal +
    shippingTotal +
    expeditedTotal

  const projectedProfit = revenue - totalEstimatedCost
  const marginPercent = revenue > 0 ? (projectedProfit / revenue) * 100 : 0

  return {
    estimated_revenue: revenue,
    gear_total: gearTotal,
    w2_labor_total: w2LaborTotal,
    freelance_labor_total: freelanceLaborTotal,
    vendor_total: freelanceLaborTotal,
    supply_total: supplyTotal,
    travel_total: travelTotal,
    shipping_total: shippingTotal,
    expedited_total: expeditedTotal,
    total_estimated_cost: totalEstimatedCost,
    projected_profit: projectedProfit,
    margin_percent: Number(marginPercent.toFixed(2)),
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const [
    { data: summaries, error: summariesError },
    { data: shows, error: showsError },
    { data: showMemberships, error: showMembershipsError },
    { data: orgMemberships, error: orgMembershipsError },
    { data: versions, error: versionsError },
  ] = await Promise.all([
    supabase
      .from('show_budget_summaries')
      .select(`
        show_id,
        organization_id,
        show_name,
        show_number,
        client_name,
        venue_name,
        city,
        start_date,
        end_date,
        status,
        estimated_revenue
      `)
      .eq('organization_id', organizationId)
      .returns<ShowSummaryRow[]>(),

    supabase
      .from('shows')
      .select('id, lead_membership_id, created_by_membership_id, organization_id')
      .eq('organization_id', organizationId)
      .returns<ShowRow[]>(),

    supabase
      .from('show_memberships')
      .select('show_id, membership_id')
      .eq('organization_id', organizationId)
      .returns<ShowMembershipRow[]>(),

    supabase
      .from('organization_memberships')
      .select('id, user_id, role, reports_to_membership_id')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .returns<OrgMembershipRow[]>(),

    supabase
      .from('budget_versions')
      .select('id, show_id, organization_id, version_type, is_current')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .is('archived_at', null)
      .in('version_type', ['pre', 'post'])
      .returns<BudgetVersionRow[]>(),
  ])

  if (summariesError) throw new Error(summariesError.message)
  if (showsError) throw new Error(showsError.message)
  if (showMembershipsError) throw new Error(showMembershipsError.message)
  if (orgMembershipsError) throw new Error(orgMembershipsError.message)
  if (versionsError) throw new Error(versionsError.message)

  const safeSummaries = (summaries ?? []).filter(
    (row) => row.organization_id === organizationId
  )
  const safeShows = (shows ?? []).filter(
    (row) => row.organization_id === organizationId
  )
  const safeVersions = (versions ?? []).filter(
    (row) => row.organization_id === organizationId
  )
  const safeShowMemberships = showMemberships ?? []
  const safeOrgMemberships = orgMemberships ?? []

  const versionIds = safeVersions.map((row) => row.id)

  let budgetLines: BudgetLineRow[] = []
  if (versionIds.length > 0) {
    const { data, error } = await supabase
      .from('show_budget_line_items')
      .select('version_id, section_type, subtotal')
      .in('version_id', versionIds)
      .returns<BudgetLineRow[]>()

    if (error) throw new Error(error.message)
    budgetLines = data ?? []
  }

  const linesByVersionId = new Map<string, BudgetLineRow[]>()
  for (const line of budgetLines) {
    const existing = linesByVersionId.get(line.version_id) ?? []
    existing.push(line)
    linesByVersionId.set(line.version_id, existing)
  }

  const preVersionByShowId = new Map<string, BudgetVersionRow>()
  const postVersionByShowId = new Map<string, BudgetVersionRow>()

  for (const version of safeVersions) {
    if (version.version_type === 'pre') preVersionByShowId.set(version.show_id, version)
    if (version.version_type === 'post') postVersionByShowId.set(version.show_id, version)
  }

  const userIds = Array.from(new Set(safeOrgMemberships.map((row) => row.user_id)))

  let profileMap = new Map<string, ProfileRow>()
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .returns<ProfileRow[]>()

    if (error) throw new Error(error.message)
    profileMap = new Map((data ?? []).map((row) => [row.id, row]))
  }

  const membershipMap = new Map(
    safeOrgMemberships.map((row) => {
      const profile = profileMap.get(row.user_id)
      return [
        row.id,
        {
          id: row.id,
          role: row.role ?? null,
          full_name: profile?.full_name ?? null,
          email: profile?.email ?? null,
          reports_to_membership_id: row.reports_to_membership_id ?? null,
        },
      ]
    })
  )

  const directReportMembershipIds = safeOrgMemberships
    .filter((row) => row.reports_to_membership_id === membership.id)
    .map((row) => row.id)

  const visibleMembershipIds = isLeadershipRole(orgRole)
    ? safeOrgMemberships.map((row) => row.id)
    : Array.from(new Set([membership.id, ...directReportMembershipIds]))

  const visibleMembershipIdSet = new Set(visibleMembershipIds)
  const showById = new Map(safeShows.map((row) => [row.id, row]))

  const assignedShowIds = new Set(
    safeShowMemberships
      .filter((row) => visibleMembershipIdSet.has(row.membership_id))
      .map((row) => row.show_id)
  )

  const visibleShows = safeSummaries
    .map<DashboardShow | null>((summary) => {
      const show = showById.get(summary.show_id)
      if (!show) return null

      const canSee =
        isLeadershipRole(orgRole) ||
        assignedShowIds.has(summary.show_id) ||
        visibleMembershipIdSet.has(show.lead_membership_id ?? '') ||
        visibleMembershipIdSet.has(show.created_by_membership_id ?? '')

      if (!canSee) return null

      const pmMembershipId =
        show.lead_membership_id ?? show.created_by_membership_id ?? null
      const pm = pmMembershipId ? membershipMap.get(pmMembershipId) : null

      const revenue = Number(summary.estimated_revenue ?? 0)
      const postVersion = postVersionByShowId.get(summary.show_id)
      const preVersion = preVersionByShowId.get(summary.show_id)

      const postSnapshot = postVersion
        ? buildBudgetSnapshot(revenue, linesByVersionId.get(postVersion.id) ?? [])
        : null

      const preSnapshot = preVersion
        ? buildBudgetSnapshot(revenue, linesByVersionId.get(preVersion.id) ?? [])
        : getProjectedSnapshot(summary)

      const normalizedStatus = (summary.status ?? '')
        .toLowerCase()
        .replace(/[\s-]/g, '_')
        .trim()

      const isActual =
        normalizedStatus === 'financial_closed' && Boolean(postSnapshot)

      const activeSnapshot = isActual ? postSnapshot! : preSnapshot

      return {
        show_id: summary.show_id,
        show_name: summary.show_name ?? 'Untitled Show',
        show_number: summary.show_number,
        client_name: summary.client_name,
        venue_name: summary.venue_name,
        city: summary.city,
        start_date: summary.start_date,
        end_date: summary.end_date,
        status: summary.status,
        estimated_revenue: activeSnapshot.estimated_revenue,
        gear_total: activeSnapshot.gear_total,
        w2_labor_total: activeSnapshot.w2_labor_total,
        freelance_labor_total: activeSnapshot.freelance_labor_total,
        vendor_total: activeSnapshot.vendor_total,
        supply_total: activeSnapshot.supply_total,
        travel_total: activeSnapshot.travel_total,
        shipping_total: activeSnapshot.shipping_total,
        expedited_total: activeSnapshot.expedited_total,
        total_estimated_cost: activeSnapshot.total_estimated_cost,
        projected_profit: activeSnapshot.projected_profit,
        margin_percent: activeSnapshot.margin_percent,
        pm_membership_id: pmMembershipId,
        pm_name: pm?.full_name ?? pm?.email ?? 'Unassigned PM',
        pm_email: pm?.email ?? null,
        financial_mode: isActual ? 'actual' : 'projected',
      }
    })
    .filter((row): row is DashboardShow => Boolean(row))

  if (isLeadershipRole(orgRole)) {
    const pmUsers = safeOrgMemberships
      .filter((row) => (row.role ?? '').toLowerCase() === 'project_manager')
      .map((row) => {
        const profile = profileMap.get(row.user_id)
        return {
          membership_id: row.id,
          name: profile?.full_name ?? profile?.email ?? 'Unnamed PM',
          email: profile?.email ?? null,
        }
      })

    return <LeadershipDashboardShell shows={visibleShows} pmUsers={pmUsers} />
  }

  const managedMembershipIds = new Set([membership.id, ...directReportMembershipIds])

  const pmShows = visibleShows.filter((show) =>
    show.pm_membership_id ? managedMembershipIds.has(show.pm_membership_id) : false
  )

  const managedPmUsers = Array.from(managedMembershipIds).map((membershipId) => {
    const row = membershipMap.get(membershipId)
    return {
      membership_id: membershipId,
      name: row?.full_name ?? row?.email ?? 'Unnamed PM',
      email: row?.email ?? null,
    }
  })

  return <PmDashboardShell shows={pmShows} managedPmUsers={managedPmUsers} />
}