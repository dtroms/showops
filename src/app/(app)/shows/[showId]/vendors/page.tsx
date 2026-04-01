import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ShowVendorForm } from '@/components/show-detail/show-vendor-form'
import { ShowVendorTable } from '@/components/show-detail/show-vendor-table'

export default async function ShowVendorsPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id')
    .eq('id', showId)
    .maybeSingle()

  if (showError || !show) {
    notFound()
  }

  const [{ data: vendors, error: vendorsError }, { data: assigned, error: assignedError }] =
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
          service_type
        `)
        .eq('partner_kind', 'freelancer')
        .eq('is_active', true)
        .order('freelancer_name', { ascending: true }),

      supabase
        .from('show_vendors')
        .select(`
          id,
          vendor_id,
          vendor_name_snapshot,
          vendor_type_snapshot,
          service_type_snapshot,
          contact_name_snapshot,
          email_snapshot,
          phone_snapshot,
          default_day_rate_snapshot,
          notes
        `)
        .eq('show_id', showId)
        .order('vendor_name_snapshot', { ascending: true }),
    ])

  if (vendorsError) {
    throw new Error(vendorsError.message)
  }

  if (assignedError) {
    throw new Error(assignedError.message)
  }

  const normalizedVendors =
    (vendors ?? []).map((vendor: any) => ({
      id: vendor.id,
      vendor_name: vendor.freelancer_name || vendor.vendor_name,
      vendor_type: vendor.vendor_type,
      service_type: vendor.service_type,
      business_name: vendor.business_name ?? null,
    })) ?? []

  const normalizedAssigned =
    (assigned ?? []).map((vendor: any) => ({
      ...vendor,
      conflicts: [],
    })) ?? []

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Freelance Labor</h2>
        <p className="mt-2 text-sm text-slate-600">
          Assign freelance labor to this show for staffing, budgeting, and conflict tracking.
        </p>
      </div>

      <ShowVendorForm showId={showId} vendors={normalizedVendors} />

      <div className="rounded-2xl border bg-white p-6">
        <h3 className="text-lg font-semibold">Assigned Freelance Labor</h3>
        <p className="mt-1 text-sm text-slate-600">
          Freelancers currently assigned to this show.
        </p>

        <div className="mt-4">
          <ShowVendorTable showId={showId} vendors={normalizedAssigned} />
        </div>
      </div>
    </div>
  )
}