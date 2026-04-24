'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canEditOrgVendorLibrary } from '@/lib/permissions'

export type VendorState = {
  error?: string
  success?: boolean
}

async function getVendorEditorContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!canEditOrgVendorLibrary(ctx.orgRole)) {
    throw new Error('You do not have permission to modify vendors')
  }

  return {
    supabase,
    organizationId: ctx.organizationId,
  }
}

function revalidateVendorPaths() {
  revalidatePath('/vendors')
  revalidatePath('/vendors/freelance')
  revalidatePath('/vendors/business')
  revalidatePath('/shows')
}

function parseOptionalText(formData: FormData, key: string) {
  const value = String(formData.get(key) || '').trim()
  return value || null
}

function parseOptionalNumber(formData: FormData, key: string) {
  const raw = String(formData.get(key) || '').trim()
  if (!raw) return null
  const parsed = Number(raw)
  return Number.isFinite(parsed) ? parsed : NaN
}

function parsePrimaryServiceArea(formData: FormData) {
  const label = parseOptionalText(formData, 'serviceAreaLabel')
  const city = String(formData.get('serviceAreaCity') || '').trim()
  const state = String(formData.get('serviceAreaState') || '').trim()
  const postalCode = parseOptionalText(formData, 'serviceAreaPostalCode')
  const country = String(formData.get('serviceAreaCountry') || '').trim() || 'USA'
  const notes = parseOptionalText(formData, 'serviceAreaNotes')
  const serviceMode = String(formData.get('serviceAreaMode') || 'local').trim()
  const radiusRaw = String(formData.get('serviceAreaRadiusMiles') || '').trim()
  const serviceRadiusMiles = radiusRaw ? Number(radiusRaw) : 50

  return {
    label,
    city,
    state,
    postalCode,
    country,
    notes,
    serviceMode,
    serviceRadiusMiles,
  }
}

function parseAdditionalServiceArea(formData: FormData) {
  const city = String(formData.get('additionalServiceAreaCity') || '').trim()
  const state = String(formData.get('additionalServiceAreaState') || '').trim()

  if (!city || !state) {
    return null
  }

  const label = parseOptionalText(formData, 'additionalServiceAreaLabel')
  const postalCode = parseOptionalText(formData, 'additionalServiceAreaPostalCode')
  const country =
    String(formData.get('additionalServiceAreaCountry') || '').trim() || 'USA'
  const notes = parseOptionalText(formData, 'additionalServiceAreaNotes')
  const serviceMode =
    String(formData.get('additionalServiceAreaMode') || 'regional').trim()
  const radiusRaw = String(formData.get('additionalServiceAreaRadiusMiles') || '').trim()
  const serviceRadiusMiles = radiusRaw ? Number(radiusRaw) : 150

  return {
    label,
    city,
    state,
    postalCode,
    country,
    notes,
    serviceMode,
    serviceRadiusMiles,
  }
}

function validateServiceArea(area: ReturnType<typeof parsePrimaryServiceArea>) {
  if (!area.city) return 'Primary service area city is required.'
  if (!area.state) return 'Primary service area state is required.'
  if (!['local', 'regional', 'national'].includes(area.serviceMode)) {
    return 'Primary service area mode is invalid.'
  }
  if (!Number.isFinite(area.serviceRadiusMiles) || area.serviceRadiusMiles <= 0) {
    return 'Primary service area radius must be greater than 0.'
  }
  return null
}

async function upsertPrimaryServiceArea(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  vendorId: string
  area: ReturnType<typeof parsePrimaryServiceArea>
}) {
  const { supabase, organizationId, vendorId, area } = params

  const { data: existingPrimary, error: lookupError } = await supabase
    .from('vendor_service_areas')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('vendor_id', vendorId)
    .eq('is_primary', true)
    .maybeSingle()

  if (lookupError) throw new Error(lookupError.message)

  const payload = {
    organization_id: organizationId,
    vendor_id: vendorId,
    label: area.label,
    city: area.city,
    state: area.state,
    postal_code: area.postalCode,
    country: area.country,
    service_radius_miles: area.serviceRadiusMiles,
    service_mode: area.serviceMode,
    notes: area.notes,
    is_primary: true,
  }

  if (existingPrimary?.id) {
    const { error } = await supabase
      .from('vendor_service_areas')
      .update(payload)
      .eq('id', existingPrimary.id)
      .eq('organization_id', organizationId)

    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase.from('vendor_service_areas').insert(payload)
  if (error) throw new Error(error.message)
}

async function createAdditionalServiceArea(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  vendorId: string
  area: NonNullable<ReturnType<typeof parseAdditionalServiceArea>>
}) {
  const { supabase, organizationId, vendorId, area } = params

  if (!['local', 'regional', 'national'].includes(area.serviceMode)) {
    throw new Error('Additional service area mode is invalid.')
  }

  if (!Number.isFinite(area.serviceRadiusMiles) || area.serviceRadiusMiles <= 0) {
    throw new Error('Additional service area radius must be greater than 0.')
  }

  const { error } = await supabase.from('vendor_service_areas').insert({
    organization_id: organizationId,
    vendor_id: vendorId,
    label: area.label,
    city: area.city,
    state: area.state,
    postal_code: area.postalCode,
    country: area.country,
    service_radius_miles: area.serviceRadiusMiles,
    service_mode: area.serviceMode,
    notes: area.notes,
    is_primary: false,
  })

  if (error) throw new Error(error.message)
}

export async function createVendor(
  _prevState: VendorState,
  formData: FormData
): Promise<VendorState> {
  try {
    const { supabase, organizationId } = await getVendorEditorContext()

    const partnerKind = String(formData.get('partnerKind') || '').trim()
    const businessName = parseOptionalText(formData, 'businessName')
    const freelancerName = parseOptionalText(formData, 'freelancerName')
    const serviceType = parseOptionalText(formData, 'serviceType')
    const contactName = parseOptionalText(formData, 'contactName')
    const email = parseOptionalText(formData, 'email')
    const phone = parseOptionalText(formData, 'phone')
    const website = parseOptionalText(formData, 'website')
    const notes = parseOptionalText(formData, 'notes')
    const travelNotes = parseOptionalText(formData, 'travelNotes')
    const defaultCostRaw = String(formData.get('defaultCost') || '').trim()
    const travelAvailable =
      String(formData.get('travelAvailable') || '').trim() === 'true'
    const preferredVendor =
      String(formData.get('preferredVendor') || '').trim() === 'true'
    const rating = parseOptionalNumber(formData, 'rating')

    if (!partnerKind || !['business', 'freelancer'].includes(partnerKind)) {
      return { error: 'Please choose Business Vendor or Freelancer.' }
    }

    if (partnerKind === 'business' && !businessName) {
      return { error: 'Business name is required for a vendor partner.' }
    }

    if (partnerKind === 'freelancer' && !freelancerName) {
      return { error: 'Freelancer name is required.' }
    }

    const defaultCost = defaultCostRaw ? Number(defaultCostRaw) : 0
    if (defaultCostRaw && Number.isNaN(defaultCost)) {
      return { error: 'Default cost must be a valid number.' }
    }

    if (rating !== null && (Number.isNaN(rating) || rating < 0 || rating > 5)) {
      return { error: 'Rating must be between 0 and 5.' }
    }

    const primaryArea = parsePrimaryServiceArea(formData)
    const primaryAreaError = validateServiceArea(primaryArea)
    if (primaryAreaError) return { error: primaryAreaError }

    const additionalArea = parseAdditionalServiceArea(formData)
    const nationwideCoverage = primaryArea.serviceMode === 'national'

    const vendorName = partnerKind === 'business' ? businessName : freelancerName
    const vendorType = partnerKind === 'business' ? 'business' : 'freelance'
    const finalContactName =
      partnerKind === 'freelancer' ? freelancerName : contactName

    const { data: insertedVendor, error } = await supabase
      .from('vendors')
      .insert({
        organization_id: organizationId,
        vendor_name: vendorName,
        vendor_type: vendorType,
        partner_kind: partnerKind,
        freelancer_name: freelancerName,
        business_name: businessName,
        service_type: serviceType,
        contact_name: finalContactName,
        email,
        phone,
        website,
        default_cost: defaultCost,
        notes,
        travel_notes: partnerKind === 'freelancer' ? travelNotes : null,
        travel_available: partnerKind === 'freelancer' ? travelAvailable : false,
        preferred_vendor: preferredVendor,
        nationwide_coverage: nationwideCoverage,
        rating,
        is_active: true,
      })
      .select('id')
      .single()

    if (error || !insertedVendor?.id) {
      return { error: error?.message || 'Failed to create vendor.' }
    }

    await upsertPrimaryServiceArea({
      supabase,
      organizationId,
      vendorId: insertedVendor.id,
      area: primaryArea,
    })

    if (partnerKind === 'business' && additionalArea) {
      await createAdditionalServiceArea({
        supabase,
        organizationId,
        vendorId: insertedVendor.id,
        area: additionalArea,
      })
    }

    revalidateVendorPaths()

    if (partnerKind === 'freelancer') {
      redirect(`/vendors/freelance/${insertedVendor.id}`)
    }

    redirect(`/vendors/business/${insertedVendor.id}`)
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
    const { supabase, organizationId } = await getVendorEditorContext()

    const vendorId = String(formData.get('vendorId') || '').trim()
    const partnerKind = String(formData.get('partnerKind') || '').trim()
    const businessName = parseOptionalText(formData, 'businessName')
    const freelancerName = parseOptionalText(formData, 'freelancerName')
    const serviceType = parseOptionalText(formData, 'serviceType')
    const contactName = parseOptionalText(formData, 'contactName')
    const email = parseOptionalText(formData, 'email')
    const phone = parseOptionalText(formData, 'phone')
    const website = parseOptionalText(formData, 'website')
    const notes = parseOptionalText(formData, 'notes')
    const travelNotes = parseOptionalText(formData, 'travelNotes')
    const defaultCostRaw = String(formData.get('defaultCost') || '').trim()
    const travelAvailable =
      String(formData.get('travelAvailable') || '').trim() === 'true'
    const preferredVendor =
      String(formData.get('preferredVendor') || '').trim() === 'true'
    const rating = parseOptionalNumber(formData, 'rating')

    if (!vendorId) return { error: 'Vendor id is required.' }
    if (!partnerKind || !['business', 'freelancer'].includes(partnerKind)) {
      return { error: 'Please choose Business Vendor or Freelancer.' }
    }
    if (partnerKind === 'business' && !businessName) {
      return { error: 'Business name is required for a vendor partner.' }
    }
    if (partnerKind === 'freelancer' && !freelancerName) {
      return { error: 'Freelancer name is required.' }
    }

    const defaultCost = defaultCostRaw ? Number(defaultCostRaw) : 0
    if (defaultCostRaw && Number.isNaN(defaultCost)) {
      return { error: 'Default cost must be a valid number.' }
    }

    if (rating !== null && (Number.isNaN(rating) || rating < 0 || rating > 5)) {
      return { error: 'Rating must be between 0 and 5.' }
    }

    const primaryArea = parsePrimaryServiceArea(formData)
    const primaryAreaError = validateServiceArea(primaryArea)
    if (primaryAreaError) return { error: primaryAreaError }

    const nationwideCoverage = primaryArea.serviceMode === 'national'

    const vendorName = partnerKind === 'business' ? businessName : freelancerName
    const vendorType = partnerKind === 'business' ? 'business' : 'freelance'
    const finalContactName =
      partnerKind === 'freelancer' ? freelancerName : contactName

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
        website,
        default_cost: defaultCost,
        notes,
        travel_notes: partnerKind === 'freelancer' ? travelNotes : null,
        travel_available: partnerKind === 'freelancer' ? travelAvailable : false,
        preferred_vendor: preferredVendor,
        nationwide_coverage: nationwideCoverage,
        rating,
      })
      .eq('id', vendorId)
      .eq('organization_id', organizationId)

    if (error) return { error: error.message }

    await upsertPrimaryServiceArea({
      supabase,
      organizationId,
      vendorId,
      area: primaryArea,
    })

    revalidateVendorPaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update vendor.',
    }
  }
}

export async function toggleVendorActive(formData: FormData) {
  const { supabase, organizationId } = await getVendorEditorContext()

  const vendorId = String(formData.get('vendorId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!vendorId) throw new Error('Vendor id is required.')

  const { error } = await supabase
    .from('vendors')
    .update({ is_active: nextValue })
    .eq('id', vendorId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  revalidateVendorPaths()
}