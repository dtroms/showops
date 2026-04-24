import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { resolveShowAccess } from '@/lib/show-access'
import {
  canViewRevenue,
  canViewShowProfitability,
} from '@/lib/permissions'
import { formatCurrency } from '@/lib/format'

type ShowRow = {
  id: string
  show_name: string | null
  show_number: string | null
  estimated_revenue: number | null
}

type BudgetVersionRow = {
  id: string
  version_type: 'pre' | 'post'
  version_name: string
  is_current: boolean
  created_at: string
}

type BudgetLineRow = {
  id: string
  version_id: string
  section_type: string
  subtotal: number | null
}

type FinancialSettings = {
  company_owned_gear_percent: number
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function sumBySection(lines: BudgetLineRow[], sectionType: string) {
  return lines.reduce((sum, item) => {
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

function toneForMargin(margin: number): 'default' | 'success' | 'warning' | 'danger' {
  if (margin < 45) return 'danger'
  if (margin < 50) return 'warning'
  if (margin >= 60) return 'success'
  return 'default'
}

function toneForProfit(profit: number): 'default' | 'success' | 'warning' | 'danger' {
  return profit >= 0 ? 'success' : 'danger'
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

export default async function ShowBudgetSummaryPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const [{ data: show, error: showError }, { access }, { data: financialSettings, error: financialSettingsError }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, show_name, show_number, estimated_revenue')
      .eq('id', showId)
      .eq('organization_id', organizationId)
      .maybeSingle<ShowRow>(),
    resolveShowAccess({
      supabase,
      showId,
      organizationId,
      membershipId: membership.id,
      orgRole,
    }),
    supabase
      .from('organization_financial_settings')
      .select('company_owned_gear_percent')
      .eq('organization_id', organizationId)
      .maybeSingle<FinancialSettings>(),
  ])

  if (showError) throw new Error(showError.message)
  if (financialSettingsError) throw new Error(financialSettingsError.message)
  if (!show) notFound()

  const canViewRevenueValues = canViewRevenue(access)
  const canViewProfitabilityValues = canViewShowProfitability(access)

  const { data: versions, error: versionsError } = await supabase
    .from('budget_versions')
    .select('id, version_type, version_name, is_current, created_at')
    .eq('show_id', showId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })
    .returns<BudgetVersionRow[]>()

  if (versionsError) throw new Error(versionsError.message)

  const budgetVersions = versions ?? []

  const preVersion =
    budgetVersions.find((version) => version.version_type === 'pre' && version.is_current) ??
    budgetVersions.find((version) => version.version_type === 'pre') ??
    null

  const postVersion =
    budgetVersions.find((version) => version.version_type === 'post' && version.is_current) ??
    budgetVersions.find((version) => version.version_type === 'post') ??
    null

  const versionIds = [preVersion?.id, postVersion?.id].filter(Boolean) as string[]

  let allBudgetLines: BudgetLineRow[] = []

  if (versionIds.length > 0) {
    const { data: lines, error: linesError } = await supabase
      .from('show_budget_line_items')
      .select('id, version_id, section_type, subtotal')
      .eq('show_id', showId)
      .in('version_id', versionIds)
      .returns<BudgetLineRow[]>()

    if (linesError) throw new Error(linesError.message)
    allBudgetLines = lines ?? []
  }

  const preLines = preVersion
    ? allBudgetLines.filter((line) => line.version_id === preVersion.id)
    : []

  const postLines = postVersion
    ? allBudgetLines.filter((line) => line.version_id === postVersion.id)
    : []

  const revenue = Number(show.estimated_revenue ?? 0)
  const companyOwnedGearPercent = Number(financialSettings?.company_owned_gear_percent ?? 2.5)
  const allocation = revenue * (companyOwnedGearPercent / 100)

  const preGear = sumBySection(preLines, 'gear')
  const preW2 = sumBySection(preLines, 'w2_labor')
  const preFreelance = sumBySection(preLines, 'freelance_labor')
  const preSupply = sumBySection(preLines, 'supply')
  const preTravel = sumBySection(preLines, 'travel')
  const preShipping = sumBySection(preLines, 'shipping')
  const preExpedited = sumBySection(preLines, 'expedited')
  const preTotal =
    preGear + allocation + preW2 + preFreelance + preSupply + preTravel + preShipping + preExpedited
  const preProfit = revenue - preTotal
  const preMargin = getMarginPercent(revenue, preTotal)

  const postGear = sumBySection(postLines, 'gear')
  const postW2 = sumBySection(postLines, 'w2_labor')
  const postFreelance = sumBySection(postLines, 'freelance_labor')
  const postSupply = sumBySection(postLines, 'supply')
  const postTravel = sumBySection(postLines, 'travel')
  const postShipping = sumBySection(postLines, 'shipping')
  const postExpedited = sumBySection(postLines, 'expedited')
  const postTotal =
    postGear + allocation + postW2 + postFreelance + postSupply + postTravel + postShipping + postExpedited
  const postProfit = revenue - postTotal
  const postMargin = getMarginPercent(revenue, postTotal)

  const currentMode =
    postVersion && access.showStatus === 'financial_closed' ? 'actual' : 'projected'

  const activeCost = currentMode === 'actual' ? postTotal : preTotal
  const activeProfit = currentMode === 'actual' ? postProfit : preProfit
  const activeMargin = currentMode === 'actual' ? postMargin : preMargin

  const rows = [
    { label: 'Gear', pre: preGear, post: postGear },
    { label: 'Allocated Gear', pre: allocation, post: allocation },
    { label: 'W2 Labor', pre: preW2, post: postW2 },
    { label: 'Freelance Labor', pre: preFreelance, post: postFreelance },
    { label: 'Supplies', pre: preSupply, post: postSupply },
    { label: 'Travel', pre: preTravel, post: postTravel },
    { label: 'Shipping', pre: preShipping, post: postShipping },
    { label: 'Expedited', pre: preExpedited, post: postExpedited },
  ]

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className={`rounded-[24px] border p-5 ${cardToneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Revenue
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {canViewRevenueValues ? formatCurrency(revenue) : '—'}
          </div>
        </div>

        <div className={`rounded-[24px] border p-5 ${cardToneClass('default')}`}>
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Cost
          </div>
          <div className="mt-3 text-2xl font-semibold tracking-tight text-white">
            {canViewProfitabilityValues ? formatCurrency(activeCost) : '—'}
          </div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${cardToneClass(
            toneForProfit(activeProfit)
          )}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Profit
          </div>
          <div
            className={`mt-3 text-2xl font-semibold tracking-tight ${valueToneClass(
              toneForProfit(activeProfit)
            )}`}
          >
            {canViewProfitabilityValues ? formatCurrency(activeProfit) : '—'}
          </div>
        </div>

        <div
          className={`rounded-[24px] border p-5 ${cardToneClass(
            toneForMargin(activeMargin)
          )}`}
        >
          <div className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Margin
          </div>
          <div
            className={`mt-3 text-2xl font-semibold tracking-tight ${valueToneClass(
              toneForMargin(activeMargin)
            )}`}
          >
            {canViewProfitabilityValues ? formatPercent(activeMargin) : '—'}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="text-lg font-semibold text-white">Budget Summary</div>
          <div className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-xs font-semibold text-slate-300">
            {currentMode === 'actual' ? 'Actual' : 'Projected'}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Company-Owned Gear Rate
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {formatPercent(companyOwnedGearPercent)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Allocation Amount
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {canViewProfitabilityValues ? formatCurrency(allocation) : '—'}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                Revenue Basis
              </p>
              <p className="mt-1 text-sm font-semibold text-white">
                {canViewRevenueValues ? formatCurrency(revenue) : '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10">
          <div className="grid grid-cols-[minmax(0,1fr)_160px_160px_140px_140px] bg-white/[0.03] px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            <div>Category</div>
            <div>Pre-Show</div>
            <div>Post-Show</div>
            <div>Active</div>
            <div>% of Revenue</div>
          </div>

          {rows.map((row) => {
            const activeAmount = currentMode === 'actual' ? row.post : row.pre
            const percentOfRevenue = revenue > 0 ? (activeAmount / revenue) * 100 : 0

            return (
              <div
                key={row.label}
                className="grid grid-cols-[minmax(0,1fr)_160px_160px_140px_140px] items-center border-t border-white/10 px-4 py-3 text-sm"
              >
                <div className="font-medium text-white">{row.label}</div>
                <div className="text-slate-300">
                  {canViewProfitabilityValues ? formatCurrency(row.pre) : '—'}
                </div>
                <div className="text-slate-300">
                  {postVersion && canViewProfitabilityValues ? formatCurrency(row.post) : '—'}
                </div>
                <div className="font-medium text-white">
                  {canViewProfitabilityValues ? formatCurrency(activeAmount) : '—'}
                </div>
                <div className="text-slate-300">
                  {canViewRevenueValues && canViewProfitabilityValues
                    ? formatPercent(percentOfRevenue)
                    : '—'}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}