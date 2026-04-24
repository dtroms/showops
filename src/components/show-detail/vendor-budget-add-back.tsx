'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { addAssignedVendorBudgetLine } from '@/app/actions/show-vendors'

type VendorBudgetAddBackVendor = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot?: number | null
}

export function VendorBudgetAddBack({
  vendors,
  showId,
}: {
  vendors?: VendorBudgetAddBackVendor[] | null
  showId: string
}) {
  const safeVendors = vendors ?? []

  if (!safeVendors.length) return null

  return (
    <div className="mb-4 rounded-[24px] border border-amber-500/20 bg-amber-500/[0.08] p-4">
      <p className="text-sm font-medium text-amber-200">
        Re-add a freelance labor line for an assigned freelancer.
      </p>
      <p className="mt-1 text-sm text-amber-100/80">
        These freelancers are assigned to the show but do not currently have a
        freelance labor budget line.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {safeVendors.map((vendor) => (
          <ReAddVendorButton key={vendor.id} vendor={vendor} showId={showId} />
        ))}
      </div>
    </div>
  )
}

function ReAddVendorButton({
  vendor,
  showId,
}: {
  vendor: VendorBudgetAddBackVendor
  showId: string
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  return (
    <button
      type="button"
      onClick={() =>
        startTransition(async () => {
          await addAssignedVendorBudgetLine(vendor.id, showId)
          router.refresh()
        })
      }
      disabled={pending}
      className="rounded-xl border border-amber-500/20 bg-white/5 px-3 py-2 text-sm font-medium text-amber-200 transition hover:bg-white/10 disabled:opacity-50"
    >
      {pending ? 'Adding...' : `Add ${vendor.vendor_name_snapshot}`}
    </button>
  )
}