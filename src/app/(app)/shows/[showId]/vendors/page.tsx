import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShowVendorsPageShell } from '@/components/show-detail/show-vendors-page-shell'

type ShowRow = {
  id: string
  show_name: string | null
  city: string | null
  state: string | null
  venue_id: string | null
  venues:
    | {
        id: string
        name: string | null
        city: string | null
        state: string | null
        latitude: number | null
        longitude: number | null
      }
    | {
        id: string
        name: string | null
        city: string | null
        state: string | null
        latitude: number | null
        longitude: number | null
      }[]
    | null
}

type AssignedVendor = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
}

type VendorRow = {
  id: string
  organization_id: string
  vendor_name: string | null
  partner_kind: string | null
  freelancer_name: string | null
  business_name: string | null
  vendor_type: string | null
  service_type: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  default_cost: number | null
  is_active: boolean | null
  preferred_vendor: boolean | null
  travel_available: boolean | null
  nationwide_coverage: boolean | null
  website: string | null
  notes: string | null
}

type ServiceAreaRow = {
  id: string
  vendor_id: string
  city: string
  state: string
  postal_code: string | null
  country: string | null
  latitude: number | null
  longitude: number | null
  service_radius_miles: number
  service_mode: 'local' | 'regional' | 'national'
  notes: string | null
  is_primary: boolean
}

type RatingRow = {
  vendor_id: string
  rating: number
}

type FreelancerRecord = {
  id: string
  vendorId: string
  vendorName: string
  serviceType: string | null
  email: string | null
  phone: string | null
  defaultCost: number | null
  preferredVendor: boolean
  travelAvailable: boolean
  averageRating: number | null
  ratingCount: number
  serviceAreaCity: string | null
  serviceAreaState: string | null
  serviceAreaPostalCode: string | null
  serviceAreaCountry: string | null
  serviceAreaNotes: string | null
  distanceMiles: number | null
  matchReason: string
  alreadyAssigned: boolean
}

type NearbyVendor = {
  id: string
  vendorId: string
  vendorName: string
  serviceType: string | null
  contactName: string | null
  email: string | null
  phone: string | null
  website: string | null
  vendorNotes: string | null
  preferredVendor: boolean
  nationwideCoverage: boolean
  serviceAreaCity: string | null
  serviceAreaState: string | null
  serviceAreaPostalCode: string | null
  serviceAreaCountry: string | null
  serviceRadiusMiles: number | null
  serviceMode: 'local' | 'regional' | 'national' | null
  serviceAreaNotes: string | null
  distanceMiles: number | null
  matchReason: string
}

function normalize(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase()
}

function haversineMiles(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
) {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const earthRadiusMiles = 3958.8

  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLng / 2) ** 2

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return earthRadiusMiles * c
}

function coerceVenueObject(raw: ShowRow['venues']) {
  if (!raw) return null
  return Array.isArray(raw) ? raw[0] ?? null : raw
}

export default async function ShowVendorsPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const [
    { data: show, error: showError },
    { data: assignedRows, error: assignedError },
    { data: vendors, error: vendorsError },
    { data: serviceAreas, error: serviceAreasError },
    { data: ratings, error: ratingsError },
  ] = await Promise.all([
    supabase
      .from('shows')
      .select(`
        id,
        show_name,
        city,
        state,
        venue_id,
        venues (
          id,
          name,
          city,
          state,
          latitude,
          longitude
        )
      `)
      .eq('id', showId)
      .maybeSingle(),

    supabase
      .from('show_vendors')
      .select(`
        id,
        vendor_id,
        vendor_name_snapshot,
        service_type_snapshot,
        default_day_rate_snapshot
      `)
      .eq('show_id', showId)
      .order('vendor_name_snapshot', { ascending: true }),

    supabase
      .from('vendors')
      .select(`
        id,
        organization_id,
        vendor_name,
        partner_kind,
        freelancer_name,
        business_name,
        vendor_type,
        service_type,
        contact_name,
        email,
        phone,
        default_cost,
        is_active,
        preferred_vendor,
        travel_available,
        nationwide_coverage,
        website,
        notes
      `)
      .eq('is_active', true),

    supabase
      .from('vendor_service_areas')
      .select(`
        id,
        vendor_id,
        city,
        state,
        postal_code,
        country,
        latitude,
        longitude,
        service_radius_miles,
        service_mode,
        notes,
        is_primary
      `),

    supabase.from('freelancer_ratings').select('vendor_id, rating'),
  ])

  if (showError) throw new Error(showError.message)
  if (assignedError) throw new Error(assignedError.message)
  if (vendorsError) throw new Error(vendorsError.message)
  if (serviceAreasError) throw new Error(serviceAreasError.message)
  if (ratingsError) throw new Error(ratingsError.message)

  if (!show) notFound()

  const typedShow = show as ShowRow
  const venue = coerceVenueObject(typedShow.venues)

  const showCity = normalize(venue?.city ?? typedShow.city)
  const showState = normalize(venue?.state ?? typedShow.state)
  const showLat = venue?.latitude ?? null
  const showLng = venue?.longitude ?? null

  const assignedVendors = (assignedRows ?? []) as AssignedVendor[]
  const assignedVendorIds = new Set(
    assignedVendors
      .map((row) => row.vendor_id)
      .filter((value): value is string => Boolean(value))
  )

  const areaMap = new Map<string, ServiceAreaRow[]>()
  for (const area of (serviceAreas ?? []) as ServiceAreaRow[]) {
    const existing = areaMap.get(area.vendor_id) ?? []
    existing.push(area)
    areaMap.set(area.vendor_id, existing)
  }

  const groupedRatings = new Map<string, number[]>()
  for (const row of (ratings ?? []) as RatingRow[]) {
    const existing = groupedRatings.get(row.vendor_id) ?? []
    existing.push(Number(row.rating))
    groupedRatings.set(row.vendor_id, existing)
  }

  const nearbyFreelancers: FreelancerRecord[] = []
  const allFreelancers: FreelancerRecord[] = []
  const nearbyVendors: NearbyVendor[] = []

  for (const vendor of (vendors ?? []) as VendorRow[]) {
    if (!vendor.is_active) continue

    const vendorAreas = areaMap.get(vendor.id) ?? []
    const primaryArea = vendorAreas.find((area) => area.is_primary) ?? vendorAreas[0] ?? null

    const displayName =
      vendor.partner_kind === 'freelancer'
        ? vendor.freelancer_name || vendor.vendor_name || 'Unnamed Freelancer'
        : vendor.business_name || vendor.vendor_name || 'Unnamed Vendor'

    if (vendor.partner_kind === 'freelancer') {
      const ratingValues = groupedRatings.get(vendor.id) ?? []
      const ratingCount = ratingValues.length
      const averageRating =
        ratingCount > 0
          ? ratingValues.reduce((sum, value) => sum + value, 0) / ratingCount
          : null

      let distanceMiles: number | null = null
      let matchReason = 'Available freelancer'
      let includeNearby = false

      if (primaryArea) {
        const areaCity = normalize(primaryArea.city)
        const areaState = normalize(primaryArea.state)

        const hasVenueCoords =
          typeof showLat === 'number' &&
          typeof showLng === 'number' &&
          !Number.isNaN(showLat) &&
          !Number.isNaN(showLng)

        const hasAreaCoords =
          typeof primaryArea.latitude === 'number' &&
          typeof primaryArea.longitude === 'number' &&
          !Number.isNaN(primaryArea.latitude) &&
          !Number.isNaN(primaryArea.longitude)

        if (primaryArea.service_mode === 'national') {
          includeNearby = true
          matchReason = 'National coverage'
        } else if (hasVenueCoords && hasAreaCoords) {
          distanceMiles = haversineMiles(
            showLat as number,
            showLng as number,
            primaryArea.latitude as number,
            primaryArea.longitude as number
          )

          if (distanceMiles <= Number(primaryArea.service_radius_miles ?? 0)) {
            includeNearby = true
            matchReason = `Within ${Math.round(distanceMiles)} miles of venue`
          } else if (vendor.travel_available) {
            includeNearby = true
            matchReason = 'Will travel'
          }
        } else {
          const sameCity =
            !!showCity && !!showState && showCity === areaCity && showState === areaState
          const sameState = !!showState && showState === areaState

          if (sameCity) {
            includeNearby = true
            matchReason = 'Same city'
          } else if (sameState) {
            includeNearby = true
            matchReason = 'Same state'
          } else if (vendor.travel_available) {
            includeNearby = true
            matchReason = 'Will travel'
          }
        }
      } else if (vendor.travel_available) {
        includeNearby = true
        matchReason = 'Will travel'
      }

      const freelancerRecord: FreelancerRecord = {
        id: primaryArea ? `${vendor.id}-${primaryArea.id}` : vendor.id,
        vendorId: vendor.id,
        vendorName: displayName,
        serviceType: vendor.service_type ?? null,
        email: vendor.email ?? null,
        phone: vendor.phone ?? null,
        defaultCost: vendor.default_cost ?? null,
        preferredVendor: Boolean(vendor.preferred_vendor),
        travelAvailable: Boolean(vendor.travel_available),
        averageRating,
        ratingCount,
        serviceAreaCity: primaryArea?.city ?? null,
        serviceAreaState: primaryArea?.state ?? null,
        serviceAreaPostalCode: primaryArea?.postal_code ?? null,
        serviceAreaCountry: primaryArea?.country ?? null,
        serviceAreaNotes: primaryArea?.notes ?? null,
        distanceMiles,
        matchReason,
        alreadyAssigned: assignedVendorIds.has(vendor.id),
      }

      allFreelancers.push(freelancerRecord)

      if (includeNearby) {
        nearbyFreelancers.push(freelancerRecord)
      }

      continue
    }

    const vendorMatches: NearbyVendor[] = []

    for (const area of vendorAreas) {
      const areaCity = normalize(area.city)
      const areaState = normalize(area.state)

      const hasVenueCoords =
        typeof showLat === 'number' &&
        typeof showLng === 'number' &&
        !Number.isNaN(showLat) &&
        !Number.isNaN(showLng)

      const hasAreaCoords =
        typeof area.latitude === 'number' &&
        typeof area.longitude === 'number' &&
        !Number.isNaN(area.latitude) &&
        !Number.isNaN(area.longitude)

      let distanceMiles: number | null = null
      let matchReason = ''
      let include = false

      if (area.service_mode === 'national') {
        include = true
        matchReason = 'National service area'
      } else if (hasVenueCoords && hasAreaCoords) {
        distanceMiles = haversineMiles(
          showLat as number,
          showLng as number,
          area.latitude as number,
          area.longitude as number
        )

        if (distanceMiles <= area.service_radius_miles) {
          include = true
          matchReason = `Within ${area.service_radius_miles} mile service radius`
        }
      } else {
        const sameCity =
          !!showCity && !!showState && showCity === areaCity && showState === areaState
        const sameState = !!showState && showState === areaState

        if (sameCity) {
          include = true
          matchReason = 'Same city'
        } else if (
          sameState &&
          (area.service_mode === 'regional' || area.service_radius_miles >= 100)
        ) {
          include = true
          matchReason = 'Same state / regional coverage'
        }
      }

      if (!include) continue

      vendorMatches.push({
        id: `${vendor.id}-${area.id}`,
        vendorId: vendor.id,
        vendorName: displayName,
        serviceType: vendor.service_type,
        contactName: vendor.contact_name,
        email: vendor.email,
        phone: vendor.phone,
        website: vendor.website,
        vendorNotes: vendor.notes,
        preferredVendor: Boolean(vendor.preferred_vendor),
        nationwideCoverage: Boolean(vendor.nationwide_coverage),
        serviceAreaCity: area.city,
        serviceAreaState: area.state,
        serviceAreaPostalCode: area.postal_code,
        serviceAreaCountry: area.country,
        serviceRadiusMiles: area.service_radius_miles,
        serviceMode: area.service_mode,
        serviceAreaNotes: area.notes,
        distanceMiles,
        matchReason,
      })
    }

    if (!vendorMatches.length && vendor.nationwide_coverage) {
      vendorMatches.push({
        id: `${vendor.id}-nationwide`,
        vendorId: vendor.id,
        vendorName: displayName,
        serviceType: vendor.service_type,
        contactName: vendor.contact_name,
        email: vendor.email,
        phone: vendor.phone,
        website: vendor.website,
        vendorNotes: vendor.notes,
        preferredVendor: Boolean(vendor.preferred_vendor),
        nationwideCoverage: true,
        serviceAreaCity: null,
        serviceAreaState: null,
        serviceAreaPostalCode: null,
        serviceAreaCountry: null,
        serviceRadiusMiles: null,
        serviceMode: 'national',
        serviceAreaNotes: null,
        distanceMiles: null,
        matchReason: 'Nationwide coverage fallback',
      })
    }

    nearbyVendors.push(...vendorMatches)
  }

  nearbyFreelancers.sort((a, b) => {
    if (a.alreadyAssigned !== b.alreadyAssigned) return a.alreadyAssigned ? 1 : -1
    if (a.preferredVendor !== b.preferredVendor) return a.preferredVendor ? -1 : 1

    const aHasRating = (a.ratingCount ?? 0) > 0
    const bHasRating = (b.ratingCount ?? 0) > 0
    if (aHasRating !== bHasRating) return aHasRating ? -1 : 1

    if (
      typeof a.averageRating === 'number' &&
      typeof b.averageRating === 'number' &&
      a.averageRating !== b.averageRating
    ) {
      return b.averageRating - a.averageRating
    }

    const aHasDistance = typeof a.distanceMiles === 'number'
    const bHasDistance = typeof b.distanceMiles === 'number'
    if (aHasDistance && bHasDistance) return a.distanceMiles - b.distanceMiles
    if (aHasDistance !== bHasDistance) return aHasDistance ? -1 : 1

    return a.vendorName.localeCompare(b.vendorName)
  })

  allFreelancers.sort((a, b) => {
    if (a.alreadyAssigned !== b.alreadyAssigned) return a.alreadyAssigned ? 1 : -1
    if (a.preferredVendor !== b.preferredVendor) return a.preferredVendor ? -1 : 1
    return a.vendorName.localeCompare(b.vendorName)
  })

  nearbyVendors.sort((a, b) => {
    if (a.preferredVendor !== b.preferredVendor) return a.preferredVendor ? -1 : 1

    const aHasDistance = typeof a.distanceMiles === 'number'
    const bHasDistance = typeof b.distanceMiles === 'number'
    if (aHasDistance && bHasDistance) return a.distanceMiles - b.distanceMiles
    if (aHasDistance !== bHasDistance) return aHasDistance ? -1 : 1

    return a.vendorName.localeCompare(b.vendorName)
  })

  return (
    <ShowVendorsPageShell
      showId={showId}
      showName={typedShow.show_name ?? 'Untitled Show'}
      venueName={venue?.name ?? null}
      venueCity={venue?.city ?? typedShow.city}
      venueState={venue?.state ?? typedShow.state}
      assignedVendors={assignedVendors}
      nearbyFreelancers={nearbyFreelancers}
      allFreelancers={allFreelancers}
      nearbyVendors={nearbyVendors}
    />
  )
}