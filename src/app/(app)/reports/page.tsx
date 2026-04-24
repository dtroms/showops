import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewOrgFinancials } from '@/lib/permissions'

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
  organization_id: string
  lead_membership_id: string | null
  created_by_membership_id: string | null
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

type OrgMembershipRow = {
  id: string
  user_id: string
  role: string | null
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

type ReportRow = {
  show_id: string
  show_name: string
  show_number: string | null
  client_name: string | null
  venue_name: string | null
  city: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
  estimated_revenue: number
  projected_cost: number
  projected_profit: number
  projected_margin_percent: number
  actual_cost: number
  actual_profit: number
  actual_margin_percent: number
  has_post_budget: boolean
  financial_mode: 'actual' | 'projected'
  active_cost: number
  active_profit: number
  active_margin_percent: number
  pm_membership_id: string | null
  pm_name: string
  pm_email: string | null
}

type SearchParams = {
  range?: string
  status?: string
  q?: string
  sort?: string
  trend?: string
  leaderboard?: string
  mode?: string
  pm?: string
}

type TrendBucket = {
  label: string
  projectedRevenue: number
  projectedProfit: number
  actualRevenue: number
  actualProfit: number
}

type PmOption = {
  membership_id: string
  name: string
  email: string | null
}

type QuarterShowRow = {
  quarter: string
  pm_membership_id: string | null
  pm_name: string
  row: ReportRow
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(Number(value ?? 0))
}

function formatShortDate(value: string | null | undefined) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString()
}

function normalizeStatus(status: string | null) {
  return (status ?? 'draft').toLowerCase()
}

function normalizeFinancialStatus(status: string | null) {
  return (status ?? '').toLowerCase().replace(/[\s-]/g, '_').trim()
}

function startDateForRange(range: string) {
  const now = new Date()
  const result = new Date(now)

  if (range === '30d') {
    result.setDate(now.getDate() - 30)
    return result
  }

  if (range === '90d') {
    result.setDate(now.getDate() - 90)
    return result
  }

  if (range === 'ytd') {
    return new Date(now.getFullYear(), 0, 1)
  }

  return null
}

function monthKey(dateValue: string | null | undefined) {
  if (!dateValue) return 'Unknown'
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function quarterKey(dateValue: string | null | undefined) {
  if (!dateValue) return 'Unknown'
  const date = new Date(`${dateValue}T00:00:00`)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  const q = Math.floor(date.getMonth() / 3) + 1
  return `${date.getFullYear()} Q${q}`
}

function buildBudgetSnapshot(revenue: number, lines: BudgetLineRow[]) {
  let totalCost = 0

  for (const line of lines) {
    totalCost += Number(line.subtotal ?? 0)
  }

  const profit = revenue - totalCost
  const marginPercent = revenue > 0 ? (profit / revenue) * 100 : 0

  return {
    cost: totalCost,
    profit,
    marginPercent: Number(marginPercent.toFixed(1)),
  }
}

function buildTrendData(rows: ReportRow[], trend: string) {
  const bucketMap = new Map<string, TrendBucket>()

  for (const row of rows) {
    const key = trend === 'monthly' ? monthKey(row.start_date) : quarterKey(row.start_date)

    const current = bucketMap.get(key) ?? {
      label: key,
      projectedRevenue: 0,
      projectedProfit: 0,
      actualRevenue: 0,
      actualProfit: 0,
    }

    current.projectedRevenue += Number(row.estimated_revenue ?? 0)
    current.projectedProfit += Number(row.projected_profit ?? 0)

    if (row.financial_mode === 'actual') {
      current.actualRevenue += Number(row.estimated_revenue ?? 0)
      current.actualProfit += Number(row.actual_profit ?? 0)
    }

    bucketMap.set(key, current)
  }

  return Array.from(bucketMap.values()).sort((a, b) => a.label.localeCompare(b.label))
}

function buildLeaderboard(rows: ReportRow[], metric: string) {
  const sorted = [...rows].sort((a, b) => {
    if (metric === 'revenue') {
      return Number(b.estimated_revenue ?? 0) - Number(a.estimated_revenue ?? 0)
    }
    if (metric === 'margin') {
      return Number(b.active_margin_percent ?? 0) - Number(a.active_margin_percent ?? 0)
    }
    return Number(b.active_profit ?? 0) - Number(a.active_profit ?? 0)
  })

  return sorted.slice(0, 8)
}

function getModeScopedRows(rows: ReportRow[], mode: string) {
  if (mode === 'actual') return rows.filter((row) => row.financial_mode === 'actual')
  if (mode === 'projected') return rows.filter((row) => row.financial_mode === 'projected')
  return rows
}

function buildQuarterlyPmRows(rows: ReportRow[]) {
  const expanded: QuarterShowRow[] = rows.map((row) => ({
    quarter: quarterKey(row.start_date),
    pm_membership_id: row.pm_membership_id,
    pm_name: row.pm_name,
    row,
  }))

  expanded.sort((a, b) => {
    const pmCompare = a.pm_name.localeCompare(b.pm_name)
    if (pmCompare !== 0) return pmCompare
    const quarterCompare = a.quarter.localeCompare(b.quarter)
    if (quarterCompare !== 0) return quarterCompare
    return a.row.show_name.localeCompare(b.row.show_name)
  })

  return expanded
}

function calcQuarterSubtotal(rows: ReportRow[]) {
  const projectedRevenue = rows.reduce((sum, row) => sum + Number(row.estimated_revenue ?? 0), 0)
  const projectedCost = rows.reduce((sum, row) => sum + Number(row.projected_cost ?? 0), 0)
  const projectedProfit = rows.reduce((sum, row) => sum + Number(row.projected_profit ?? 0), 0)
  const actualRevenue = rows.reduce(
    (sum, row) => sum + (row.financial_mode === 'actual' ? Number(row.estimated_revenue ?? 0) : 0),
    0
  )
  const actualCost = rows.reduce(
    (sum, row) => sum + (row.financial_mode === 'actual' ? Number(row.actual_cost ?? 0) : 0),
    0
  )
  const actualProfit = rows.reduce(
    (sum, row) => sum + (row.financial_mode === 'actual' ? Number(row.actual_profit ?? 0) : 0),
    0
  )

  return {
    projectedRevenue,
    projectedCost,
    projectedProfit,
    projectedMargin:
      projectedRevenue > 0 ? (projectedProfit / projectedRevenue) * 100 : 0,
    actualRevenue,
    actualCost,
    actualProfit,
    actualMargin: actualRevenue > 0 ? (actualProfit / actualRevenue) * 100 : 0,
  }
}

function metricTone(
  kind: 'profit' | 'margin' | 'count',
  value: number
): 'default' | 'success' | 'warning' | 'danger' {
  if (kind === 'count') return value > 0 ? 'danger' : 'default'
  if (kind === 'profit') return value >= 0 ? 'success' : 'danger'
  if (value < 45) return 'danger'
  if (value < 50) return 'warning'
  if (value >= 60) return 'success'
  return 'default'
}

function badgeTone(mode: 'actual' | 'projected') {
  return mode === 'actual'
    ? 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300'
    : 'border-amber-500/20 bg-amber-500/15 text-amber-300'
}

function sectionToneClass(
  tone: 'default' | 'success' | 'warning' | 'danger'
) {
  if (tone === 'success') return 'border-emerald-500/20 bg-emerald-500/[0.07]'
  if (tone === 'warning') return 'border-amber-500/20 bg-amber-500/[0.07]'
  if (tone === 'danger') return 'border-rose-500/20 bg-rose-500/[0.07]'
  return 'border-white/10 bg-white/[0.03]'
}

function valueToneClass(
  tone: 'default' | 'success' | 'warning' | 'danger'
) {
  if (tone === 'success') return 'text-emerald-300'
  if (tone === 'warning') return 'text-amber-300'
  if (tone === 'danger') return 'text-rose-300'
  return 'text-white'
}

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<SearchParams>
}) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const range = resolvedSearchParams?.range || '90d'
  const statusFilter = resolvedSearchParams?.status || 'all'
  const query = (resolvedSearchParams?.q || '').trim().toLowerCase()
  const sort = resolvedSearchParams?.sort || 'start_desc'
  const trend = resolvedSearchParams?.trend || 'quarterly'
  const leaderboard = resolvedSearchParams?.leaderboard || 'profit'
  const mode = resolvedSearchParams?.mode || 'combined'
  const pmFilter = resolvedSearchParams?.pm || 'all'

  const ctx = await requireMembershipContext()

  if (!canViewOrgFinancials(ctx.orgRole)) {
    return (
      <div className="space-y-6">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-3xl font-semibold tracking-tight text-white">Reports</h1>
          <p className="mt-2 text-sm text-rose-300">
            You do not have permission to view organization-wide financial reports.
          </p>
        </div>
      </div>
    )
  }

  const supabase = await createClient()
  const { organizationId } = ctx
  const sinceDate = startDateForRange(range)

  const [
    { data: summaries, error: summariesError },
    { data: versions, error: versionsError },
    { data: shows, error: showsError },
    { data: orgMemberships, error: orgMembershipsError },
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
      .from('budget_versions')
      .select('id, show_id, organization_id, version_type, is_current')
      .eq('organization_id', organizationId)
      .eq('is_current', true)
      .is('archived_at', null)
      .in('version_type', ['pre', 'post'])
      .returns<BudgetVersionRow[]>(),

    supabase
      .from('shows')
      .select('id, organization_id, lead_membership_id, created_by_membership_id')
      .eq('organization_id', organizationId)
      .returns<ShowRow[]>(),

    supabase
      .from('organization_memberships')
      .select('id, user_id, role')
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .returns<OrgMembershipRow[]>(),
  ])

  if (summariesError) throw new Error(summariesError.message)
  if (versionsError) throw new Error(versionsError.message)
  if (showsError) throw new Error(showsError.message)
  if (orgMembershipsError) throw new Error(orgMembershipsError.message)

  const userIds = Array.from(new Set((orgMemberships ?? []).map((row) => row.user_id)))

  let profiles: ProfileRow[] = []
  if (userIds.length > 0) {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .returns<ProfileRow[]>()

    if (error) throw new Error(error.message)
    profiles = data ?? []
  }

  const profileByUserId = new Map(profiles.map((row) => [row.id, row]))
  const showById = new Map((shows ?? []).map((row) => [row.id, row]))

  const pmByMembershipId = new Map<string, PmOption>()
  for (const membership of orgMemberships ?? []) {
    const profile = profileByUserId.get(membership.user_id)
    pmByMembershipId.set(membership.id, {
      membership_id: membership.id,
      name: profile?.full_name ?? profile?.email ?? 'Unnamed PM',
      email: profile?.email ?? null,
    })
  }

  const pmOptions = (orgMemberships ?? [])
    .filter((row) => (row.role ?? '').toLowerCase() === 'project_manager')
    .map((row) => pmByMembershipId.get(row.id))
    .filter((row): row is PmOption => Boolean(row))
    .sort((a, b) => a.name.localeCompare(b.name))

  const safeSummaries = (summaries ?? []).filter(
    (row) => row.organization_id === organizationId
  )
  const safeVersions = (versions ?? []).filter(
    (row) => row.organization_id === organizationId
  )

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

  let allRows: ReportRow[] = safeSummaries.map((show) => {
    const revenue = Number(show.estimated_revenue ?? 0)
    const preVersion = preVersionByShowId.get(show.show_id)
    const postVersion = postVersionByShowId.get(show.show_id)
    const showMeta = showById.get(show.show_id)

    const pmMembershipId =
      showMeta?.lead_membership_id ?? showMeta?.created_by_membership_id ?? null
    const pm = pmMembershipId ? pmByMembershipId.get(pmMembershipId) : null

    const preSnapshot = preVersion
      ? buildBudgetSnapshot(revenue, linesByVersionId.get(preVersion.id) ?? [])
      : buildBudgetSnapshot(revenue, [])

    const postSnapshot = postVersion
      ? buildBudgetSnapshot(revenue, linesByVersionId.get(postVersion.id) ?? [])
      : buildBudgetSnapshot(revenue, [])

    const isActual =
      normalizeFinancialStatus(show.status) === 'financial_closed' && Boolean(postVersion)

    const activeCost = isActual ? postSnapshot.cost : preSnapshot.cost
    const activeProfit = isActual ? postSnapshot.profit : preSnapshot.profit
    const activeMarginPercent = isActual
      ? postSnapshot.marginPercent
      : preSnapshot.marginPercent

    return {
      show_id: show.show_id,
      show_name: show.show_name ?? 'Untitled Show',
      show_number: show.show_number,
      client_name: show.client_name,
      venue_name: show.venue_name,
      city: show.city,
      start_date: show.start_date,
      end_date: show.end_date,
      status: show.status,
      estimated_revenue: revenue,
      projected_cost: preSnapshot.cost,
      projected_profit: preSnapshot.profit,
      projected_margin_percent: preSnapshot.marginPercent,
      actual_cost: postSnapshot.cost,
      actual_profit: postSnapshot.profit,
      actual_margin_percent: postSnapshot.marginPercent,
      has_post_budget: Boolean(postVersion),
      financial_mode: isActual ? 'actual' : 'projected',
      active_cost: activeCost,
      active_profit: activeProfit,
      active_margin_percent: activeMarginPercent,
      pm_membership_id: pmMembershipId,
      pm_name: pm?.name ?? 'Unassigned PM',
      pm_email: pm?.email ?? null,
    }
  })

  if (sinceDate) {
    allRows = allRows.filter((row) => {
      if (!row.start_date) return false
      const showDate = new Date(`${row.start_date}T00:00:00`)
      return showDate >= sinceDate
    })
  }

  if (statusFilter !== 'all') {
    allRows = allRows.filter((row) => normalizeStatus(row.status) === statusFilter)
  }

  if (pmFilter !== 'all') {
    allRows = allRows.filter((row) => row.pm_membership_id === pmFilter)
  }

  if (query) {
    allRows = allRows.filter((row) => {
      const haystack = [
        row.show_name,
        row.show_number,
        row.client_name,
        row.venue_name,
        row.city,
        row.pm_name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }

  let rows = getModeScopedRows(allRows, mode)

  rows = [...rows].sort((a, b) => {
    if (sort === 'profit_desc') {
      return Number(b.active_profit ?? 0) - Number(a.active_profit ?? 0)
    }

    if (sort === 'margin_desc') {
      return Number(b.active_margin_percent ?? 0) - Number(a.active_margin_percent ?? 0)
    }

    if (sort === 'revenue_desc') {
      return Number(b.estimated_revenue ?? 0) - Number(a.estimated_revenue ?? 0)
    }

    const aDate = a.start_date ? new Date(`${a.start_date}T00:00:00`).getTime() : 0
    const bDate = b.start_date ? new Date(`${b.start_date}T00:00:00`).getTime() : 0
    return bDate - aDate
  })

  const metrics = rows.reduce(
    (acc, row) => {
      acc.revenue += Number(row.estimated_revenue ?? 0)
      acc.cost += Number(row.active_cost ?? 0)
      acc.profit += Number(row.active_profit ?? 0)
      return acc
    },
    { revenue: 0, cost: 0, profit: 0 }
  )

  const avgMargin =
    rows.length > 0
      ? Number(
          (
            rows.reduce((sum, row) => sum + Number(row.active_margin_percent ?? 0), 0) / rows.length
          ).toFixed(1)
        )
      : 0

  const statusCounts = rows.reduce<Record<string, number>>((acc, row) => {
    const key = normalizeStatus(row.status)
    acc[key] = (acc[key] ?? 0) + 1
    return acc
  }, {})

  const trendData = buildTrendData(rows, trend)
  const leaderboardRows = buildLeaderboard(rows, leaderboard)
  const quarterlyPmRows = buildQuarterlyPmRows(rows)

  const chartMax = Math.max(
    ...trendData.flatMap((item) => [item.projectedProfit, item.actualProfit]),
    1
  )

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Reports</h1>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Filtered Shows
            </div>
            <div className="mt-1 text-sm font-semibold text-white">{rows.length}</div>
          </div>
        </div>
      </div>

      <form className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-8">
          <div>
            <label className="block text-sm font-medium text-slate-300">Mode</label>
            <select
              name="mode"
              defaultValue={mode}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="combined">Combined</option>
              <option value="actual">Actual</option>
              <option value="projected">Projected</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Project Manager</label>
            <select
              name="pm"
              defaultValue={pmFilter}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All PMs</option>
              {pmOptions.map((pm) => (
                <option key={pm.membership_id} value={pm.membership_id}>
                  {pm.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Range</label>
            <select
              name="range"
              defaultValue={range}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="ytd">Year to date</option>
              <option value="all">All time</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Status</label>
            <select
              name="status"
              defaultValue={statusFilter}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="all">All statuses</option>
              <option value="draft">Draft</option>
              <option value="planning">Planning</option>
              <option value="confirmed">Confirmed</option>
              <option value="active">Active</option>
              <option value="in_progress">In Progress</option>
              <option value="show_complete">Show Complete</option>
              <option value="financial_closed">Financial Closed</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Search</label>
            <input
              name="q"
              defaultValue={query}
              placeholder="Show, client, venue..."
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Sort</label>
            <select
              name="sort"
              defaultValue={sort}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="start_desc">Newest start date</option>
              <option value="revenue_desc">Highest revenue</option>
              <option value="profit_desc">Highest profit</option>
              <option value="margin_desc">Highest margin</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Trend View</label>
            <select
              name="trend"
              defaultValue={trend}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Leaderboard</label>
            <select
              name="leaderboard"
              defaultValue={leaderboard}
              className="mt-1 w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="profit">Profit</option>
              <option value="revenue">Revenue</option>
              <option value="margin">Margin</option>
            </select>
          </div>
        </div>

        <div className="mt-4">
          <button
            type="submit"
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100"
          >
            Apply Filters
          </button>
        </div>
      </form>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <div className={cn('rounded-[24px] border p-5', sectionToneClass('default'))}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Revenue
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(metrics.revenue)}
          </div>
        </div>

        <div className={cn('rounded-[24px] border p-5', sectionToneClass('default'))}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Cost
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(metrics.cost)}
          </div>
        </div>

        <div
          className={cn(
            'rounded-[24px] border p-5',
            sectionToneClass(metricTone('profit', metrics.profit))
          )}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {mode === 'actual' ? 'Actual Profit' : mode === 'projected' ? 'Projected Profit' : 'Profit'}
          </div>
          <div
            className={cn(
              'mt-3 text-2xl font-semibold tracking-tight',
              valueToneClass(metricTone('profit', metrics.profit))
            )}
          >
            {formatCurrency(metrics.profit)}
          </div>
        </div>

        <div
          className={cn(
            'rounded-[24px] border p-5',
            sectionToneClass(metricTone('margin', avgMargin))
          )}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Average Margin
          </div>
          <div
            className={cn(
              'mt-3 text-2xl font-semibold tracking-tight',
              valueToneClass(metricTone('margin', avgMargin))
            )}
          >
            {avgMargin.toFixed(1)}%
          </div>
        </div>

        <div
          className={cn(
            'rounded-[24px] border p-5',
            sectionToneClass(metricTone('count', rows.length === 0 ? 0 : 1))
          )}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            {mode === 'actual' ? 'Actual Shows' : mode === 'projected' ? 'Projected Shows' : 'Filtered Shows'}
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {rows.length}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Projected vs Realized
            </h2>

            <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300">
              {pmFilter === 'all'
                ? 'All PMs'
                : (pmOptions.find((pm) => pm.membership_id === pmFilter)?.name ?? 'Selected PM')}
            </div>
          </div>

          {!trendData.length ? (
            <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
              No chart data available.
            </div>
          ) : (
            <div className="space-y-4">
              {trendData.map((item) => (
                <div key={item.label}>
                  <div className="mb-2 flex items-center justify-between text-sm">
                    <span className="font-medium text-slate-200">{item.label}</span>
                    <span className="text-slate-500">
                      Projected {formatCurrency(item.projectedProfit)} · Realized {formatCurrency(item.actualProfit)}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-amber-300/80">
                        <span>Projected</span>
                        <span>{formatCurrency(item.projectedProfit)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-amber-400"
                          style={{
                            width: `${Math.max((item.projectedProfit / chartMax) * 100, 2)}%`,
                          }}
                        />
                      </div>
                    </div>

                    <div>
                      <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.22em] text-emerald-300/80">
                        <span>Realized</span>
                        <span>{formatCurrency(item.actualProfit)}</span>
                      </div>
                      <div className="h-3 overflow-hidden rounded-full bg-white/5">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{
                            width: `${Math.max((item.actualProfit / chartMax) * 100, 2)}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <h2 className="text-lg font-semibold tracking-tight text-white">
              Top Shows by {leaderboard === 'profit' ? 'Profit' : leaderboard === 'revenue' ? 'Revenue' : 'Margin'}
            </h2>

            <div className="mt-4 space-y-3">
              {leaderboardRows.length ? (
                leaderboardRows.map((row) => (
                  <Link
                    key={row.show_id}
                    href={`/shows/${row.show_id}/show-details`}
                    className="block rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:bg-white/[0.04]"
                  >
                    <div className="font-semibold text-white">{row.show_name}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {row.client_name ?? 'No client'} · {formatShortDate(row.start_date)}
                    </div>
                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span className="text-slate-400">
                        {leaderboard === 'profit'
                          ? 'Profit'
                          : leaderboard === 'revenue'
                            ? 'Revenue'
                            : 'Margin'}
                      </span>
                      <span className="font-semibold text-emerald-300">
                        {leaderboard === 'margin'
                          ? `${Number(row.active_margin_percent ?? 0).toFixed(1)}%`
                          : leaderboard === 'revenue'
                            ? formatCurrency(row.estimated_revenue)
                            : formatCurrency(row.active_profit)}
                      </span>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
                  No report rows available.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
            <h2 className="text-lg font-semibold tracking-tight text-white">Status Mix</h2>

            <div className="mt-4 space-y-3">
              {[
                ['Draft', statusCounts.draft ?? 0],
                ['Planning', statusCounts.planning ?? 0],
                ['Confirmed', statusCounts.confirmed ?? 0],
                ['Active / In Progress', (statusCounts.active ?? 0) + (statusCounts.in_progress ?? 0)],
                ['Show Complete', statusCounts.show_complete ?? 0],
                ['Financial Closed', statusCounts.financial_closed ?? 0],
              ].map(([label, count]) => (
                <div
                  key={String(label)}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
                >
                  <span className="text-sm text-slate-400">{label}</span>
                  <span className="text-sm font-semibold text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <h2 className="text-lg font-semibold tracking-tight text-white">Quarterly PM Report</h2>

        {!quarterlyPmRows.length ? (
          <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            No PM quarterly report rows available.
          </div>
        ) : (
          <div className="mt-4 space-y-6">
            {Array.from(
              quarterlyPmRows.reduce((map, item) => {
                const key = item.pm_name
                const existing = map.get(key) ?? []
                existing.push(item)
                map.set(key, existing)
                return map
              }, new Map<string, QuarterShowRow[]>())
            ).map(([pmName, pmRows]) => {
              const byQuarter = pmRows.reduce((map, item) => {
                const existing = map.get(item.quarter) ?? []
                existing.push(item.row)
                map.set(item.quarter, existing)
                return map
              }, new Map<string, ReportRow[]>())

              return (
                <div key={pmName} className="rounded-2xl border border-white/10">
                  <div className="border-b border-white/10 bg-white/[0.03] px-4 py-3">
                    <h3 className="font-semibold text-white">{pmName}</h3>
                  </div>

                  <div className="space-y-4 p-4">
                    {Array.from(byQuarter.entries())
                      .sort((a, b) => a[0].localeCompare(b[0]))
                      .map(([quarter, quarterRows]) => {
                        const subtotal = calcQuarterSubtotal(quarterRows)

                        return (
                          <div key={quarter} className="rounded-2xl border border-white/10">
                            <div className="border-b border-white/10 bg-white/[0.02] px-4 py-3">
                              <h4 className="font-medium text-white">{quarter}</h4>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="min-w-full text-left text-sm">
                                <thead className="bg-white/[0.03] text-slate-500">
                                  <tr>
                                    <th className="px-4 py-3 font-semibold">Show</th>
                                    <th className="px-4 py-3 font-semibold">Projected Profit</th>
                                    <th className="px-4 py-3 font-semibold">Projected Margin</th>
                                    <th className="px-4 py-3 font-semibold">Actual Profit</th>
                                    <th className="px-4 py-3 font-semibold">Actual Margin</th>
                                    <th className="px-4 py-3 font-semibold">Variance</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {quarterRows.map((row) => (
                                    <tr key={row.show_id} className="border-t border-white/10">
                                      <td className="px-4 py-3">
                                        <div className="font-medium text-white">{row.show_name}</div>
                                        <div className="text-xs text-slate-500">
                                          {formatShortDate(row.start_date)} - {formatShortDate(row.end_date)}
                                        </div>
                                      </td>
                                      <td className="px-4 py-3 text-slate-200">
                                        {formatCurrency(row.projected_profit)}
                                      </td>
                                      <td className="px-4 py-3 text-slate-200">
                                        {row.projected_margin_percent.toFixed(1)}%
                                      </td>
                                      <td className="px-4 py-3 text-slate-200">
                                        {row.financial_mode === 'actual'
                                          ? formatCurrency(row.actual_profit)
                                          : '—'}
                                      </td>
                                      <td className="px-4 py-3 text-slate-200">
                                        {row.financial_mode === 'actual'
                                          ? `${row.actual_margin_percent.toFixed(1)}%`
                                          : '—'}
                                      </td>
                                      <td className="px-4 py-3 text-slate-200">
                                        {row.financial_mode === 'actual'
                                          ? formatCurrency(row.actual_profit - row.projected_profit)
                                          : '—'}
                                      </td>
                                    </tr>
                                  ))}

                                  <tr className="border-t border-white/10 bg-white/[0.03] font-medium">
                                    <td className="px-4 py-3 text-white">Quarter Total</td>
                                    <td className="px-4 py-3 text-white">
                                      {formatCurrency(subtotal.projectedProfit)}
                                    </td>
                                    <td className="px-4 py-3 text-white">
                                      {subtotal.projectedMargin.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3 text-white">
                                      {formatCurrency(subtotal.actualProfit)}
                                    </td>
                                    <td className="px-4 py-3 text-white">
                                      {subtotal.actualMargin.toFixed(1)}%
                                    </td>
                                    <td className="px-4 py-3 text-white">
                                      {formatCurrency(subtotal.actualProfit - subtotal.projectedProfit)}
                                    </td>
                                  </tr>
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <h2 className="mb-4 text-lg font-semibold tracking-tight text-white">Report Table</h2>

        {!rows.length ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            No shows matched your current filters.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Show</th>
                  <th className="px-4 py-3 font-semibold">PM</th>
                  <th className="px-4 py-3 font-semibold">Mode</th>
                  <th className="px-4 py-3 font-semibold">Client</th>
                  <th className="px-4 py-3 font-semibold">Dates</th>
                  <th className="px-4 py-3 font-semibold">Revenue</th>
                  <th className="px-4 py-3 font-semibold">Cost</th>
                  <th className="px-4 py-3 font-semibold">Profit</th>
                  <th className="px-4 py-3 font-semibold">Margin</th>
                  <th className="px-4 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.show_id} className="border-t border-white/10 hover:bg-white/[0.02]">
                    <td className="px-4 py-4">
                      <p className="font-semibold text-white">{row.show_name}</p>
                      <p className="mt-1 text-xs text-slate-500">{row.show_number ?? '—'}</p>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{row.pm_name}</td>
                    <td className="px-4 py-4">
                      <span
                        className={cn(
                          'rounded-full border px-2 py-1 text-xs font-medium',
                          badgeTone(row.financial_mode)
                        )}
                      >
                        {row.financial_mode === 'actual' ? 'Actual' : 'Projected'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-slate-300">{row.client_name ?? '—'}</td>
                    <td className="px-4 py-4 text-slate-300">
                      {formatShortDate(row.start_date)} - {formatShortDate(row.end_date)}
                    </td>
                    <td className="px-4 py-4 text-slate-200">{formatCurrency(row.estimated_revenue)}</td>
                    <td className="px-4 py-4 text-slate-200">{formatCurrency(row.active_cost)}</td>
                    <td className="px-4 py-4 font-medium text-emerald-300">
                      {formatCurrency(row.active_profit)}
                    </td>
                    <td className="px-4 py-4 text-slate-200">
                      {Number(row.active_margin_percent ?? 0).toFixed(1)}%
                    </td>
                    <td className="px-4 py-4 text-right">
                      <Link
                        href={`/shows/${row.show_id}/show-details`}
                        className="rounded-xl bg-white px-3 py-1.5 text-xs font-medium text-slate-950 transition hover:bg-slate-100"
                      >
                        Open Show
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}