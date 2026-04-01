'use client'

import { useTransition } from 'react'
import { addAssignedVendorBudgetLine } from '@/app/actions/show-vendors'

type MissingVendor = {
  id: string
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
}

export function VendorBudgetAddBack({
  showId,
  missingVendors,
}: {
  showId: string
  missingVendors: MissingVendor[]
}) {
  const [pending, startTransition] = useTransition()

  if (!missingVendors.length) {
    return null
  }

  return (
    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
      <div className="mb-3">
        <h4 className="text-sm font-semibold text-amber-900">Add Assigned Vendor</h4>
        <p className="mt-1 text-sm text-amber-800">
          Re-add a vendor budget line for an already-assigned show vendor.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {missingVendors.map((vendor) => (
          <button
            key={vendor.id}
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await addAssignedVendorBudgetLine(vendor.id, showId)
              })
            }
            className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm font-medium text-amber-900 transition hover:bg-amber-100 disabled:opacity-50"
          >
            {vendor.vendor_name_snapshot}
            {vendor.service_type_snapshot ? ` — ${vendor.service_type_snapshot}` : ''}
          </button>
        ))}
      </div>
    </div>
  )
}