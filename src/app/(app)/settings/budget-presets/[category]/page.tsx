import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'
import { BudgetPresetManager } from '@/components/settings/budget-preset-manager'

type BudgetPreset = {
  id: string
  category_key: string
  item_label: string
  default_cost: number
}

const VALID_CATEGORIES = new Set(['supply', 'shipping', 'expedited'])

export default async function BudgetPresetCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>
}) {
  const { category } = await params
  const categoryKey = category.toLowerCase()

  if (!VALID_CATEGORIES.has(categoryKey)) {
    notFound()
  }

  const ctx = await requireMembershipContext()

  if (!isLeadershipRole(ctx.orgRole)) {
    redirect('/dashboard')
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('organization_budget_item_presets')
    .select('id, category_key, item_label, default_cost')
    .eq('organization_id', ctx.organizationId)
    .eq('category_key', categoryKey)
    .eq('is_active', true)
    .order('item_label', { ascending: true })
    .returns<BudgetPreset[]>()

  if (error) throw new Error(error.message)

  return (
    <BudgetPresetManager
      categoryKey={categoryKey as 'supply' | 'shipping' | 'expedited'}
      presets={data ?? []}
    />
  )
}