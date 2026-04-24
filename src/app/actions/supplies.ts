'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { isOrgAdminRole } from '@/lib/permissions'

export type SupplyState = {
  error?: string
  success?: boolean
}

function canEditSupplies(role: string | null | undefined) {
  return isOrgAdminRole(role as any) || role === 'warehouse_admin'
}

async function getSupplyEditorContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!canEditSupplies(ctx.orgRole)) {
    throw new Error('You do not have permission to modify supplies')
  }

  return { supabase, organizationId: ctx.organizationId }
}

function revalidateSupplyPaths() {
  revalidatePath('/supplies')
}

export async function createSupplyItem(
  _prevState: SupplyState,
  formData: FormData
): Promise<SupplyState> {
  try {
    const { supabase, organizationId } = await getSupplyEditorContext()

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
      organization_id: organizationId,
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
    const { supabase, organizationId } = await getSupplyEditorContext()

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
      .eq('organization_id', organizationId)

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
  const { supabase, organizationId } = await getSupplyEditorContext()

  const supplyItemId = String(formData.get('supplyItemId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!supplyItemId) throw new Error('Supply item id is required.')

  const { error } = await supabase
    .from('supply_items')
    .update({ is_active: nextValue })
    .eq('id', supplyItemId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  revalidateSupplyPaths()
}