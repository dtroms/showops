'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type VendorState = {
  error?: string
  success?: boolean
}

async function getVendorEditorContext() {
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
    throw new Error('You do not have permission to modify vendors')
  }

  return { supabase, profile }
}

function revalidateVendorPaths() {
  revalidatePath('/vendors')
  revalidatePath('/shows')
}

export async function createVendor(
  _prevState: VendorState,
  formData: FormData
): Promise<VendorState> {
  try {
    const { supabase, profile } = await getVendorEditorContext()

    const partnerKind = String(formData.get('partnerKind') || '').trim()
    const businessName = String(formData.get('businessName') || '').trim() || null
    const freelancerName = String(formData.get('freelancerName') || '').trim() || null
    const serviceType = String(formData.get('serviceType') || '').trim() || null
    const contactName = String(formData.get('contactName') || '').trim() || null
    const email = String(formData.get('email') || '').trim() || null
    const phone = String(formData.get('phone') || '').trim() || null
    const defaultCostRaw = String(formData.get('defaultCost') || '').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!partnerKind || !['business', 'freelancer'].includes(partnerKind)) {
      return { error: 'Please choose Business Vendor or Freelancer.' }
    }

    if (partnerKind === 'business' && !businessName) {
      return { error: 'Business name is required for a business vendor.' }
    }

    if (partnerKind === 'freelancer' && !freelancerName) {
      return { error: 'Freelancer name is required for a freelancer.' }
    }

    const defaultCost = defaultCostRaw ? Number(defaultCostRaw) : 0

    if (defaultCostRaw && Number.isNaN(defaultCost)) {
      return { error: 'Default cost must be a valid number.' }
    }

    const vendorName =
      partnerKind === 'business'
        ? businessName
        : freelancerName

    const vendorType =
      partnerKind === 'business' ? 'business' : 'freelance'

    const finalContactName =
      partnerKind === 'freelancer'
        ? freelancerName
        : contactName

    const { error } = await supabase.from('vendors').insert({
      organization_id: profile.organization_id,
      vendor_name: vendorName,
      vendor_type: vendorType,
      partner_kind: partnerKind,
      freelancer_name: freelancerName,
      business_name: businessName,
      service_type: serviceType,
      contact_name: finalContactName,
      email,
      phone,
      default_cost: defaultCost,
      notes,
      is_active: true,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateVendorPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create vendor.',
    }
  }
}

export async function updateVendor(
  _prevState: VendorState,
  formData: FormData
): Promise<VendorState> {
  try {
    const { supabase, profile } = await getVendorEditorContext()

    const vendorId = String(formData.get('vendorId') || '').trim()
    const partnerKind = String(formData.get('partnerKind') || '').trim()
    const businessName = String(formData.get('businessName') || '').trim() || null
    const freelancerName = String(formData.get('freelancerName') || '').trim() || null
    const serviceType = String(formData.get('serviceType') || '').trim() || null
    const contactName = String(formData.get('contactName') || '').trim() || null
    const email = String(formData.get('email') || '').trim() || null
    const phone = String(formData.get('phone') || '').trim() || null
    const defaultCostRaw = String(formData.get('defaultCost') || '').trim()
    const notes = String(formData.get('notes') || '').trim() || null

    if (!vendorId) {
      return { error: 'Vendor id is required.' }
    }

    if (!partnerKind || !['business', 'freelancer'].includes(partnerKind)) {
      return { error: 'Please choose Business Vendor or Freelancer.' }
    }

    if (partnerKind === 'business' && !businessName) {
      return { error: 'Business name is required for a business vendor.' }
    }

    if (partnerKind === 'freelancer' && !freelancerName) {
      return { error: 'Freelancer name is required for a freelancer.' }
    }

    const defaultCost = defaultCostRaw ? Number(defaultCostRaw) : 0

    if (defaultCostRaw && Number.isNaN(defaultCost)) {
      return { error: 'Default cost must be a valid number.' }
    }

    const vendorName =
      partnerKind === 'business'
        ? businessName
        : freelancerName

    const vendorType =
      partnerKind === 'business' ? 'business' : 'freelance'

    const finalContactName =
      partnerKind === 'freelancer'
        ? freelancerName
        : contactName

    const { error } = await supabase
      .from('vendors')
      .update({
        vendor_name: vendorName,
        vendor_type: vendorType,
        partner_kind: partnerKind,
        freelancer_name: freelancerName,
        business_name: businessName,
        service_type: serviceType,
        contact_name: finalContactName,
        email,
        phone,
        default_cost: defaultCost,
        notes,
      })
      .eq('id', vendorId)
      .eq('organization_id', profile.organization_id)

    if (error) {
      return { error: error.message }
    }

    revalidateVendorPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update vendor.',
    }
  }
}

export async function toggleVendorActive(formData: FormData) {
  const { supabase, profile } = await getVendorEditorContext()

  const vendorId = String(formData.get('vendorId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!vendorId) {
    throw new Error('Vendor id is required.')
  }

  const { error } = await supabase
    .from('vendors')
    .update({ is_active: nextValue })
    .eq('id', vendorId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidateVendorPaths()
}