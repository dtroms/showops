import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewRevenue, canViewShowProfitability } from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'
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
}

type ComparisonRow = {
  key: string
  sectionLabel: string
  lineName: string
  subgroupType: string | null
  preQuantity: number | null
  postQuantity: number | null
  preDays: number | null
  postDays: number | null
  preHours: number | null
  postHours: number | null
  preUnitCost: number | null
  postUnitCost: number | null
  preSubtotal: number
  postSubtotal: number
  variance: number
  variancePercent: number | null
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function getSectionLabel(sectionType: string) {
  const normalized = normalizeSectionType(sectionType)

  switch (normalized) {
    case 'gear':
      return 'Gear'
    case 'w2_labor':
      return 'W2 Labor'
    case 'freelance_labor':
      return 'Freelance Labor'
    case 'supply':
      return 'Supplies'
    case 'travel':
      return 'Travel'
    default:
      return normalized
  }
}

function formatNumber(value: number | null | undefined) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  })
}

function getVariancePercent(preValue: number, postValue: number) {
  if (!preValue) return null
  return Number((((postValue - preValue) / preValue) * 100).toFixed(2))
}

function getLineKey(line: BudgetLineRow) {
  return [
    normalizeSectionType(line.section_type),
    line.subgroup_type ?? '',
    line.line_name.trim().toLowerCase(),
  ].join('::')
}

function sumBySection(lines: BudgetLineRow[], sectionType: string) {
  const normalizedRequestedSection = normalizeSectionType(sectionType)

  return lines.reduce((sum, line) => {
    return normalizeSectionType(line.section_type) === normalizedRequestedSection
      ? sum + Number(line.subtotal ?? 0)
      : sum
  }, 0)
}

function buildComparisonRows(
  preLines: BudgetLineRow[],
  postLines: BudgetLineRow[]
): ComparisonRow[] {
  const preMap = new Map<string, BudgetLineRow>()
  const postMap = new Map<string, BudgetLineRow>()

  for (const line of preLines) preMap.set(getLineKey(line), line)
  for (const line of postLines) postMap.set(getLineKey(line), line)

  const allKeys = Array.from(new Set([...preMap.keys(), ...postMap.keys()]))

  return allKeys
    .map((key) => {
      const preLine = preMap.get(key) ?? null
      const postLine = postMap.get(key) ?? null
      const sourceLine = preLine ?? postLine
      if (!sourceLine) return null

      const preSubtotal = Number(preLine?.subtotal ?? 0)
      const postSubtotal = Number(postLine?.subtotal ?? 0)
      const variance = postSubtotal - preSubtotal

      return {
        key,
        sectionLabel: getSectionLabel(sourceLine.section_type),
        lineName: sourceLine.line_name,
        subgroupType: sourceLine.subgroup_type,
        preQuantity: preLine?.quantity ?? null,
        postQuantity: postLine?.quantity ?? null,
        preDays: preLine?.days ?? null,
        postDays: postLine?.days ?? null,
        preHours: preLine?.hours ?? null,
        postHours: postLine?.hours ?? null,
        preUnitCost: preLine?.unit_cost ?? null,
        postUnitCost: postLine?.unit_cost ?? null,
        preSubtotal,
        postSubtotal,
        variance,
        variancePercent: getVariancePercent(preSubtotal, postSubtotal),
      }
    })
    .filter((row): row is ComparisonRow => Boolean(row))
    .sort((a, b) => {
      if (a.sectionLabel !== b.sectionLabel) return a.sectionLabel.localeCompare(b.sectionLabel)
      return a.lineName.localeCompare(b.lineName)
    })
}

function shellClass() {
  return 'rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
}

function moneyVisible(
  value: number,
  allowed: boolean
) {
  return allowed ? formatCurrency(value) : '—'
}

export default async function ShowBudgetComparisonPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId: membership.id,
    orgRole,
  })

  const canViewRevenueValues = canViewRevenue(access)
  const canViewProfitabilityValues = canViewShowProfitability(access)

  if (!canViewRevenueValues && !canViewProfitabilityValues) {
    notFound()
  }

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, show_name, show_number, estimated_revenue')
    .eq('id', showId)
    .eq('organization_id', organizationId)
    .maybeSingle<ShowRow>()

  if (showError) throw new Error(showError.message)
  if (!show) notFound()

  const { data: versions, error: versionsError } = await supabase
    .from('budget_versions')
    .select('id, version_type, version_name, is_current, created_at')
    .eq('show_id', showId)
    .is('archived_at', null)
    .order('created_at', { ascending: false })

  if (versionsError) throw new Error(versionsError.message)

  const budgetVersions = (versions ?? []) as BudgetVersionRow[]
  const preVersion =
    budgetVersions.find((version) => version.version_type === 'pre' && version.is_current) ??
    budgetVersions.find((version) => version.version_type === 'pre') ??
    null

  const postVersion =
    budgetVersions.find((version) => version.version_type === 'post' && version.is_current) ??
    budgetVersions.find((version) => version.version_type === 'post') ??
    null

  if (!preVersion) {
    return (
      <div className={shellClass()}>
        <h1 className="text-2xl font-semibold text-white">Budget Comparison</h1>
        <p className="mt-3 text-sm text-slate-400">
          This show does not have a pre-show budget yet.
        </p>
      </div>
    )
  }

  if (!postVersion) {
    return (
      <div className="space-y-6">
        <div className={shellClass()}>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Budget Comparison
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {show.show_name ?? 'Untitled Show'}
          </h1>
        </div>

        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
          <h2 className="text-lg font-semibold text-white">No Post-Show Budget Yet</h2>
          <p className="mt-2 text-sm text-slate-400">
            Create a post-show budget from the pre-show version to compare planned vs actual costs.
          </p>
        </div>
      </div>
    )
  }

  const [{ data: preLines, error: preLinesError }, { data: postLines, error: postLinesError }] =
    await Promise.all([
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
          notes
        `)
        .eq('show_id', showId)
        .eq('version_id', preVersion.id)
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),

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
          notes
        `)
        .eq('show_id', showId)
        .eq('version_id', postVersion.id)
        .eq('organization_id', organizationId)
        .order('sort_order', { ascending: true })
        .order('created_at', { ascending: true }),
    ])

  if (preLinesError) throw new Error(preLinesError.message)
  if (postLinesError) throw new Error(postLinesError.message)

  const preBudgetLines = (preLines ?? []) as BudgetLineRow[]
  const postBudgetLines = (postLines ?? []) as BudgetLineRow[]

  const preGear = sumBySection(preBudgetLines, 'gear')
  const postGear = sumBySection(postBudgetLines, 'gear')
  const preW2 = sumBySection(preBudgetLines, 'w2_labor')
  const postW2 = sumBySection(postBudgetLines, 'w2_labor')
  const preFreelance = sumBySection(preBudgetLines, 'freelance_labor')
  const postFreelance = sumBySection(postBudgetLines, 'freelance_labor')
  const preSupply = sumBySection(preBudgetLines, 'supply')
  const postSupply = sumBySection(postBudgetLines, 'supply')
  const preTravel = sumBySection(preBudgetLines, 'travel')
  const postTravel = sumBySection(postBudgetLines, 'travel')

  const preTotal = preGear + preW2 + preFreelance + preSupply + preTravel
  const postTotal = postGear + postW2 + postFreelance + postSupply + postTravel

  const revenue = Number(show.estimated_revenue ?? 0)
  const preProfit = revenue - preTotal
  const postProfit = revenue - postTotal
  const totalVariance = postTotal - preTotal
  const totalVariancePercent = getVariancePercent(preTotal, postTotal)

  const categoryRows = [
    { label: 'Gear', pre: preGear, post: postGear },
    { label: 'W2 Labor', pre: preW2, post: postW2 },
    { label: 'Freelance Labor', pre: preFreelance, post: postFreelance },
    { label: 'Supplies', pre: preSupply, post: postSupply },
    { label: 'Travel', pre: preTravel, post: postTravel },
  ].map((row) => ({
    ...row,
    variance: row.post - row.pre,
    variancePercent: getVariancePercent(row.pre, row.post),
  }))

  const comparisonRows = buildComparisonRows(preBudgetLines, postBudgetLines)

  return (
    <div className="space-y-6">
      <div className={shellClass()}>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Budget Comparison
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          {show.show_name ?? 'Untitled Show'}
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Comparing <span className="font-medium text-white">{preVersion.version_name}</span> to{' '}
          <span className="font-medium text-white">{postVersion.version_name}</span>
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Pre-Show Revenue" value={moneyVisible(revenue, canViewRevenueValues)} />
        <MetricCard label="Post-Show Revenue" value={moneyVisible(revenue, canViewRevenueValues)} />
        <MetricCard
          label="Variance"
          value={
            canViewProfitabilityValues
              ? `${totalVariance >= 0 ? '+' : ''}${formatCurrency(totalVariance)}`
              : '—'
          }
          subValue={
            canViewProfitabilityValues && totalVariancePercent !== null
              ? `${totalVariancePercent >= 0 ? '+' : ''}${totalVariancePercent}%`
              : '—'
          }
        />
        <MetricCard
          label="Profit Change"
          value={`Pre: ${moneyVisible(preProfit, canViewProfitabilityValues)}`}
          subValue={`Post: ${moneyVisible(postProfit, canViewProfitabilityValues)}`}
        />
      </div>

      <div className={shellClass()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Category Comparison</h2>
          <p className="mt-1 text-sm text-slate-400">
            Compare planned vs actual costs by category.
          </p>
        </div>

        <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Pre-Show</th>
                <th className="px-4 py-3 font-semibold">Post-Show</th>
                <th className="px-4 py-3 font-semibold">Variance</th>
                <th className="px-4 py-3 font-semibold">Variance %</th>
              </tr>
            </thead>
            <tbody>
              {categoryRows.map((row) => (
                <tr key={row.label} className="border-t border-white/10">
                  <td className="px-4 py-3 font-medium text-white">{row.label}</td>
                  <td className="px-4 py-3 text-slate-300">
                    {moneyVisible(row.pre, canViewProfitabilityValues)}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {moneyVisible(row.post, canViewProfitabilityValues)}
                  </td>
                  <td className="px-4 py-3 font-medium text-white">
                    {canViewProfitabilityValues
                      ? `${row.variance >= 0 ? '+' : ''}${formatCurrency(row.variance)}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-300">
                    {canViewProfitabilityValues && row.variancePercent !== null
                      ? `${row.variancePercent >= 0 ? '+' : ''}${row.variancePercent}%`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className={shellClass()}>
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Line Item Comparison</h2>
          <p className="mt-1 text-sm text-slate-400">
            Compare line items across the pre-show and post-show budgets.
          </p>
        </div>

        {!comparisonRows.length ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            No comparable budget lines found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/[0.02]">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold">Line Item</th>
                  <th className="px-4 py-3 font-semibold">Pre Details</th>
                  <th className="px-4 py-3 font-semibold">Post Details</th>
                  <th className="px-4 py-3 font-semibold">Pre Total</th>
                  <th className="px-4 py-3 font-semibold">Post Total</th>
                  <th className="px-4 py-3 font-semibold">Variance</th>
                  <th className="px-4 py-3 font-semibold">Variance %</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.key} className="border-t border-white/10 align-top">
                    <td className="px-4 py-3 font-medium text-white">
                      <div>{row.sectionLabel}</div>
                      {row.subgroupType ? (
                        <div className="text-xs font-normal text-slate-500">
                          {row.subgroupType}
                        </div>
                      ) : null}
                    </td>

                    <td className="px-4 py-3 text-white">{row.lineName}</td>

                    <td className="px-4 py-3 text-slate-400">
                      <div>Qty: {formatNumber(row.preQuantity)}</div>
                      <div>Days: {formatNumber(row.preDays)}</div>
                      <div>Hours: {formatNumber(row.preHours)}</div>
                      <div>
                        Rate:{' '}
                        {canViewProfitabilityValues
                          ? formatCurrency(row.preUnitCost ?? 0)
                          : '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3 text-slate-400">
                      <div>Qty: {formatNumber(row.postQuantity)}</div>
                      <div>Days: {formatNumber(row.postDays)}</div>
                      <div>Hours: {formatNumber(row.postHours)}</div>
                      <div>
                        Rate:{' '}
                        {canViewProfitabilityValues
                          ? formatCurrency(row.postUnitCost ?? 0)
                          : '—'}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-medium text-white">
                      {moneyVisible(row.preSubtotal, canViewProfitabilityValues)}
                    </td>

                    <td className="px-4 py-3 font-medium text-white">
                      {moneyVisible(row.postSubtotal, canViewProfitabilityValues)}
                    </td>

                    <td className="px-4 py-3 font-medium text-white">
                      {canViewProfitabilityValues
                        ? `${row.variance >= 0 ? '+' : ''}${formatCurrency(row.variance)}`
                        : '—'}
                    </td>

                    <td className="px-4 py-3 text-slate-300">
                      {canViewProfitabilityValues && row.variancePercent !== null
                        ? `${row.variancePercent >= 0 ? '+' : ''}${row.variancePercent}%`
                        : '—'}
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

function MetricCard({
  label,
  value,
  subValue,
}: {
  label: string
  value: string
  subValue?: string
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">{value}</p>
      {subValue ? <p className="mt-1 text-sm text-slate-400">{subValue}</p> : null}
    </div>
  )
}