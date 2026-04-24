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
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
        No freelance labor assigned to this show yet.
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/[0.03]">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Vendor</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Service</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Day Rate</th>
            <th className="px-4 py-3 font-semibold">Conflict</th>
            <th className="px-4 py-3 text-right font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="border-t border-white/10 align-top">
              <td className="px-4 py-3 font-medium text-white">{vendor.vendor_name_snapshot}</td>
              <td className="px-4 py-3 text-slate-300">{vendor.vendor_type_snapshot ?? '—'}</td>
              <td className="px-4 py-3 text-slate-300">{vendor.service_type_snapshot ?? '—'}</td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-slate-300">{vendor.contact_name_snapshot ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.email_snapshot ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.phone_snapshot ?? '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">
                {formatCurrency(vendor.default_day_rate_snapshot)}
              </td>
              <td className="px-4 py-3">
                {vendor.conflicts.length ? (
                  <div className="space-y-2">
                    {vendor.conflicts.map((conflict) => (
                      <div
                        key={conflict.conflicting_show_id}
                        className="rounded-xl border border-amber-500/20 bg-amber-500/[0.08] p-3 text-xs text-amber-200"
                      >
                        <p className="font-medium text-amber-100">
                          {conflict.conflicting_show_name}
                          {conflict.conflicting_show_number
                            ? ` (${conflict.conflicting_show_number})`
                            : ''}
                        </p>
                        <p className="mt-1">
                          {formatShortDate(conflict.start_date)} →{' '}
                          {formatShortDate(conflict.end_date)}
                        </p>
                        <p className="mt-1">Status: {conflict.status ?? '—'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-emerald-300">No conflict</span>
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
                  className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-300 disabled:opacity-50"
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