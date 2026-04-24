import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { VendorPartnerProfileForm } from '@/components/vendors/vendor-partner-profile-form'

export default async function BusinessVendorPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const supabase = await createClient()

  const { data: vendor, error } = await supabase
    .from('vendors')
    .select(`
      id,
      vendor_name,
      vendor_type,
      partner_kind,
      business_name,
      contact_name,
      service_type,
      email,
      phone,
      website,
      default_cost,
      notes,
      preferred_vendor,
      rating,
      is_active,
      vendor_service_areas (
        id,
        label,
        city,
        state,
        postal_code,
        country,
        service_radius_miles,
        service_mode,
        notes,
        is_primary
      )
    `)
    .eq('id', vendorId)
    .eq('partner_kind', 'business')
    .single()

  if (error) throw new Error(error.message)
  if (!vendor) notFound()

  const serviceAreas = (vendor.vendor_service_areas ?? []) as any[]
  const primaryArea = serviceAreas.find((area) => area.is_primary) ?? null

  const normalizedVendor = {
    ...vendor,
    primary_service_area: primaryArea
      ? {
          label: primaryArea.label,
          city: primaryArea.city,
          state: primaryArea.state,
          postal_code: primaryArea.postal_code,
          country: primaryArea.country,
          service_radius_miles: primaryArea.service_radius_miles,
          service_mode: primaryArea.service_mode,
          notes: primaryArea.notes,
        }
      : null,
    service_areas: serviceAreas,
  }

  return (
    <div className="p-6">
      <VendorPartnerProfileForm mode="edit" vendor={normalizedVendor} />
    </div>
  )
}