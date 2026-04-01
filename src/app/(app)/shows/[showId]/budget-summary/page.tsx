import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { formatCurrency, formatShortDate } from '@/lib/format'

type FreelanceVendor = {
  id: string
  vendor_name_snapshot: string
  vendor_type_snapshot: string | null
  service_type_snapshot: string | null
  contact_name_snapshot: string | null
}

type ShowDetailsRow = {
  venue_contact_name: string | null
  venue_contact_email: string | null
  venue_contact_phone: string | null
  event_contact_name: string | null
  event_contact_email: string | null
  event_contact_phone: string | null
}

export default async function ShowBudgetSummaryPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const [
    { data: summary, error: summaryError },
    { data: vendors, error: vendorError },
    { data: showDetails, error: showDetailsError },
  ] = await Promise.all([
    supabase
      .from('show_budget_summaries')
      .select('*')
      .eq('show_id', showId)
      .maybeSingle(),

    supabase
      .from('show_vendors')
      .select(`
        id,
        vendor_name_snapshot,
        vendor_type_snapshot,
        service_type_snapshot,
        contact_name_snapshot
      `)
      .eq('show_id', showId)
      .order('vendor_name_snapshot', { ascending: true }),

    supabase
      .from('shows')
      .select(`
        venue_contact_name,
        venue_contact_email,
        venue_contact_phone,
        event_contact_name,
        event_contact_email,
        event_contact_phone
      `)
      .eq('id', showId)
      .maybeSingle(),
  ])

  if (summaryError) throw new Error(summaryError.message)
  if (vendorError) throw new Error(vendorError.message)
  if (showDetailsError) throw new Error(showDetailsError.message)

  if (!summary) {
    notFound()
  }

  const details = (showDetails ?? {}) as ShowDetailsRow

  const revenue = Number(summary.estimated_revenue ?? 0)
  const totalCost = Number(summary.total_estimated_cost ?? 0)
  const profit = Number(summary.projected_profit ?? 0)
  const margin = summary.margin_percent

  const gearTotal = Number(summary.gear_total ?? 0)
  const vendorTotal = Number(summary.vendor_total ?? 0)
  const supplyTotal = Number(summary.supply_total ?? 0)
  const travelTotal = Number(summary.travel_total ?? 0)

  const freelanceVendors = ((vendors ?? []) as FreelanceVendor[]).filter(
    (vendor) =>
      vendor.vendor_type_snapshot === 'freelance' ||
      vendor.vendor_type_snapshot === 'both'
  )

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Show Dates
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {formatShortDate(summary.start_date)} - {formatShortDate(summary.end_date)}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Venue
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.venue_name ?? '—'}
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Location
            </p>
            <p className="mt-1 text-sm font-semibold text-slate-900">
              {summary.city ?? '—'}
              {summary.state ? `, ${summary.state}` : ''}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estimated Revenue</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatCurrency(revenue)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Estimated Cost</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {formatCurrency(totalCost)}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Projected Profit</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {formatCurrency(profit)}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Margin</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight">
            {margin ?? '—'}%
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Budget Category Totals</h3>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Gear</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(gearTotal)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Vendors</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(vendorTotal)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Supplies</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(supplyTotal)}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm text-slate-500">Travel</p>
            <p className="mt-2 text-2xl font-semibold">{formatCurrency(travelTotal)}</p>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4">
          <h3 className="text-lg font-semibold">Assigned Freelance Labor</h3>
        </div>

        {!freelanceVendors.length ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
            No freelance labor assigned yet..
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-slate-200">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Vendor</th>
                  <th className="px-4 py-3 font-semibold">Position</th>
                  <th className="px-4 py-3 font-semibold">Contact</th>
                </tr>
              </thead>
              <tbody>
                {freelanceVendors.map((vendor) => (
                  <tr key={vendor.id} className="border-t border-slate-200">
                    <td className="px-4 py-3 font-medium">{vendor.vendor_name_snapshot}</td>
                    <td className="px-4 py-3">{vendor.service_type_snapshot ?? '—'}</td>
                    <td className="px-4 py-3">{vendor.contact_name_snapshot ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Venue Contact</h3>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Name</p>
              <p className="mt-1 text-base font-semibold">{details.venue_contact_name ?? '—'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Phone</p>
              <p className="mt-1 text-base font-semibold">{details.venue_contact_phone ?? '—'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 text-base font-semibold">{details.venue_contact_email ?? '—'}</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4">
            <h3 className="text-lg font-semibold">Client / Event Contact</h3>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Name</p>
              <p className="mt-1 text-base font-semibold">{details.event_contact_name ?? '—'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Phone</p>
              <p className="mt-1 text-base font-semibold">{details.event_contact_phone ?? '—'}</p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm text-slate-500">Email</p>
              <p className="mt-1 text-base font-semibold">{details.event_contact_email ?? '—'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}