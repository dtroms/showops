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
      <div className="rounded-2xl border border-dashed bg-white p-6 text-sm text-slate-500">
        No vendors found.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-slate-50 text-slate-600">
          <tr>
            <th className="px-4 py-3">Vendor</th>
            <th className="px-4 py-3">Type</th>
            <th className="px-4 py-3">Service</th>
            <th className="px-4 py-3">Contact</th>
            <th className="px-4 py-3">Default Cost</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {vendors.map((vendor) => (
            <tr key={vendor.id} className="border-t align-top">
              <td className="px-4 py-3 font-medium">{vendor.vendor_name}</td>
              <td className="px-4 py-3">{vendor.vendor_type}</td>
              <td className="px-4 py-3">{vendor.service_type ?? '—'}</td>
              <td className="px-4 py-3">
                <div>
                  <p>{vendor.contact_name ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.email ?? '—'}</p>
                  <p className="text-xs text-slate-500">{vendor.phone ?? '—'}</p>
                </div>
              </td>
              <td className="px-4 py-3">
                ${Number(vendor.default_cost ?? 0).toLocaleString()}
              </td>
              <td className="px-4 py-3">
                <VendorStatusBadge isActive={vendor.is_active} />
              </td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(vendor)}
                    className="rounded border px-3 py-1 text-xs"
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
                    <input
                      type="hidden"
                      name="nextValue"
                      value={String(!vendor.is_active)}
                    />
                    <button
                      disabled={pending}
                      className="rounded border px-3 py-1 text-xs"
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