'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'

const VALID_CATEGORIES = new Set(['supply', 'shipping', 'expedited'])

function parseTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function revalidatePresetPaths(categoryKey: string) {
  revalidatePath(`/settings/budget-presets/${categoryKey}`)
  revalidatePath('/settings')
  revalidatePath('/shows')
  revalidatePath('/dashboard')
}

export async function createBudgetPreset(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!isLeadershipRole(ctx.orgRole)) {
    throw new Error('Only leadership can manage default pricing.')
  }

  const categoryKey = parseTrimmed(formData, 'categoryKey').toLowerCase()
  const itemLabel = parseTrimmed(formData, 'itemLabel')
  const defaultCostRaw = parseTrimmed(formData, 'defaultCost')

  if (!VALID_CATEGORIES.has(categoryKey)) {
    throw new Error('Invalid preset category.')
  }

  if (!itemLabel) {
    throw new Error('Item name is required.')
  }

  const defaultCost = Number(defaultCostRaw)
  if (Number.isNaN(defaultCost) || defaultCost < 0) {
    throw new Error('Default cost must be a non-negative number.')
  }

  const { error } = await supabase
    .from('organization_budget_item_presets')
    .upsert(
      {
        organization_id: ctx.organizationId,
        category_key: categoryKey,
        item_label: itemLabel,
        default_cost: defaultCost,
        is_active: true,
      },
      {
        onConflict: 'organization_id,category_key,item_label',
      }
    )

  if (error) throw new Error(error.message)

  revalidatePresetPaths(categoryKey)
}

export async function updateBudgetPreset(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!isLeadershipRole(ctx.orgRole)) {
    throw new Error('Only leadership can manage default pricing.')
  }

  const presetId = parseTrimmed(formData, 'presetId')
  const categoryKey = parseTrimmed(formData, 'categoryKey').toLowerCase()
  const itemLabel = parseTrimmed(formData, 'itemLabel')
  const defaultCostRaw = parseTrimmed(formData, 'defaultCost')

  if (!presetId) throw new Error('Preset id is required.')
  if (!VALID_CATEGORIES.has(categoryKey)) throw new Error('Invalid preset category.')
  if (!itemLabel) throw new Error('Item name is required.')

  const defaultCost = Number(defaultCostRaw)
  if (Number.isNaN(defaultCost) || defaultCost < 0) {
    throw new Error('Default cost must be a non-negative number.')
  }

  const { error } = await supabase
    .from('organization_budget_item_presets')
    .update({
      item_label: itemLabel,
      default_cost: defaultCost,
    })
    .eq('id', presetId)
    .eq('organization_id', ctx.organizationId)

  if (error) throw new Error(error.message)

  revalidatePresetPaths(categoryKey)
}

export async function deleteBudgetPreset(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!isLeadershipRole(ctx.orgRole)) {
    throw new Error('Only leadership can manage default pricing.')
  }

  const presetId = parseTrimmed(formData, 'presetId')
  const categoryKey = parseTrimmed(formData, 'categoryKey').toLowerCase()

  if (!presetId) throw new Error('Preset id is required.')
  if (!VALID_CATEGORIES.has(categoryKey)) throw new Error('Invalid preset category.')

  const { error } = await supabase
    .from('organization_budget_item_presets')
    .delete()
    .eq('id', presetId)
    .eq('organization_id', ctx.organizationId)

  if (error) throw new Error(error.message)

  revalidatePresetPaths(categoryKey)
}