import { createClient } from '@/lib/supabase/server'
import { SuppliesPageShell } from '@/components/master-data/supplies/supplies-page-shell'

export default async function SuppliesPage() {
  const supabase = await createClient()

  const { data: supplyItems, error } = await supabase
    .from('supply_items')
    .select(`
      id,
      supply_name,
      unit_type,
      default_cost,
      notes,
      is_active
    `)
    .order('supply_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return <SuppliesPageShell supplyItems={supplyItems ?? []} />
}