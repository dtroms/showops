'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type BudgetLineState = {
  error?: string
}

function revalidateBudgetPaths(showId: string) {
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}`)
  revalidatePath('/dashboard')
  revalidatePath('/shows')
}

export async function createBudgetLine(
  _prevState: BudgetLineState,
  formData: FormData
): Promise<BudgetLineState> {
  const showId = String(formData.get('showId') || '').trim()
  const sectionType = String(formData.get('sectionType') || '').trim()
  const subgroupTypeRaw = String(formData.get('subgroupType') || '').trim()
  const lineName = String(formData.get('lineName') || '').trim()
  const quantityRaw = String(formData.get('quantity') || '').trim()
  const unitCostRaw = String(formData.get('unitCost') || '').trim()
  const notes = String(formData.get('notes') || '').trim() || null
  const referenceIdRaw = String(formData.get('referenceId') || '').trim()

  const overtimeEnabled = String(formData.get('overtimeEnabled') || '') === 'true'
  const overtimeHoursRaw = String(formData.get('overtimeHours') || '').trim()

  if (!showId || !sectionType || !lineName || !quantityRaw || !unitCostRaw) {
    return { error: 'Please fill out all required fields.' }
  }

  const quantity = Number(quantityRaw)
  const unitCost = Number(unitCostRaw)

  if (Number.isNaN(quantity) || quantity < 0) {
    return { error: 'Quantity must be a valid number.' }
  }

  if (Number.isNaN(unitCost) || unitCost < 0) {
    return { error: 'Unit cost must be a valid number.' }
  }

  let overtimeHours: number | null = null
  let overtimeRate: number | null = null

  if (sectionType === 'vendor' && overtimeEnabled) {
    overtimeHours = overtimeHoursRaw ? Number(overtimeHoursRaw) : 0

    if (Number.isNaN(overtimeHours) || overtimeHours < 0) {
      return { error: 'Overtime hours must be a valid number.' }
    }

    overtimeRate = (unitCost / 10) * 1.5
  }

  const baseSubtotal = quantity * unitCost
  const overtimeSubtotal =
    sectionType === 'vendor' && overtimeEnabled && overtimeHours && overtimeRate
      ? overtimeHours * overtimeRate
      : 0

  const subtotal = baseSubtotal + overtimeSubtotal
  const subgroupType = subgroupTypeRaw || null

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { error: 'Organization not found for this user.' }
  }

  const { error } = await supabase
    .from('show_budget_line_items')
    .insert({
      organization_id: profile.organization_id,
      show_id: showId,
      section_type: sectionType,
      subgroup_type: subgroupType,
      line_name: lineName,
      quantity,
      unit_cost: unitCost,
      subtotal,
      overtime_enabled: sectionType === 'vendor' ? overtimeEnabled : false,
      overtime_hours: sectionType === 'vendor' ? overtimeHours : null,
      overtime_rate: sectionType === 'vendor' ? overtimeRate : null,
      reference_id: referenceIdRaw || null,
      notes,
      sort_order: 0,
    })

  if (error) {
    return { error: error.message }
  }

  revalidateBudgetPaths(showId)
  return {}
}

export async function updateBudgetLine(
  _prevState: BudgetLineState,
  formData: FormData
): Promise<BudgetLineState> {
  const lineItemId = String(formData.get('lineItemId') || '').trim()
  const showId = String(formData.get('showId') || '').trim()
  const lineName = String(formData.get('lineName') || '').trim()
  const quantityRaw = String(formData.get('quantity') || '').trim()
  const unitCostRaw = String(formData.get('unitCost') || '').trim()
  const notes = String(formData.get('notes') || '').trim() || null

  const overtimeEnabled = String(formData.get('overtimeEnabled') || '') === 'true'
  const overtimeHoursRaw = String(formData.get('overtimeHours') || '').trim()
  const sectionType = String(formData.get('sectionType') || '').trim()

  if (!lineItemId || !showId || !lineName || !quantityRaw || !unitCostRaw) {
    return { error: 'Please fill out all required fields.' }
  }

  const quantity = Number(quantityRaw)
  const unitCost = Number(unitCostRaw)

  if (Number.isNaN(quantity) || quantity < 0) {
    return { error: 'Quantity must be a valid number.' }
  }

  if (Number.isNaN(unitCost) || unitCost < 0) {
    return { error: 'Unit cost must be a valid number.' }
  }

  let overtimeHours: number | null = null
  let overtimeRate: number | null = null

  if (sectionType === 'vendor' && overtimeEnabled) {
    overtimeHours = overtimeHoursRaw ? Number(overtimeHoursRaw) : 0

    if (Number.isNaN(overtimeHours) || overtimeHours < 0) {
      return { error: 'Overtime hours must be a valid number.' }
    }

    overtimeRate = (unitCost / 10) * 1.5
  }

  const baseSubtotal = quantity * unitCost
  const overtimeSubtotal =
    sectionType === 'vendor' && overtimeEnabled && overtimeHours && overtimeRate
      ? overtimeHours * overtimeRate
      : 0

  const subtotal = baseSubtotal + overtimeSubtotal

  const supabase = await createClient()

  const { error } = await supabase
    .from('show_budget_line_items')
    .update({
      line_name: lineName,
      quantity,
      unit_cost: unitCost,
      subtotal,
      overtime_enabled: sectionType === 'vendor' ? overtimeEnabled : false,
      overtime_hours: sectionType === 'vendor' ? overtimeHours : null,
      overtime_rate: sectionType === 'vendor' ? overtimeRate : null,
      notes,
    })
    .eq('id', lineItemId)

  if (error) {
    return { error: error.message }
  }

  revalidateBudgetPaths(showId)
  return {}
}

export async function deleteBudgetLine(lineItemId: string, showId: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('show_budget_line_items')
    .delete()
    .eq('id', lineItemId)

  if (error) {
    throw new Error(error.message)
  }

  revalidateBudgetPaths(showId)
}