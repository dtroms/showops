import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { BudgetSheetSection } from '@/components/show-detail/budget-sheet-section'
import { GearBudgetSection } from '@/components/show-detail/gear-budget-section'

type BudgetLineItem = {
  id: string
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  unit_cost: number | null
  subtotal: number | null
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
}

export default async function BudgetSheetPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id')
    .eq('id', showId)
    .maybeSingle()

  if (showError || !show) {
    notFound()
  }

  const [{ data: items, error: itemsError }, { data: showVendors }] =
    await Promise.all([
      supabase
        .from('show_budget_line_items')
        .select(`
          id,
          section_type,
          subgroup_type,
          line_name,
          quantity,
          unit_cost,
          subtotal,
          overtime_enabled,
          overtime_hours,
          overtime_rate,
          notes,
          reference_id
        `)
        .eq('show_id', showId)
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
    ])

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const allItems = (items ?? []) as BudgetLineItem[]
  const availableShowVendors = (showVendors ?? []) as ShowVendorOption[]

  const getSectionItems = (sectionType: string, subgroupType?: string) =>
    allItems.filter((item) => {
      if (item.section_type !== sectionType) return false
      if (typeof subgroupType !== 'undefined') return item.subgroup_type === subgroupType
      return true
    })

  const sumSubtotal = (sectionItems: BudgetLineItem[]) =>
    sectionItems.reduce((sum, item) => sum + Number(item.subtotal ?? 0), 0)

  const gearItems = getSectionItems('gear')
  const vendorItems = getSectionItems('vendor')
  const supplyItems = getSectionItems('supply')
  const travelItems = getSectionItems('travel')

  return (
    <div className="space-y-6">
      <GearBudgetSection
        showId={showId}
        items={gearItems}
        subtotal={sumSubtotal(gearItems)}
      />

      <BudgetSheetSection
         showId={showId}
         title="Freelance Labor"
         sectionType="vendor"
         subtotal={sumSubtotal(vendorItems)}
         items={vendorItems}
         showVendors={availableShowVendors}
      />

      <BudgetSheetSection
        showId={showId}
        title="Supplies"
        sectionType="supply"
        subtotal={sumSubtotal(supplyItems)}
        items={supplyItems}
      />

      <BudgetSheetSection
        showId={showId}
        title="Travel"
        sectionType="travel"
        subtotal={sumSubtotal(travelItems)}
        items={travelItems}
        showVendors={availableShowVendors}
      />
    </div>
  )
}