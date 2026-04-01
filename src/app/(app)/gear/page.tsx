import { createClient } from '@/lib/supabase/server'
import { GearPageShell } from '@/components/master-data/gear/gear-page-shell'

export default async function GearPage() {
  const supabase = await createClient()

  const { data: gearItems, error } = await supabase
    .from('gear_items')
    .select(`
      id,
      item_name,
      internal_cost,
      notes,
      is_active,
      gear_categories ( name ),
      gear_subcategories ( name )
    `)
    .order('item_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const normalizedItems = (gearItems ?? []).map((item: any) => ({
    id: item.id,
    item_name: item.item_name,
    internal_cost: item.internal_cost,
    notes: item.notes,
    is_active: item.is_active,
    category_name: Array.isArray(item.gear_categories)
      ? item.gear_categories[0]?.name ?? ''
      : item.gear_categories?.name ?? '',
    subcategory_name: Array.isArray(item.gear_subcategories)
      ? item.gear_subcategories[0]?.name ?? ''
      : item.gear_subcategories?.name ?? '',
  }))

  return <GearPageShell gearItems={normalizedItems} />
}