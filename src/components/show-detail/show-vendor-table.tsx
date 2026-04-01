'use client'

import { useTransition } from 'react'
import { removeVendorFromShow } from '@/app/actions/show-vendors'
import { formatCurrency, formatShortDate } from '@/lib/format'

type Conflict = {
  conflicting_show_id: string
  conflicting_show_name: string
  conflicting_show_number: string | null
  start_date: string | null
  end_date: string | null
  status: string | null
}

type ShowVendor = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  vendor_type_snapshot: string | null
  service_type_snapshot: string | null
  contact_name_snapshot: string | null
  email_snapshot: string | null
  phone_snapshot: string | null
  default_day_rate_snapshot: number | null
  notes: string | null
  conflicts: Conflict[]
}

export function ShowVendorTable({
  showId,
  vendors,
}: {
  showId: string
  vendors: ShowVendor[]
}) {
  const [pending, startTransition] = useTransition()

  if (!vendors.length) {
    return (
      <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-500">
        No freelance labor assigned to this show yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Day Rate</th>
            <th className="px-4 py-3">Conflict</th>
            <th className="px-4 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="border-t align-top">
              <td className="px-4 py-3 font-medium">{vendor.vendor_name_snapshot}</td>
              <td className="px-4 py-3">{vendor.vendor_type_snapshot ?? '—'}</td>
              <td className="px-4 py-3">{vendor.service_type_snapshot ?? '—'}</td>
              <td className="px-4 py-3">
                <div>
                  <p>{vendor.contact_name_snapshot ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.email_snapshot ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.phone_snapshot ?? '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                {formatCurrency(vendor.default_day_rate_snapshot)}
              </td>
              <td className="px-4 py-3">
                {vendor.conflicts.length ? (
                  <div className="space-y-2">
                    {vendor.conflicts.map((conflict) => (
                      <div
                        key={conflict.conflicting_show_id}
                        className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-xs text-amber-900"
                      >
                        <p className="font-medium">
                          {conflict.conflicting_show_name}
                          {conflict.conflicting_show_number
                            ? ` (${conflict.conflicting_show_number})`
                            : ''}
                        </p>
                        <p>
                          {formatShortDate(conflict.start_date)} →{' '}
                          {formatShortDate(conflict.end_date)}
                        </p>
                        <p>Status: {conflict.status ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-emerald-600">No conflict</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('Remove this freelancer from the show?')) return
                    startTransition(async () => {
                      await removeVendorFromShow(vendor.id, showId)
                    })
                  }}
                  className="rounded-lg border border-red-300 px-3 py-1.5 text-xs font-medium text-red-600 disabled:opacity-50"
                >
                  Remove
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}