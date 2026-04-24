import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { FreelancerProfileForm } from '@/components/vendors/freelancer-profile-form'

export default async function FreelanceVendorPage({
  params,
}: {
  params: Promise<{ vendorId: string }>
}) {
  const { vendorId } = await params
  const supabase = await createClient()

  const [{ data: vendor, error }, { data: ratings }] = await Promise.all([
    supabase
      .from('vendors')
      .select(`
        id,
        vendor_name,
        vendor_type,
        partner_kind,
        freelancer_name,
        service_type,
        email,
        phone,
        default_cost,
        notes,
        travel_notes,
        travel_available,
        preferred_vendor,
        is_active,
        vendor_service_areas (
          id,
          city,
          state,
          postal_code,
          country,
          is_primary
        )
      `)
      .eq('id', vendorId)
      .eq('partner_kind', 'freelancer')
      .single(),
    supabase
      .from('freelancer_ratings')
      .select('rating')
      .eq('vendor_id', vendorId),
  ])

  if (error) {
    throw new Error(error.message)
  }

  if (!vendor) {
    notFound()
  }

  const serviceAreas = (vendor.vendor_service_areas ?? []) as any[]
  const primaryArea = serviceAreas.find((area) => area.is_primary) ?? null

  const ratingValues = (ratings ?? []).map((row: any) => Number(row.rating)).filter(Number.isFinite)
  const ratingCount = ratingValues.length
  const averageRating =
    ratingCount > 0
      ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingCount
      : null

  const normalizedVendor = {
    ...vendor,
    average_rating: averageRating,
    rating_count: ratingCount,
    primary_service_area: primaryArea
      ? {
          city: primaryArea.city,
          state: primaryArea.state,
          postal_code: primaryArea.postal_code,
          country: primaryArea.country,
        }
      : null,
  }

  return (
    <div className="p-6">
      <FreelancerProfileForm mode="edit" vendor={normalizedVendor} />
    </div>
  )
}