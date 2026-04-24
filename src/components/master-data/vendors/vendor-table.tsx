'use client'

import { useTransition } from 'react'
import { toggleVendorActive } from '@/app/actions/vendors'
import { VendorStatusBadge } from './vendor-status-badge'

type Vendor = {
  id: string
  vendor_name: string
  vendor_type: string
  service_type: string | null
  contact_name: string | null
  email: string | null
  phone: string | null
  city: string | null
  default_cost: number | null
  notes: string | null
  is_active: boolean
}

function formatCurrency(value: number | null | undefined) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(Number(value ?? 0))
}

export function VendorTable({
  vendors,
  onEdit,
}: {
  vendors: Vendor[]
  onEdit: (vendor: Vendor) => void
}) {
  const [pending, startTransition] = useTransition()

  if (!vendors.length) {
    return (
      <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] p-6 text-sm text-slate-500">
        No vendors found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.03]">
      <table className="w-full text-left text-sm">
        <thead className="bg-white/[0.03] text-slate-500">
          <tr>
            <th className="px-4 py-3 font-semibold">Vendor</th>
            <th className="px-4 py-3 font-semibold">Type</th>
            <th className="px-4 py-3 font-semibold">Service</th>
            <th className="px-4 py-3 font-semibold">Contact</th>
            <th className="px-4 py-3 font-semibold">Default Cost</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="border-t border-white/10 align-top hover:bg-white/[0.02]">
              <td className="px-4 py-3">
                <div>
                  <p className="font-medium text-white">{vendor.vendor_name}</p>
                  <p className="mt-1 text-xs text-slate-500">{vendor.notes || '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">{vendor.vendor_type}</td>
              <td className="px-4 py-3 text-slate-300">{vendor.service_type ?? '—'}</td>
              <td className="px-4 py-3">
                <div>
                  <p className="text-slate-300">{vendor.contact_name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.email ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.phone ?? '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3 text-slate-300">{formatCurrency(vendor.default_cost)}</td>
              <td className="px-4 py-3">
                <VendorStatusBadge isActive={vendor.is_active} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(vendor)}
                    className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    Edit
                  </button>

                  <form
                    action={(formData) => {
                      startTransition(async () => {
                        await toggleVendorActive(formData)
                      })
                    }}
                  >
                    <input type="hidden" name="vendorId" value={vendor.id} />
                    <input type="hidden" name="nextValue" value={String(!vendor.is_active)} />
                    <button
                      disabled={pending}
                      className="rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
                    >
                      {vendor.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </form>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}