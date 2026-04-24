import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShowShell } from '@/components/show-detail/show-shell'

type ShowRow = {
  id: string
  show_name: string | null
  show_number: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
  city: string | null
  state: string | null
  estimated_revenue: number | null
  client_id: string | null
  venue_id: string | null
  organization_id: string
  clients:
    | { name: string | null }
    | { name: string | null }[]
    | null
  venues:
    | { name: string | null }
    | { name: string | null }[]
    | null
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
  company_owned_gear_percent: number | null
}

type ShowVendorRow = {
  vendor_id: string | null
}

type VendorRow = {
  id: string
  partner_kind: string | null
}

function pickName(
  value:
    | { name: string | null }
    | { name: string | null }[]
    | null
    | undefined
) {
  if (!value) return null
  if (Array.isArray(value)) return value[0]?.name ?? null
  return value.name ?? null
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function sumBySection(lines: BudgetLineRow[], sectionType: string) {
  return lines.reduce((sum, line) => {
    const normalized = normalizeSectionType(line.section_type)
    return normalized === sectionType
      ? sum + Number(line.subtotal ?? 0)
      : sum
  }, 0)
}

function buildBudgetSnapshot(
  lines: BudgetLineRow[],
  revenue: number,
  companyOwnedGearPercent: number
) {
  const gearTotal = sumBySection(lines, 'gear')
  const w2LaborTotal = sumBySection(lines, 'w2_labor')
  const freelanceLaborTotal = sumBySection(lines, 'freelance_labor')
  const supplyTotal = sumBySection(lines, 'supply')
  const travelTotal = sumBySection(lines, 'travel')
  const shippingTotal = sumBySection(lines, 'shipping')
  const expeditedTotal = sumBySection(lines, 'expedited')
  const companyOwnedGearAllocation = revenue * (companyOwnedGearPercent / 100)

  const totalEstimatedCost =
    gearTotal +
    w2LaborTotal +
    freelanceLaborTotal +
    supplyTotal +
    travelTotal +
    shippingTotal +
    expeditedTotal +
    companyOwnedGearAllocation

  const projectedProfit = revenue - totalEstimatedCost
  const marginPercent = revenue > 0 ? (projectedProfit / revenue) * 100 : 0

  return {
    gear_total: gearTotal,
    w2_labor_total: w2LaborTotal,
    vendor_total: freelanceLaborTotal,
    supply_total: supplyTotal,
    travel_total: travelTotal,
    shipping_total: shippingTotal,
    expedited_total: expeditedTotal,
    company_owned_gear_allocation: companyOwnedGearAllocation,
    company_owned_gear_percent: companyOwnedGearPercent,
    total_estimated_cost: totalEstimatedCost,
    projected_profit: projectedProfit,
    margin_percent: marginPercent,
  }
}

export default async function ShowDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const [
    { data: show, error: showError },
    { data: versions, error: versionsError },
    crewResult,
    { data: showVendors, error: showVendorsError },
    fileResult,
    noteResult,
  ] = await Promise.all([
    supabase
      .from('shows')
      .select(`
        id,
        show_name,
        show_number,
        status,
        start_date,
        end_date,
        city,
        state,
        estimated_revenue,
        client_id,
        venue_id,
        organization_id,
        clients ( name ),
        venues ( name )
      `)
      .eq('id', showId)
      .maybeSingle<ShowRow>(),

    supabase
      .from('budget_versions')
      .select('id, version_type, version_name, is_current, created_at')
      .eq('show_id', showId)
      .is('archived_at', null)
      .order('created_at', { ascending: false })
      .returns<BudgetVersionRow[]>(),

    supabase
      .from('show_memberships')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId),

    supabase
      .from('show_vendors')
      .select('vendor_id')
      .eq('show_id', showId)
      .returns<ShowVendorRow[]>(),

    supabase
      .from('show_files')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId),

    supabase
      .from('show_notes')
      .select('*', { count: 'exact', head: true })
      .eq('show_id', showId),
  ])

  if (showError || !show) {
    notFound()
  }

  if (versionsError) throw new Error(versionsError.message)
  if (showVendorsError) throw new Error(showVendorsError.message)

  const crewCount = crewResult.error ? 0 : crewResult.count ?? 0
  const fileCount = fileResult.error ? 0 : fileResult.count ?? 0
  const noteCount = noteResult.error ? 0 : noteResult.count ?? 0

  const { data: orgFinancialSettings, error: orgFinancialSettingsError } =
    await supabase
      .from('organization_financial_settings')
      .select('company_owned_gear_percent')
      .eq('organization_id', show.organization_id)
      .maybeSingle<FinancialSettings>()

  if (orgFinancialSettingsError) throw new Error(orgFinancialSettingsError.message)

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
  const companyOwnedGearPercent = Number(
    orgFinancialSettings?.company_owned_gear_percent ?? 2.5
  )

  const preSnapshot = buildBudgetSnapshot(preLines, revenue, companyOwnedGearPercent)
  const postSnapshot = postVersion
    ? buildBudgetSnapshot(postLines, revenue, companyOwnedGearPercent)
    : null

  const normalizedStatus = (show.status ?? '').toLowerCase().replace(/[\s-]/g, '_')
  const useActualFinancials =
    normalizedStatus === 'financial_closed' && Boolean(postSnapshot)

  const activeSnapshot = useActualFinancials && postSnapshot ? postSnapshot : preSnapshot

  const vendorIds = Array.from(
    new Set((showVendors ?? []).map((row) => row.vendor_id).filter(Boolean))
  ) as string[]

  let freelancerCount = 0
  let vendorCount = 0

  if (vendorIds.length > 0) {
    const { data: vendors, error: vendorsError } = await supabase
      .from('vendors')
      .select('id, partner_kind')
      .in('id', vendorIds)
      .returns<VendorRow[]>()

    if (!vendorsError) {
      freelancerCount = (vendors ?? []).filter(
        (row) => (row.partner_kind ?? '').toLowerCase() === 'freelancer'
      ).length

      vendorCount = (vendors ?? []).filter(
        (row) => (row.partner_kind ?? '').toLowerCase() === 'business'
      ).length
    }
  }

  return (
    <ShowShell
      show={{
        id: show.id,
        show_name: show.show_name ?? 'Untitled Show',
        show_number: show.show_number,
        status: show.status,
        start_date: show.start_date,
        end_date: show.end_date,
        city: show.city,
        state: show.state,
        venue_name: pickName(show.venues),
        client_name: pickName(show.clients),
      }}
      summary={{
        estimated_revenue: revenue,
        total_estimated_cost: activeSnapshot.total_estimated_cost,
        projected_profit: activeSnapshot.projected_profit,
        margin_percent: activeSnapshot.margin_percent,
        pre: {
          gear_total: preSnapshot.gear_total,
          w2_labor_total: preSnapshot.w2_labor_total,
          vendor_total: preSnapshot.vendor_total,
          supply_total: preSnapshot.supply_total,
          travel_total: preSnapshot.travel_total,
          shipping_total: preSnapshot.shipping_total,
          expedited_total: preSnapshot.expedited_total,
          company_owned_gear_allocation: preSnapshot.company_owned_gear_allocation,
          company_owned_gear_percent: preSnapshot.company_owned_gear_percent,
          total_estimated_cost: preSnapshot.total_estimated_cost,
          projected_profit: preSnapshot.projected_profit,
          margin_percent: preSnapshot.margin_percent,
        },
        post: postSnapshot
          ? {
              gear_total: postSnapshot.gear_total,
              w2_labor_total: postSnapshot.w2_labor_total,
              vendor_total: postSnapshot.vendor_total,
              supply_total: postSnapshot.supply_total,
              travel_total: postSnapshot.travel_total,
              shipping_total: postSnapshot.shipping_total,
              expedited_total: postSnapshot.expedited_total,
              company_owned_gear_allocation: postSnapshot.company_owned_gear_allocation,
              company_owned_gear_percent: postSnapshot.company_owned_gear_percent,
              total_estimated_cost: postSnapshot.total_estimated_cost,
              projected_profit: postSnapshot.projected_profit,
              margin_percent: postSnapshot.margin_percent,
            }
          : null,
      }}
      readiness={{
        crew_count: crewCount,
        freelancer_count: freelancerCount,
        vendor_count: vendorCount,
        note_count: noteCount,
        file_count: fileCount,
      }}
    >
      {children}
    </ShowShell>
  )
}