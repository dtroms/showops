'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canEditOrgVendorLibrary } from '@/lib/permissions'

export type VendorServiceAreaState = {
  error?: string
  success?: boolean
}

async function getVendorEditorContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!canEditOrgVendorLibrary(ctx.orgRole)) {
    throw new Error('You do not have permission to modify vendor service areas')
  }

  return {
    supabase,
    organizationId: ctx.organizationId,
  }
}

function revalidateVendorPaths(vendorId?: string) {
  revalidatePath('/vendors/freelance')
  revalidatePath('/vendors/business')

  if (vendorId) {
    revalidatePath(`/vendors/freelance/${vendorId}`)
    revalidatePath(`/vendors/business/${vendorId}`)
  }
}

export async function saveVendorPrimaryServiceArea(
  _prevState: VendorServiceAreaState,
  formData: FormData
): Promise<VendorServiceAreaState> {
  try {
    const { supabase, organizationId } = await getVendorEditorContext()

    const vendorId = String(formData.get('vendorId') || '').trim()
    const label = String(formData.get('label') || '').trim() || null
    const city = String(formData.get('city') || '').trim()
    const state = String(formData.get('state') || '').trim()
    const postalCode = String(formData.get('postalCode') || '').trim() || null
    const country = String(formData.get('country') || '').trim() || 'USA'
    const serviceRadiusMiles = Number(formData.get('serviceRadiusMiles') || 50)
    const serviceMode = String(formData.get('serviceMode') || 'local').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!vendorId) {
      return { error: 'Vendor id is required.' }
    }

    if (!city) {
      return { error: 'City is required.' }
    }

    if (!state) {
      return { error: 'State is required.' }
    }

    if (!['local', 'regional', 'national'].includes(serviceMode)) {
      return { error: 'Invalid service mode.' }
    }

    if (!Number.isFinite(serviceRadiusMiles) || serviceRadiusMiles <= 0) {
      return { error: 'Service radius must be greater than 0.' }
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select('id, organization_id')
      .eq('id', vendorId)
      .eq('organization_id', organizationId)
      .single()

    if (vendorError || !vendor) {
      return { error: 'Vendor not found.' }
    }

    const { data: existingPrimary, error: primaryLookupError } = await supabase
      .from('vendor_service_areas')
      .select('id')
      .eq('vendor_id', vendorId)
      .eq('organization_id', organizationId)
      .eq('is_primary', true)
      .maybeSingle()

    if (primaryLookupError) {
      return { error: primaryLookupError.message }
    }

    if (existingPrimary?.id) {
      const { error: updateError } = await supabase
        .from('vendor_service_areas')
        .update({
          label,
          city,
          state,
          postal_code: postalCode,
          country,
          service_radius_miles: serviceRadiusMiles,
          service_mode: serviceMode,
          notes,
        })
        .eq('id', existingPrimary.id)
        .eq('organization_id', organizationId)

      if (updateError) {
        return { error: updateError.message }
      }
    } else {
      const { error: insertError } = await supabase
        .from('vendor_service_areas')
        .insert({
          vendor_id: vendorId,
          organization_id: organizationId,
          label,
          city,
          state,
          postal_code: postalCode,
          country,
          service_radius_miles: serviceRadiusMiles,
          service_mode: serviceMode,
          notes,
          is_primary: true,
        })

      if (insertError) {
        return { error: insertError.message }
      }
    }

    revalidateVendorPaths(vendorId)
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to save vendor service area.',
    }
  }
}

export async function createVendorServiceArea(
  _prevState: VendorServiceAreaState,
  formData: FormData
): Promise<VendorServiceAreaState> {
  try {
    const { supabase, organizationId } = await getVendorEditorContext()

    const vendorId = String(formData.get('vendorId') || '').trim()
    const label = String(formData.get('label') || '').trim() || null
    const city = String(formData.get('city') || '').trim()
    const state = String(formData.get('state') || '').trim()
    const postalCode = String(formData.get('postalCode') || '').trim() || null
    const country = String(formData.get('country') || '').trim() || 'USA'
    const serviceRadiusMiles = Number(formData.get('serviceRadiusMiles') || 50)
    const serviceMode = String(formData.get('serviceMode') || 'local').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!vendorId) {
      return { error: 'Vendor id is required.' }
    }

    if (!city) {
      return { error: 'City is required.' }
    }

    if (!state) {
      return { error: 'State is required.' }
    }

    if (!['local', 'regional', 'national'].includes(serviceMode)) {
      return { error: 'Invalid service mode.' }
    }

    if (!Number.isFinite(serviceRadiusMiles) || serviceRadiusMiles <= 0) {
      return { error: 'Service radius must be greater than 0.' }
    }

    const { error: insertError } = await supabase
      .from('vendor_service_areas')
      .insert({
        vendor_id: vendorId,
        organization_id: organizationId,
        label,
        city,
        state,
        postal_code: postalCode,
        country,
        service_radius_miles: serviceRadiusMiles,
        service_mode: serviceMode,
        notes,
        is_primary: false,
      })

    if (insertError) {
      return { error: insertError.message }
    }

    revalidateVendorPaths(vendorId)
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create vendor service area.',
    }
  }
}

export async function deleteVendorServiceArea(formData: FormData) {
  const { supabase, organizationId } = await getVendorEditorContext()

  const serviceAreaId = String(formData.get('serviceAreaId') || '').trim()
  const vendorId = String(formData.get('vendorId') || '').trim()

  if (!serviceAreaId) {
    throw new Error('Service area id is required.')
  }

  const { data: existing, error: lookupError } = await supabase
    .from('vendor_service_areas')
    .select('id, is_primary')
    .eq('id', serviceAreaId)
    .eq('organization_id', organizationId)
    .single()

  if (lookupError || !existing) {
    throw new Error(lookupError?.message || 'Service area not found.')
  }

  if (existing.is_primary) {
    throw new Error('Primary service area cannot be deleted here.')
  }

  const { error: deleteError } = await supabase
    .from('vendor_service_areas')
    .delete()
    .eq('id', serviceAreaId)
    .eq('organization_id', organizationId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  revalidateVendorPaths(vendorId || undefined)
}