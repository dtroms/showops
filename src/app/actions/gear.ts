'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type GearState = {
  error?: string
  success?: boolean
}

async function getGearEditorContext() {
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
    throw new Error('You do not have permission to modify gear')
  }

  return { supabase, profile }
}

function revalidateGearPaths() {
  revalidatePath('/gear')
}

export async function createGearItem(
  _prevState: GearState,
  formData: FormData
): Promise<GearState> {
  try {
    const { supabase, profile } = await getGearEditorContext()

    const itemName = String(formData.get('itemName') || '').trim()
    const categoryName = String(formData.get('categoryName') || '').trim()
    const subcategoryName = String(formData.get('subcategoryName') || '').trim() || null
    const internalCostRaw = String(formData.get('internalCost') || '').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!itemName || !categoryName) {
      return { error: 'Item name and category are required.' }
    }

    const internalCost = internalCostRaw ? Number(internalCostRaw) : 0

    if (internalCostRaw && Number.isNaN(internalCost)) {
      return { error: 'Internal cost must be a valid number.' }
    }

    let categoryId: string
    const { data: existingCategory } = await supabase
      .from('gear_categories')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('name', categoryName)
      .maybeSingle()

    if (existingCategory?.id) {
      categoryId = existingCategory.id
    } else {
      const { data: newCategory, error: categoryError } = await supabase
        .from('gear_categories')
        .insert({
          organization_id: profile.organization_id,
          name: categoryName,
          is_active: true,
        })
        .select('id')
        .single()

      if (categoryError || !newCategory?.id) {
        return { error: categoryError?.message || 'Failed to create category.' }
      }

      categoryId = newCategory.id
    }

    let subcategoryId: string | null = null

    if (subcategoryName) {
      const { data: existingSubcategory } = await supabase
        .from('gear_subcategories')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('category_id', categoryId)
        .eq('name', subcategoryName)
        .maybeSingle()

      if (existingSubcategory?.id) {
        subcategoryId = existingSubcategory.id
      } else {
        const { data: newSubcategory, error: subcategoryError } = await supabase
          .from('gear_subcategories')
          .insert({
            organization_id: profile.organization_id,
            category_id: categoryId,
            name: subcategoryName,
            is_active: true,
          })
          .select('id')
          .single()

        if (subcategoryError || !newSubcategory?.id) {
          return {
            error: subcategoryError?.message || 'Failed to create subcategory.',
          }
        }

        subcategoryId = newSubcategory.id
      }
    }

    const { error } = await supabase.from('gear_items').insert({
      organization_id: profile.organization_id,
      item_name: itemName,
      category_id: categoryId,
      subcategory_id: subcategoryId,
      internal_cost: internalCost,
      notes,
      is_active: true,
    })

    if (error) return { error: error.message }

    revalidateGearPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create gear item.',
    }
  }
}

export async function updateGearItem(
  _prevState: GearState,
  formData: FormData
): Promise<GearState> {
  try {
    const { supabase, profile } = await getGearEditorContext()

    const gearItemId = String(formData.get('gearItemId') || '').trim()
    const itemName = String(formData.get('itemName') || '').trim()
    const categoryName = String(formData.get('categoryName') || '').trim()
    const subcategoryName = String(formData.get('subcategoryName') || '').trim() || null
    const internalCostRaw = String(formData.get('internalCost') || '').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!gearItemId || !itemName || !categoryName) {
      return { error: 'Gear item, name, and category are required.' }
    }

    const internalCost = internalCostRaw ? Number(internalCostRaw) : 0

    if (internalCostRaw && Number.isNaN(internalCost)) {
      return { error: 'Internal cost must be a valid number.' }
    }

    let categoryId: string
    const { data: existingCategory } = await supabase
      .from('gear_categories')
      .select('id')
      .eq('organization_id', profile.organization_id)
      .eq('name', categoryName)
      .maybeSingle()

    if (existingCategory?.id) {
      categoryId = existingCategory.id
    } else {
      const { data: newCategory, error: categoryError } = await supabase
        .from('gear_categories')
        .insert({
          organization_id: profile.organization_id,
          name: categoryName,
          is_active: true,
        })
        .select('id')
        .single()

      if (categoryError || !newCategory?.id) {
        return { error: categoryError?.message || 'Failed to create category.' }
      }

      categoryId = newCategory.id
    }

    let subcategoryId: string | null = null

    if (subcategoryName) {
      const { data: existingSubcategory } = await supabase
        .from('gear_subcategories')
        .select('id')
        .eq('organization_id', profile.organization_id)
        .eq('category_id', categoryId)
        .eq('name', subcategoryName)
        .maybeSingle()

      if (existingSubcategory?.id) {
        subcategoryId = existingSubcategory.id
      } else {
        const { data: newSubcategory, error: subcategoryError } = await supabase
          .from('gear_subcategories')
          .insert({
            organization_id: profile.organization_id,
            category_id: categoryId,
            name: subcategoryName,
            is_active: true,
          })
          .select('id')
          .single()

        if (subcategoryError || !newSubcategory?.id) {
          return {
            error: subcategoryError?.message || 'Failed to create subcategory.',
          }
        }

        subcategoryId = newSubcategory.id
      }
    }

    const { error } = await supabase
      .from('gear_items')
      .update({
        item_name: itemName,
        category_id: categoryId,
        subcategory_id: subcategoryId,
        internal_cost: internalCost,
        notes,
      })
      .eq('id', gearItemId)
      .eq('organization_id', profile.organization_id)

    if (error) return { error: error.message }

    revalidateGearPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update gear item.',
    }
  }
}

export async function toggleGearItemActive(formData: FormData) {
  const { supabase, profile } = await getGearEditorContext()

  const gearItemId = String(formData.get('gearItemId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!gearItemId) throw new Error('Gear item id is required.')

  const { error } = await supabase
    .from('gear_items')
    .update({ is_active: nextValue })
    .eq('id', gearItemId)
    .eq('organization_id', profile.organization_id)

  if (error) throw new Error(error.message)

  revalidateGearPaths()
}