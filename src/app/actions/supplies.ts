'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type SupplyState = {
  error?: string
  success?: boolean
}

async function getSupplyEditorContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) throw new Error('Unauthorized')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (error || !profile?.organization_id) {
    throw new Error('Workspace profile not found')
  }

  if (!['admin', 'editor'].includes(profile.role)) {
    throw new Error('You do not have permission to modify supplies')
  }

  return { supabase, profile }
}

function revalidateSupplyPaths() {
  revalidatePath('/supplies')
}

export async function createSupplyItem(
  _prevState: SupplyState,
  formData: FormData
): Promise<SupplyState> {
  try {
    const { supabase, profile } = await getSupplyEditorContext()

    const supplyName = String(formData.get('supplyName') || '').trim()
    const unitType = String(formData.get('unitType') || '').trim() || null
    const defaultCostRaw = String(formData.get('defaultCost') || '').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!supplyName) {
      return { error: 'Supply name is required.' }
    }

    const defaultCost = defaultCostRaw ? Number(defaultCostRaw) : 0

    if (defaultCostRaw && Number.isNaN(defaultCost)) {
      return { error: 'Default cost must be a valid number.' }
    }

    const { error } = await supabase.from('supply_items').insert({
      organization_id: profile.organization_id,
      supply_name: supplyName,
      unit_type: unitType,
      default_cost: defaultCost,
      notes,
      is_active: true,
    })

    if (error) return { error: error.message }

    revalidateSupplyPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create supply item.',
    }
  }
}

export async function updateSupplyItem(
  _prevState: SupplyState,
  formData: FormData
): Promise<SupplyState> {
  try {
    const { supabase, profile } = await getSupplyEditorContext()

    const supplyItemId = String(formData.get('supplyItemId') || '').trim()
    const supplyName = String(formData.get('supplyName') || '').trim()
    const unitType = String(formData.get('unitType') || '').trim() || null
    const defaultCostRaw = String(formData.get('defaultCost') || '').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!supplyItemId || !supplyName) {
      return { error: 'Supply item and supply name are required.' }
    }

    const defaultCost = defaultCostRaw ? Number(defaultCostRaw) : 0

    if (defaultCostRaw && Number.isNaN(defaultCost)) {
      return { error: 'Default cost must be a valid number.' }
    }

    const { error } = await supabase
      .from('supply_items')
      .update({
        supply_name: supplyName,
        unit_type: unitType,
        default_cost: defaultCost,
        notes,
      })
      .eq('id', supplyItemId)
      .eq('organization_id', profile.organization_id)

    if (error) return { error: error.message }

    revalidateSupplyPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update supply item.',
    }
  }
}

export async function toggleSupplyItemActive(formData: FormData) {
  const { supabase, profile } = await getSupplyEditorContext()

  const supplyItemId = String(formData.get('supplyItemId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!supplyItemId) throw new Error('Supply item id is required.')

  const { error } = await supabase
    .from('supply_items')
    .update({ is_active: nextValue })
    .eq('id', supplyItemId)
    .eq('organization_id', profile.organization_id)

  if (error) throw new Error(error.message)

  revalidateSupplyPaths()
}