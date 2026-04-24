import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { BudgetSheetSection } from '@/components/show-detail/budget-sheet-section'
import { GearBudgetSection } from '@/components/show-detail/gear-budget-section'
import { FreelancerRatingModal } from '@/components/budget/freelancer-rating-modal'
import { createPostShowBudgetFromPreShow } from '@/app/actions/budget-versions'

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
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  days: number | null
  hours: number | null
  unit_cost: number | null
  subtotal: number | null
  calculation_type: string | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  overtime_rate: number | null
  notes: string | null
  reference_id: string | null
}

type ShowVendorOption = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
  suggested_days?: number | null
}

type BudgetTarget = {
  category_key: string
  target_percent: number
  warning_percent: number | null
}

type FinancialSettings = {
  company_owned_gear_percent: number
}

type FreelancerForRating = {
  vendor_id: string
  vendor_name: string
  service_type: string | null
}

type BudgetPreset = {
  id: string
  category_key: string
  item_label: string
  default_cost: number
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function toneForMargin(value: number): 'default' | 'success' | 'warning' | 'danger' {
  if (value < 45) return 'danger'
  if (value < 50) return 'warning'
  if (value >= 60) return 'success'
  return 'default'
}

function cardToneClass(tone: 'default' | 'success' | 'warning' | 'danger') {
  if (tone === 'success') return 'border-emerald-500/20 bg-emerald-500/[0.07]'
  if (tone === 'warning') return 'border-amber-500/20 bg-amber-500/[0.07]'
  if (tone === 'danger') return 'border-rose-500/20 bg-rose-500/[0.07]'
  return 'border-white/10 bg-white/[0.03]'
}

function valueToneClass(tone: 'default' | 'success' | 'warning' | 'danger') {
  if (tone === 'success') return 'text-emerald-300'
  if (tone === 'warning') return 'text-amber-300'
  if (tone === 'danger') return 'text-rose-300'
  return 'text-white'
}

function getShowDayCount(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 1

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1

  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  return Math.max(1, diffDays)
}

async function createPostShowBudgetAction(formData: FormData) {
  'use server'

  const showId = String(formData.get('showId') || '').trim()
  const organizationId = String(formData.get('organizationId') || '').trim()

  if (!showId || !organizationId) return

  const result = await createPostShowBudgetFromPreShow({
    showId,
    organizationId,
  })

  if (result?.versionId) {
    redirect(
      `/shows/${showId}/budget-sheet?type=post&version=${result.versionId}&rate=1`
    )
  }

  redirect(`/shows/${showId}/budget-sheet`)
}

function BreakdownChart({
  rows,
  totalRevenue,
}: {
  rows: Array<{
    label: string
    amount: number
    lineCount: number
    percentOfRevenue: number
  }>
  totalRevenue: number
}) {
  const maxAmount = Math.max(...rows.map((row) => row.amount), 1)

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="mb-5">
        <h3 className="text-lg font-semibold text-white">Category Breakdown</h3>
        <p className="mt-1 text-sm text-slate-400">
          Budget distribution across active categories.
        </p>
      </div>

      <div className="space-y-4">
        {rows.map((row) => (
          <div key={row.label}>
            <div className="mb-2 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-white">{row.label}</p>
                <p className="text-xs text-slate-500">
                  {row.lineCount} line item{row.lineCount === 1 ? '' : 's'} ·{' '}
                  {formatPercent(row.percentOfRevenue)}
                </p>
              </div>

              <div className="text-right">
                <p className="text-sm font-semibold text-white">
                  {formatCurrency(row.amount)}
                </p>
              </div>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-white/5">
              <div
                className="h-full rounded-full bg-white/80"
                style={{
                  width: `${Math.max((row.amount / maxAmount) * 100, row.amount > 0 ? 4 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Revenue
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatCurrency(totalRevenue)}
            </p>
          </div>

          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Total Section Spend
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {formatCurrency(rows.reduce((sum, row) => sum + row.amount, 0))}
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default async function BudgetSheetPage({
  params,
  searchParams,
}: {
  params: Promise<{ showId: string }>
  searchParams?: Promise<{ version?: string; type?: string; rate?: string }>
}) {
  const { showId } = await params
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const requestedVersionId = resolvedSearchParams?.version?.trim() || null
  const requestedVersionType = resolvedSearchParams?.type === 'post' ? 'post' : 'pre'
  const shouldPromptFreelancerRatings = resolvedSearchParams?.rate === '1'

  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    notFound()
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error(profileError?.message || 'Organization not found.')
  }

  const organizationId = profile.organization_id as string

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, show_name, estimated_revenue, start_date, end_date')
    .eq('id', showId)
    .maybeSingle()

  if (showError || !show) {
    notFound()
  }

  const totalRevenue = Number(show.estimated_revenue ?? 0)
  const showDayCount = getShowDayCount(show.start_date ?? null, show.end_date ?? null)

  const { data: budgetVersions, error: budgetVersionsError } = await supabase
    .from('budget_versions')
    .select('id, version_type, version_name, is_current, created_at')
    .eq('show_id', showId)
    .is('archived_at', null)
    .order('version_type', { ascending: true })
    .order('created_at', { ascending: false })

  if (budgetVersionsError) {
    throw new Error(budgetVersionsError.message)
  }

  const versions = (budgetVersions ?? []) as BudgetVersion[]

  let activeVersion =
    versions.find((version) => version.id === requestedVersionId) ??
    versions.find(
      (version) =>
        version.version_type === requestedVersionType && version.is_current
    ) ??
    versions.find((version) => version.version_type === requestedVersionType) ??
    versions[0] ??
    null

  if (!activeVersion) {
    const { data: generatedVersionId, error: versionError } = await supabase.rpc(
      'get_or_create_current_budget_version',
      {
        target_show_id: showId,
        target_version_type: requestedVersionType,
      }
    )

    if (versionError || !generatedVersionId) {
      throw new Error(versionError?.message || 'Failed to resolve budget version.')
    }

    const { data: generatedVersion, error: generatedVersionError } = await supabase
      .from('budget_versions')
      .select('id, version_type, version_name, is_current, created_at')
      .eq('id', generatedVersionId)
      .single()

    if (generatedVersionError || !generatedVersion) {
      throw new Error(
        generatedVersionError?.message || 'Failed to load resolved budget version.'
      )
    }

    activeVersion = generatedVersion as BudgetVersion
  }

  const [
    { data: items, error: itemsError },
    { data: showVendors, error: showVendorsError },
    { data: budgetTargets, error: budgetTargetsError },
    { data: financialSettings, error: financialSettingsError },
    { data: showVendorRatingsPromptRows, error: ratingsPromptRowsError },
    { data: presetRows, error: presetRowsError },
  ] = await Promise.all([
    supabase
      .from('show_budget_line_items')
      .select(`
        id,
        version_id,
        section_type,
        subgroup_type,
        line_name,
        quantity,
        days,
        hours,
        unit_cost,
        subtotal,
        calculation_type,
        overtime_enabled,
        overtime_hours,
        overtime_rate,
        notes,
        reference_id
      `)
      .eq('show_id', showId)
      .eq('version_id', activeVersion.id)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true }),

    supabase
      .from('show_vendors')
      .select(`
        id,
        vendor_id,
        vendor_name_snapshot,
        service_type_snapshot,
        default_day_rate_snapshot
      `)
      .eq('show_id', showId)
      .order('vendor_name_snapshot', { ascending: true }),

    supabase
      .from('organization_budget_targets')
      .select(`
        category_key,
        target_percent,
        warning_percent
      `)
      .eq('organization_id', organizationId),

    supabase
      .from('organization_financial_settings')
      .select(`
        company_owned_gear_percent
      `)
      .eq('organization_id', organizationId)
      .maybeSingle(),

    shouldPromptFreelancerRatings
      ? supabase
          .from('show_vendors')
          .select(`
            vendor_id,
            vendor_name_snapshot,
            service_type_snapshot,
            vendors (
              partner_kind,
              freelancer_name,
              vendor_name,
              service_type
            )
          `)
          .eq('show_id', showId)
      : Promise.resolve({ data: [], error: null } as any),

    supabase
      .from('organization_budget_item_presets')
      .select('id, category_key, item_label, default_cost')
      .eq('organization_id', organizationId)
      .returns<BudgetPreset[]>(),
  ])

  if (itemsError) throw new Error(itemsError.message)
  if (showVendorsError) throw new Error(showVendorsError.message)
  if (budgetTargetsError) throw new Error(budgetTargetsError.message)
  if (financialSettingsError) throw new Error(financialSettingsError.message)
  if (ratingsPromptRowsError) throw new Error(ratingsPromptRowsError.message)
  if (presetRowsError) throw new Error(presetRowsError.message)

  const allItems = (items ?? []) as BudgetLineItem[]
  const availableShowVendors = ((showVendors ?? []) as ShowVendorOption[]).map((vendor) => ({
    ...vendor,
    suggested_days: showDayCount,
  }))
  const targets = (budgetTargets ?? []) as BudgetTarget[]
  const orgFinancialSettings = financialSettings as FinancialSettings | null
  const presets = (presetRows ?? []) as BudgetPreset[]

  const freelancersForRating: FreelancerForRating[] = shouldPromptFreelancerRatings
    ? ((showVendorRatingsPromptRows ?? []) as any[])
        .filter((row) => {
          const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors
          return vendor?.partner_kind === 'freelancer'
        })
        .map((row) => {
          const vendor = Array.isArray(row.vendors) ? row.vendors[0] : row.vendors
          return {
            vendor_id: String(row.vendor_id),
            vendor_name:
              vendor?.freelancer_name ||
              row.vendor_name_snapshot ||
              vendor?.vendor_name ||
              'Unnamed Freelancer',
            service_type:
              row.service_type_snapshot || vendor?.service_type || null,
          }
        })
        .filter(
          (row, index, array) =>
            row.vendor_id &&
            array.findIndex((item) => item.vendor_id === row.vendor_id) === index
        )
    : []

  const companyOwnedGearPercent = Number(
    orgFinancialSettings?.company_owned_gear_percent ?? 2.5
  )
  const companyOwnedGearAllocation = totalRevenue * (companyOwnedGearPercent / 100)

  const getSectionItems = (sectionType: string, subgroupType?: string) =>
    allItems.filter((item) => {
      const normalizedItemSectionType = normalizeSectionType(item.section_type)
      const normalizedRequestedSectionType = normalizeSectionType(sectionType)

      if (normalizedItemSectionType !== normalizedRequestedSectionType) return false
      if (typeof subgroupType !== 'undefined') return item.subgroup_type === subgroupType
      return true
    })

  const sumSubtotal = (sectionItems: BudgetLineItem[]) =>
    sectionItems.reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0)

  const gearItems = getSectionItems('gear')
  const w2LaborItems = getSectionItems('w2_labor')
  const freelanceLaborItems = getSectionItems('freelance_labor')
  const supplyItems = getSectionItems('supply')
  const travelItems = getSectionItems('travel')
  const shippingItems = getSectionItems('shipping')
  const expeditedItems = getSectionItems('expedited')

  const gearSubtotal = sumSubtotal(gearItems)
  const w2LaborSubtotal = sumSubtotal(w2LaborItems)
  const freelanceLaborSubtotal = sumSubtotal(freelanceLaborItems)
  const supplySubtotal = sumSubtotal(supplyItems)
  const travelSubtotal = sumSubtotal(travelItems)
  const shippingSubtotal = sumSubtotal(shippingItems)
  const expeditedSubtotal = sumSubtotal(expeditedItems)

  const totalCost =
    gearSubtotal +
    companyOwnedGearAllocation +
    w2LaborSubtotal +
    freelanceLaborSubtotal +
    supplySubtotal +
    travelSubtotal +
    shippingSubtotal +
    expeditedSubtotal

  const totalProfit = totalRevenue - totalCost
  const totalMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0

  const postVersion =
    versions.find((version) => version.version_type === 'post' && version.is_current) ??
    versions.find((version) => version.version_type === 'post') ??
    null

  const exportCurrentHref = `/api/shows/${showId}/budget-export?version=${activeVersion.id}`

  const breakdownRows = [
    {
      label: 'Gear',
      amount: gearSubtotal,
      lineCount: gearItems.length,
      percentOfRevenue: totalRevenue > 0 ? (gearSubtotal / totalRevenue) * 100 : 0,
    },
    {
      label: 'Allocated Gear',
      amount: companyOwnedGearAllocation,
      lineCount: 1,
      percentOfRevenue:
        totalRevenue > 0 ? (companyOwnedGearAllocation / totalRevenue) * 100 : 0,
    },
    {
      label: 'W2 Labor',
      amount: w2LaborSubtotal,
      lineCount: w2LaborItems.length,
      percentOfRevenue: totalRevenue > 0 ? (w2LaborSubtotal / totalRevenue) * 100 : 0,
    },
    {
      label: 'Freelance Labor',
      amount: freelanceLaborSubtotal,
      lineCount: freelanceLaborItems.length,
      percentOfRevenue:
        totalRevenue > 0 ? (freelanceLaborSubtotal / totalRevenue) * 100 : 0,
    },
    {
      label: 'Supplies',
      amount: supplySubtotal,
      lineCount: supplyItems.length,
      percentOfRevenue: totalRevenue > 0 ? (supplySubtotal / totalRevenue) * 100 : 0,
    },
    {
      label: 'Travel',
      amount: travelSubtotal,
      lineCount: travelItems.length,
      percentOfRevenue: totalRevenue > 0 ? (travelSubtotal / totalRevenue) * 100 : 0,
    },
    {
      label: 'Shipping',
      amount: shippingSubtotal,
      lineCount: shippingItems.length,
      percentOfRevenue: totalRevenue > 0 ? (shippingSubtotal / totalRevenue) * 100 : 0,
    },
    {
      label: 'Expedited',
      amount: expeditedSubtotal,
      lineCount: expeditedItems.length,
      percentOfRevenue:
        totalRevenue > 0 ? (expeditedSubtotal / totalRevenue) * 100 : 0,
    },
  ]

  return (
    <div className="space-y-6">
      {shouldPromptFreelancerRatings && freelancersForRating.length ? (
        <FreelancerRatingModal
          showId={showId}
          freelancers={freelancersForRating}
        />
      ) : null}

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight text-white">
                Budget
              </h2>

              <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-300">
                {activeVersion.version_name}
              </span>
            </div>

            <p className="mt-2 text-sm text-slate-400">
              {show.show_name || 'Untitled Show'} ·{' '}
              {activeVersion.version_type === 'pre'
                ? 'Pre-Show Budget'
                : 'Post-Show Budget'}
            </p>
          </div>

          <div className="flex flex-col gap-3 xl:items-end">
            <div className="flex flex-wrap items-center gap-2">
              {versions.length > 1
                ? versions.map((version) => (
                    <Link
                      key={version.id}
                      href={`/shows/${showId}/budget-sheet?type=${version.version_type}&version=${version.id}`}
                      className={`rounded-2xl px-4 py-2 text-sm font-medium transition ${
                        version.id === activeVersion.id
                          ? 'bg-white text-slate-950'
                          : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
                      }`}
                    >
                      {version.version_name}
                    </Link>
                  ))
                : null}
            </div>

            <div className="flex flex-wrap gap-2">
              {!postVersion ? (
                <form action={createPostShowBudgetAction}>
                  <input type="hidden" name="showId" value={showId} />
                  <input type="hidden" name="organizationId" value={organizationId} />
                  <button
                    type="submit"
                    className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950"
                  >
                    Create Post
                  </button>
                </form>
              ) : null}

              <a
                href={exportCurrentHref}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-white/10"
              >
                Export
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-[24px] border p-5 ${cardToneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Revenue
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(totalRevenue)}
          </div>
        </div>

        <div className={`rounded-[24px] border p-5 ${cardToneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Cost
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {formatCurrency(totalCost)}
          </div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${cardToneClass(
            totalProfit >= 0 ? 'success' : 'danger'
          )}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Profit
          </div>
          <div
            className={`mt-3 text-2xl font-semibold tracking-tight ${valueToneClass(
              totalProfit >= 0 ? 'success' : 'danger'
            )}`}
          >
            {formatCurrency(totalProfit)}
          </div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${cardToneClass(
            toneForMargin(totalMargin)
          )}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Margin
          </div>
          <div
            className={`mt-3 text-2xl font-semibold tracking-tight ${valueToneClass(
              toneForMargin(totalMargin)
            )}`}
          >
            {formatPercent(totalMargin)}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-lg font-semibold text-white">
              Company-Owned Gear Allocation
            </p>
            <p className="mt-1 text-sm text-slate-400">
              Separate from sub-rented Gear costs. Based on total show revenue and included in total cost/profit.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Revenue
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(totalRevenue)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Rate
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatPercent(companyOwnedGearPercent)}
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Allocation
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatCurrency(companyOwnedGearAllocation)}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_520px]">
        <div className="space-y-4">
          <GearBudgetSection
            showId={showId}
            items={gearItems}
            subtotal={gearSubtotal}
            totalRevenue={totalRevenue}
            budgetTargets={targets}
          />

          <BudgetSheetSection
            showId={showId}
            title="W2 Labor"
            sectionType="w2_labor"
            subtotal={w2LaborSubtotal}
            totalRevenue={totalRevenue}
            items={w2LaborItems}
            budgetTargets={targets}
          />

          <BudgetSheetSection
            showId={showId}
            title="Freelance Labor"
            sectionType="vendor"
            subtotal={freelanceLaborSubtotal}
            totalRevenue={totalRevenue}
            items={freelanceLaborItems}
            showVendors={availableShowVendors}
            budgetTargets={targets}
          />

          <BudgetSheetSection
            showId={showId}
            title="Supplies"
            sectionType="supply"
            subtotal={supplySubtotal}
            totalRevenue={totalRevenue}
            items={supplyItems}
            budgetTargets={targets}
            presets={presets.filter((preset) => preset.category_key === 'supply')}
            canManageOrgPresets
          />

          <BudgetSheetSection
            showId={showId}
            title="Travel"
            sectionType="travel"
            subtotal={travelSubtotal}
            totalRevenue={totalRevenue}
            items={travelItems}
            showVendors={availableShowVendors}
            budgetTargets={targets}
          />

          <BudgetSheetSection
            showId={showId}
            title="Shipping"
            sectionType="shipping"
            subtotal={shippingSubtotal}
            totalRevenue={totalRevenue}
            items={shippingItems}
            budgetTargets={targets}
            presets={presets.filter((preset) => preset.category_key === 'shipping')}
            canManageOrgPresets
          />

          <BudgetSheetSection
            showId={showId}
            title="Expedited"
            sectionType="expedited"
            subtotal={expeditedSubtotal}
            totalRevenue={totalRevenue}
            items={expeditedItems}
            budgetTargets={targets}
            presets={presets.filter((preset) => preset.category_key === 'expedited')}
            canManageOrgPresets
          />
        </div>

        <div className="xl:sticky xl:top-[220px] xl:self-start">
          <BreakdownChart rows={breakdownRows} totalRevenue={totalRevenue} />
        </div>
      </div>
    </div>
  )
}