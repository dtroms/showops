import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import {
  canViewRevenue,
  canViewShowProfitability,
} from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'
import { getUserDisplayMap, shortUserId } from '@/lib/user-display'
import { formatCurrency } from '@/lib/format'

type BudgetVersion = {
  id: string
  version_type: 'pre' | 'post'
  version_name: string
  is_current: boolean
  created_at: string
}

type BudgetLineItem = {
  id: string
  version_id: string
  section_type: string
  subtotal: number | null
}

type FreelanceVendor = {
  id: string
  vendor_name_snapshot: string
  vendor_type_snapshot: string | null
  service_type_snapshot: string | null
  contact_name_snapshot: string | null
}

type ShowDetailsRow = {
  id: string
  show_name: string | null
  show_number: string | null
  start_date: string | null
  end_date: string | null
  estimated_revenue: number | null
  venue_contact_name: string | null
  venue_contact_email: string | null
  venue_contact_phone: string | null
  event_contact_name: string | null
  event_contact_email: string | null
  event_contact_phone: string | null
  city: string | null
  state: string | null
  venue_id: string | null
  created_by_membership_id: string | null
  lead_membership_id: string | null
  status: string | null
  venues?: {
    name: string | null
  } | null
}

type OrgMembershipRow = {
  id: string
  user_id: string
  role: string
  status: string
}

type ShowMembershipRow = {
  membership_id: string
  show_role: string | null
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function sumTotalsBySection(
  items: BudgetLineItem[],
  sectionType: 'gear' | 'w2_labor' | 'freelance_labor' | 'supply' | 'travel'
) {
  return items.reduce((sum, item) => {
    return normalizeSectionType(item.section_type) === sectionType
      ? sum + Number(item.subtotal ?? 0)
      : sum
  }, 0)
}

function getMarginPercent(revenue: number, cost: number) {
  if (!revenue) return 0
  return Number((((revenue - cost) / revenue) * 100).toFixed(1))
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function formatDateRange(start: string | null, end: string | null) {
  const formatOne = (value: string | null) => {
    if (!value) return '—'
    const date = new Date(`${value}T00:00:00`)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleDateString()
  }

  return `${formatOne(start)} - ${formatOne(end)}`
}

function metricTone(
  kind: 'margin' | 'profit',
  value: number
): 'default' | 'success' | 'warning' | 'danger' {
  if (kind === 'profit') {
    return value >= 0 ? 'success' : 'danger'
  }

  if (value < 45) return 'danger'
  if (value < 50) return 'warning'
  if (value >= 60) return 'success'
  return 'default'
}

function statusBadgeTone(status: string | null | undefined) {
  const normalized = (status ?? '').toLowerCase().replace(/[\s-]/g, '_')
  if (normalized === 'financial_closed') return 'success'
  if (normalized === 'active') return 'info'
  if (normalized === 'planning') return 'warning'
  return 'default'
}

function StatusBadge({
  label,
  tone = 'default',
}: {
  label: string
  tone?: 'default' | 'success' | 'warning' | 'danger' | 'info'
}) {
  const toneClasses = {
    default: 'border-white/10 bg-white/10 text-slate-300',
    success: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
    warning: 'border-amber-500/20 bg-amber-500/15 text-amber-300',
    danger: 'border-rose-500/20 bg-rose-500/15 text-rose-300',
    info: 'border-sky-500/20 bg-sky-500/15 text-sky-300',
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold',
        toneClasses[tone]
      )}
    >
      {label}
    </span>
  )
}

function OverviewMetricCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const toneClasses = {
    default: 'border-white/10 bg-white/[0.03]',
    success: 'border-emerald-500/20 bg-emerald-500/[0.07]',
    warning: 'border-amber-500/20 bg-amber-500/[0.07]',
    danger: 'border-rose-500/20 bg-rose-500/[0.07]',
  }

  return (
    <div className={cn('rounded-[24px] border p-5', toneClasses[tone])}>
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
        {label}
      </div>
      <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
        {value}
      </div>
    </div>
  )
}

function HealthCard({
  label,
  value,
  tone = 'default',
}: {
  label: string
  value: string
  tone?: 'default' | 'success' | 'warning' | 'danger'
}) {
  const valueClass =
    tone === 'success'
      ? 'text-emerald-300'
      : tone === 'warning'
        ? 'text-amber-300'
        : tone === 'danger'
          ? 'text-rose-300'
          : 'text-white'

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2">
      <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
      <div className={cn('mt-1 text-sm font-semibold', valueClass)}>{value}</div>
    </div>
  )
}

function ContactCard({
  title,
  contacts,
}: {
  title: string
  contacts: Array<{ name: string; role: string; email: string; phone: string }>
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="text-lg font-semibold text-white">{title}</div>

      <div className="mt-4 space-y-3">
        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-6 text-sm text-slate-500">
            None
          </div>
        ) : null}

        {contacts.map((contact) => (
          <div
            key={`${title}-${contact.name}-${contact.email}`}
            className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-sm font-medium text-white">{contact.name}</div>
                <div className="mt-1 text-sm text-slate-400">{contact.role}</div>
              </div>

              <div className="text-right text-sm text-slate-300">
                <div>{contact.email || '—'}</div>
                <div className="mt-1">{contact.phone || '—'}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function PeopleCard({
  title,
  people,
}: {
  title: string
  people: Array<{ name: string; role: string; status: string }>
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="text-lg font-semibold text-white">{title}</div>

      <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
        <div className="grid grid-cols-[minmax(0,1fr)_180px_120px] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          <div>Name</div>
          <div>Role</div>
          <div>Status</div>
        </div>

        {people.length === 0 ? (
          <div className="px-4 py-6 text-sm text-slate-500">None</div>
        ) : null}

        {people.map((person) => (
          <div
            key={`${title}-${person.name}-${person.role}`}
            className="grid grid-cols-[minmax(0,1fr)_180px_120px] items-center border-t border-white/10 px-4 py-3 text-sm"
          >
            <div className="font-medium text-slate-100">{person.name}</div>
            <div className="text-slate-300">{person.role}</div>
            <div>
              <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-medium text-emerald-300">
                {person.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default async function ShowDetailsPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const [{ access }, { data: showDetails, error: showDetailsError }, { data: orgMemberships, error: orgMembershipsError }] =
    await Promise.all([
      resolveShowAccess({
        supabase,
        showId,
        organizationId,
        membershipId: membership.id,
        orgRole,
      }),
      supabase
        .from('shows')
        .select(`
          id,
          show_name,
          show_number,
          start_date,
          end_date,
          estimated_revenue,
          venue_contact_name,
          venue_contact_email,
          venue_contact_phone,
          event_contact_name,
          event_contact_email,
          event_contact_phone,
          city,
          state,
          venue_id,
          created_by_membership_id,
          lead_membership_id,
          status,
          venues (
            name
          )
        `)
        .eq('id', showId)
        .eq('organization_id', organizationId)
        .maybeSingle<ShowDetailsRow>(),
      supabase
        .from('organization_memberships')
        .select('id, user_id, role, status')
        .eq('organization_id', organizationId)
        .returns<OrgMembershipRow[]>(),
    ])

  if (showDetailsError) throw new Error(showDetailsError.message)
  if (orgMembershipsError) throw new Error(orgMembershipsError.message)
  if (!showDetails) notFound()

  const canViewRevenueValues = canViewRevenue(access)
  const canViewProfitabilityValues = canViewShowProfitability(access)

  if (!canViewRevenueValues && !canViewProfitabilityValues) {
    notFound()
  }

  const membershipToUser = new Map((orgMemberships ?? []).map((row) => [row.id, row.user_id]))
  const userDisplayMap = await getUserDisplayMap(
    supabase,
    (orgMemberships ?? []).map((row) => row.user_id)
  )

  const leadUserId = showDetails.lead_membership_id
    ? membershipToUser.get(showDetails.lead_membership_id) ?? null
    : null
  const createdUserId = showDetails.created_by_membership_id
    ? membershipToUser.get(showDetails.created_by_membership_id) ?? null
    : null

  const leadLabel = leadUserId
    ? (userDisplayMap.get(leadUserId)?.label ?? shortUserId(leadUserId))
    : 'Unassigned'

  const createdByLabel = createdUserId
    ? (userDisplayMap.get(createdUserId)?.label ?? shortUserId(createdUserId))
    : '—'

  const { data: budgetVersions, error: budgetVersionsError } = await supabase
    .from('budget_versions')
    .select('id, version_type, version_name, is_current, created_at')
    .eq('show_id', showId)
    .is('archived_at', null)
    .order('version_type', { ascending: true })
    .order('created_at', { ascending: false })

  if (budgetVersionsError) throw new Error(budgetVersionsError.message)

  const versions = (budgetVersions ?? []) as BudgetVersion[]

  const versionsByType = {
    pre:
      versions.find((version) => version.version_type === 'pre' && version.is_current) ??
      versions.find((version) => version.version_type === 'pre') ??
      null,
    post:
      versions.find((version) => version.version_type === 'post' && version.is_current) ??
      versions.find((version) => version.version_type === 'post') ??
      null,
  }

  const versionIdsToFetch = Array.from(
    new Set(
      [versionsByType.pre?.id, versionsByType.post?.id].filter(
        (value): value is string => Boolean(value)
      )
    )
  )

  const [{ data: lineItems, error: lineItemsError }, { data: freelanceVendors, error: vendorsError }, { data: showMemberships, error: showMembershipsError }] =
    await Promise.all([
      versionIdsToFetch.length
        ? supabase
            .from('show_budget_line_items')
            .select('id, version_id, section_type, subtotal')
            .eq('show_id', showId)
            .in('version_id', versionIdsToFetch)
            .returns<BudgetLineItem[]>()
        : Promise.resolve({ data: [], error: null }),
      supabase
        .from('show_vendors')
        .select('id, vendor_name_snapshot, vendor_type_snapshot, service_type_snapshot, contact_name_snapshot')
        .eq('show_id', showId)
        .returns<FreelanceVendor[]>(),
      supabase
        .from('show_memberships')
        .select('membership_id, show_role')
        .eq('show_id', showId)
        .returns<ShowMembershipRow[]>(),
    ])

  if (lineItemsError) throw new Error(lineItemsError.message)
  if (vendorsError) throw new Error(vendorsError.message)
  if (showMembershipsError) throw new Error(showMembershipsError.message)

  const allLineItems = lineItems ?? []
  const preItems = versionsByType.pre
    ? allLineItems.filter((item) => item.version_id === versionsByType.pre?.id)
    : []
  const postItems = versionsByType.post
    ? allLineItems.filter((item) => item.version_id === versionsByType.post?.id)
    : []

  const preRevenue = Number(showDetails.estimated_revenue ?? 0)
  const actualRevenue = Number(showDetails.estimated_revenue ?? 0)

  const preGear = sumTotalsBySection(preItems, 'gear')
  const preW2 = sumTotalsBySection(preItems, 'w2_labor')
  const preFreelance = sumTotalsBySection(preItems, 'freelance_labor')
  const preSupply = sumTotalsBySection(preItems, 'supply')
  const preTravel = sumTotalsBySection(preItems, 'travel')

  const postGear = sumTotalsBySection(postItems, 'gear')
  const postW2 = sumTotalsBySection(postItems, 'w2_labor')
  const postFreelance = sumTotalsBySection(postItems, 'freelance_labor')
  const postSupply = sumTotalsBySection(postItems, 'supply')
  const postTravel = sumTotalsBySection(postItems, 'travel')

  const preTotalCost = preGear + preW2 + preFreelance + preSupply + preTravel
  const postTotalCost = postGear + postW2 + postFreelance + postSupply + postTravel

  const normalizedStatus = (showDetails.status ?? '').toLowerCase().replace(/[\s-]/g, '_')
  const isFinancialClosed = normalizedStatus === 'financial_closed' && Boolean(versionsByType.post)

  const activeRevenue = isFinancialClosed ? actualRevenue : preRevenue
  const activeCost = isFinancialClosed ? postTotalCost : preTotalCost
  const activeProfit = activeRevenue - activeCost
  const activeMargin = getMarginPercent(activeRevenue, activeCost)

  const projectedProfit = preRevenue - preTotalCost
  const projectedMargin = getMarginPercent(preRevenue, preTotalCost)
  const actualProfit = actualRevenue - postTotalCost
  const actualMargin = getMarginPercent(actualRevenue, postTotalCost)

  const financialCards = [
    {
      label: 'Revenue',
      value: canViewRevenueValues ? formatCurrency(activeRevenue) : '—',
      tone: 'default' as const,
    },
    {
      label: 'Cost',
      value: canViewProfitabilityValues ? formatCurrency(activeCost) : '—',
      tone: 'default' as const,
    },
    {
      label: 'Profit',
      value: canViewProfitabilityValues ? formatCurrency(activeProfit) : '—',
      tone: metricTone('profit', activeProfit),
    },
    {
      label: 'Margin',
      value: canViewProfitabilityValues ? formatPercent(activeMargin) : '—',
      tone: metricTone('margin', activeMargin),
    },
  ]

  const varianceRows = [
    {
      label: 'Revenue',
      projected: canViewRevenueValues ? formatCurrency(preRevenue) : '—',
      actual: canViewRevenueValues ? formatCurrency(actualRevenue) : '—',
      delta: actualRevenue - preRevenue,
      isPercent: false,
    },
    {
      label: 'Cost',
      projected: canViewProfitabilityValues ? formatCurrency(preTotalCost) : '—',
      actual: canViewProfitabilityValues ? formatCurrency(postTotalCost) : '—',
      delta: postTotalCost - preTotalCost,
      isPercent: false,
    },
    {
      label: 'Profit',
      projected: canViewProfitabilityValues ? formatCurrency(projectedProfit) : '—',
      actual: canViewProfitabilityValues ? formatCurrency(actualProfit) : '—',
      delta: actualProfit - projectedProfit,
      isPercent: false,
    },
    {
      label: 'Margin',
      projected: canViewProfitabilityValues ? formatPercent(projectedMargin) : '—',
      actual: canViewProfitabilityValues ? formatPercent(actualMargin) : '—',
      delta: actualMargin - projectedMargin,
      isPercent: true,
    },
  ]

  const budgetCategories = [
    {
      category: 'Gear',
      amount: isFinancialClosed ? postGear : preGear,
    },
    {
      category: 'W2 Labor',
      amount: isFinancialClosed ? postW2 : preW2,
    },
    {
      category: 'Freelance Labor',
      amount: isFinancialClosed ? postFreelance : preFreelance,
    },
    {
      category: 'Supplies',
      amount: isFinancialClosed ? postSupply : preSupply,
    },
    {
      category: 'Travel',
      amount: isFinancialClosed ? postTravel : preTravel,
    },
  ].map((item) => ({
    category: item.category,
    amount: canViewProfitabilityValues ? formatCurrency(item.amount) : '—',
    percent:
      canViewRevenueValues && activeRevenue > 0
        ? formatPercent((item.amount / activeRevenue) * 100)
        : '—',
  }))

  const venueContacts = showDetails.venue_contact_name
    ? [
        {
          name: showDetails.venue_contact_name,
          role: showDetails.venues?.name ?? 'Venue',
          email: showDetails.venue_contact_email ?? '',
          phone: showDetails.venue_contact_phone ?? '',
        },
      ]
    : []

  const clientContacts = showDetails.event_contact_name
    ? [
        {
          name: showDetails.event_contact_name,
          role: 'Client Contact',
          email: showDetails.event_contact_email ?? '',
          phone: showDetails.event_contact_phone ?? '',
        },
      ]
    : []

  const crew = (showMemberships ?? []).map((row) => {
    const userId = membershipToUser.get(row.membership_id) ?? null
    const name = userId
      ? (userDisplayMap.get(userId)?.label ?? shortUserId(userId))
      : row.membership_id

    return {
      name,
      role: row.show_role ?? 'assigned',
      status: 'Assigned',
    }
  })

  const freelancers = (freelanceVendors ?? []).map((vendor) => ({
    name: vendor.vendor_name_snapshot || vendor.contact_name_snapshot || 'Freelancer',
    role: vendor.service_type_snapshot || vendor.vendor_type_snapshot || 'Freelancer',
    status: 'Assigned',
  }))

  const healthItems = [
    {
      label: 'Financial Mode',
      value: isFinancialClosed ? 'Actual' : 'Projected',
      tone: isFinancialClosed ? 'success' as const : 'warning' as const,
    },
    {
      label: 'Margin Status',
      value:
        activeMargin < 45
          ? 'Critical'
          : activeMargin < 50
            ? 'Warning'
            : activeMargin >= 60
              ? 'Bonus'
              : 'Healthy',
      tone: metricTone('margin', activeMargin),
    },
    {
      label: 'Lead PM',
      value: leadLabel,
      tone: 'default' as const,
    },
    {
      label: 'Created By',
      value: createdByLabel,
      tone: 'default' as const,
    },
    {
      label: 'Crew Assigned',
      value: String(crew.length),
      tone: 'default' as const,
    },
    {
      label: 'Freelancers',
      value: String(freelancers.length),
      tone: 'default' as const,
    },
  ]

  const flags = [
    activeMargin < 50
      ? {
          label: `Margin below 50% (${formatPercent(activeMargin)})`,
          tone: activeMargin < 45 ? 'danger' as const : 'warning' as const,
        }
      : {
          label: `Margin healthy (${formatPercent(activeMargin)})`,
          tone: 'success' as const,
        },
    venueContacts.length === 0
      ? { label: 'Venue contact missing', tone: 'danger' as const }
      : { label: 'Venue contact complete', tone: 'success' as const },
    clientContacts.length === 0
      ? { label: 'Client contact missing', tone: 'danger' as const }
      : { label: 'Client contact complete', tone: 'success' as const },
    versionsByType.post
      ? { label: 'Post-show budget available', tone: 'success' as const }
      : { label: 'No post-show budget', tone: 'warning' as const },
  ]

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="border-b border-white/10 px-6 py-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {financialCards.map((card) => (
              <OverviewMetricCard
                key={card.label}
                label={card.label}
                value={card.value}
                tone={card.tone}
              />
            ))}
          </div>

          <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
            <div className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              <div>Variance</div>
              <div>Projected</div>
              <div>{isFinancialClosed ? 'Actual' : 'Current'}</div>
              <div>Delta</div>
            </div>

            {varianceRows.map((row) => {
              const deltaClass =
                row.delta < 0
                  ? 'text-rose-300'
                  : row.delta > 0
                    ? 'text-amber-300'
                    : 'text-slate-300'

              const deltaLabel = row.isPercent
                ? `${row.delta > 0 ? '+' : ''}${row.delta.toFixed(1)}%`
                : `${row.delta > 0 ? '+' : ''}${formatCurrency(row.delta)}`

              return (
                <div
                  key={row.label}
                  className="grid grid-cols-[minmax(0,1fr)_140px_140px_140px] items-center border-t border-white/10 px-4 py-3 text-sm"
                >
                  <div className="font-medium text-slate-100">{row.label}</div>
                  <div className="text-slate-300">{row.projected}</div>
                  <div className="text-slate-200">{row.actual}</div>
                  <div className={deltaClass}>{deltaLabel}</div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-6 p-6">
          <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
              <div className="text-lg font-semibold text-white">
                Budget Category Financials
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
                <div className="grid grid-cols-[minmax(0,1fr)_160px_140px] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                  <div>Category</div>
                  <div>Amount</div>
                  <div>% of Revenue</div>
                </div>

                {budgetCategories.map((item) => (
                  <div
                    key={item.category}
                    className="grid grid-cols-[minmax(0,1fr)_160px_140px] items-center border-t border-white/10 px-4 py-3 text-sm"
                  >
                    <div className="font-medium text-slate-100">{item.category}</div>
                    <div className="text-slate-200">{item.amount}</div>
                    <div className="text-slate-300">{item.percent}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid items-stretch gap-6 xl:grid-cols-2">
              <div className="flex h-full flex-col rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="text-lg font-semibold text-white">Show Health</div>

                <div className="mt-3 grid gap-2">
                  {healthItems.map((item) => (
                    <HealthCard
                      key={item.label}
                      label={item.label}
                      value={item.value}
                      tone={item.tone}
                    />
                  ))}
                </div>
              </div>

              <div className="flex h-full flex-col rounded-[24px] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
                <div className="text-lg font-semibold text-white">Flags</div>

                <div className="mt-3 space-y-2">
                  {flags.map((flag) => (
                    <div
                      key={flag.label}
                      className={cn(
                        'rounded-2xl border px-4 py-3 text-sm font-medium',
                        flag.tone === 'success'
                          ? 'border-emerald-500/20 bg-emerald-500/[0.07] text-emerald-200'
                          : flag.tone === 'danger'
                            ? 'border-rose-500/20 bg-rose-500/[0.07] text-rose-200'
                            : 'border-amber-500/20 bg-amber-500/[0.07] text-amber-200'
                      )}
                    >
                      {flag.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ContactCard title="Venue Contacts" contacts={venueContacts} />
            <ContactCard title="Client Contacts" contacts={clientContacts} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <PeopleCard title="Crew" people={crew} />
            <PeopleCard title="Freelancers" people={freelancers} />
          </div>
        </div>
      </div>
    </div>
  )
}