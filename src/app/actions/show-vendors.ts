'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type ShowVendorState = {
  error?: string
}

function revalidateShowVendorPaths(showId: string) {
  revalidatePath(`/shows/${showId}/vendors`)
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}`)
}

export async function addVendorToShow(
  _prevState: ShowVendorState,
  formData: FormData
): Promise<ShowVendorState> {
  const showId = String(formData.get('showId') || '').trim()
  const vendorId = String(formData.get('vendorId') || '').trim()
  const notes = String(formData.get('notes') || '').trim() || null

  if (!showId || !vendorId) {
    return { error: 'Show and vendor are required.' }
  }

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

  const { data: vendor, error: vendorError } = await supabase
    .from('vendors')
    .select(`
      id,
      vendor_name,
      vendor_type,
      service_type,
      contact_name,
      email,
      phone,
      default_cost
    `)
    .eq('id', vendorId)
    .eq('organization_id', profile.organization_id)
    .maybeSingle()

  if (vendorError || !vendor) {
    return { error: 'Vendor not found.' }
  }

  const { data: existingAssignment } = await supabase
    .from('show_vendors')
    .select('id')
    .eq('show_id', showId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existingAssignment?.id) {
    return { error: 'This vendor is already assigned to the show.' }
  }

  const { data: showVendor, error: showVendorError } = await supabase
    .from('show_vendors')
    .insert({
      organization_id: profile.organization_id,
      show_id: showId,
      vendor_id: vendor.id,
      vendor_name_snapshot: vendor.vendor_name,
      vendor_type_snapshot: vendor.vendor_type,
      service_type_snapshot: vendor.service_type,
      contact_name_snapshot: vendor.contact_name,
      email_snapshot: vendor.email,
      phone_snapshot: vendor.phone,
      default_day_rate_snapshot: vendor.default_cost,
      notes,
    })
    .select('id')
    .single()

  if (showVendorError || !showVendor) {
    return { error: showVendorError?.message || 'Failed to assign vendor.' }
  }

  const defaultDayRate = Number(vendor.default_cost ?? 0)

  const { error: budgetLineError } = await supabase
    .from('show_budget_line_items')
    .insert({
      organization_id: profile.organization_id,
      show_id: showId,
      vendor_id: vendor.id,
      reference_id: showVendor.id,
      section_type: 'vendor',
      subgroup_type: null,
      line_name: vendor.vendor_name,
      quantity: 1,
      unit_cost: defaultDayRate,
      subtotal: defaultDayRate,
      overtime_enabled: false,
      overtime_hours: null,
      overtime_rate: null,
      notes: null,
      sort_order: 0,
    })

  if (budgetLineError) {
    return { error: budgetLineError.message }
  }

  revalidateShowVendorPaths(showId)
  return {}
}

export async function addAssignedVendorBudgetLine(showVendorId: string, showId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('Organization not found for this user.')
  }

  const { data: showVendor, error: showVendorError } = await supabase
    .from('show_vendors')
    .select(`
      id,
      show_id,
      vendor_id,
      vendor_name_snapshot,
      default_day_rate_snapshot
    `)
    .eq('id', showVendorId)
    .eq('organization_id', profile.organization_id)
    .single()

  if (showVendorError || !showVendor) {
    throw new Error(showVendorError?.message || 'Assigned vendor not found.')
  }

  const { data: existingBudgetLine } = await supabase
    .from('show_budget_line_items')
    .select('id')
    .eq('show_id', showId)
    .eq('section_type', 'vendor')
    .eq('reference_id', showVendorId)
    .maybeSingle()

  if (existingBudgetLine?.id) {
    revalidateShowVendorPaths(showId)
    return
  }

  const defaultDayRate = Number(showVendor.default_day_rate_snapshot ?? 0)

  const { error } = await supabase
    .from('show_budget_line_items')
    .insert({
      organization_id: profile.organization_id,
      show_id: showId,
      vendor_id: showVendor.vendor_id,
      reference_id: showVendor.id,
      section_type: 'vendor',
      subgroup_type: null,
      line_name: showVendor.vendor_name_snapshot,
      quantity: 1,
      unit_cost: defaultDayRate,
      subtotal: defaultDayRate,
      overtime_enabled: false,
      overtime_hours: null,
      overtime_rate: null,
      notes: null,
      sort_order: 0,
    })

  if (error) {
    throw new Error(error.message)
  }

  revalidateShowVendorPaths(showId)
}

export async function removeVendorFromShow(showVendorId: string, showId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('Organization not found for this user.')
  }

  const { error: budgetDeleteError } = await supabase
    .from('show_budget_line_items')
    .delete()
    .eq('reference_id', showVendorId)
    .eq('show_id', showId)
    .eq('section_type', 'vendor')
    .eq('organization_id', profile.organization_id)

  if (budgetDeleteError) {
    throw new Error(budgetDeleteError.message)
  }

  const { error } = await supabase
    .from('show_vendors')
    .delete()
    .eq('id', showVendorId)
    .eq('show_id', showId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidateShowVendorPaths(showId)
}