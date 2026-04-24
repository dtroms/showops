import { createClient } from '@/lib/supabase/server'
import { VendorPartnersPageShell } from '@/components/vendors/vendor-partners-page-shell'

export default async function FreelancePartnersPage() {
  const supabase = await createClient()

  const [{ data: vendors, error }, { data: ratings, error: ratingsError }] =
    await Promise.all([
      supabase
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
        .eq('partner_kind', 'freelancer')
        .order('freelancer_name', { ascending: true }),

      supabase
        .from('freelancer_ratings')
        .select('vendor_id, rating'),
    ])

  if (error) {
    throw new Error(error.message)
  }

  if (ratingsError) {
    throw new Error(ratingsError.message)
  }

  const groupedRatings = new Map<string, number[]>()

  for (const row of ratings ?? []) {
    const vendorId = String((row as any).vendor_id)
    const rating = Number((row as any).rating)

    if (!vendorId || !Number.isFinite(rating)) continue

    const existing = groupedRatings.get(vendorId) ?? []
    existing.push(rating)
    groupedRatings.set(vendorId, existing)
  }

  const normalizedVendors =
    vendors?.map((vendor: any) => {
      const primaryArea =
        (vendor.vendor_service_areas || []).find((area: any) => area.is_primary) ?? null

      const ratingValues = groupedRatings.get(vendor.id) ?? []
      const ratingCount = ratingValues.length
      const averageRating =
        ratingCount > 0
          ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingCount
          : null

      return {
        ...vendor,
        average_rating: averageRating,
        rating_count: ratingCount,
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
      title="Freelance Partners"
      description="Manage freelance operators, technicians, and labor partners used for show staffing."
      partnerKind="freelancer"
      vendors={normalizedVendors}
    />
  )
}