import { createClient } from '@/lib/supabase/server'
import { VendorPartnersPageShell } from '@/components/vendors/vendor-partners-page-shell'

export default async function BusinessVendorPartnersPage() {
  const supabase = await createClient()

  const { data: vendors, error } = await supabase
    .from('vendors')
    .select(`
      id,
      vendor_name,
      vendor_type,
      partner_kind,
      freelancer_name,
      business_name,
      service_type,
      contact_name,
      email,
      phone,
      website,
      default_cost,
      notes,
      travel_notes,
      travel_available,
      preferred_vendor,
      nationwide_coverage,
      is_active,
      vendor_service_areas (
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
    .eq('partner_kind', 'business')
    .order('business_name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const normalizedVendors =
    vendors?.map((vendor: any) => {
      const primaryArea =
        (vendor.vendor_service_areas || []).find((area: any) => area.is_primary) ?? null

      return {
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
      }
    }) ?? []

  return (
    <VendorPartnersPageShell
      title="Vendor Partners"
      description="Manage business vendors, rental houses, fabrication partners, and outside service providers."
      partnerKind="business"
      vendors={normalizedVendors}
    />
  )
}