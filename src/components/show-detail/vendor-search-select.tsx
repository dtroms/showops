'use client'

import { useMemo, useState } from 'react'

type VendorOption = {
  id: string
  vendor_name: string
  vendor_type: string | null
  service_type: string | null
  business_name?: string | null
}

export function VendorSearchSelect({
  vendors,
  name = 'vendorId',
}: {
  vendors: VendorOption[]
  name?: string
}) {
  const [query, setQuery] = useState('')
  const [selectedVendor, setSelectedVendor] = useState<VendorOption | null>(null)
  const [open, setOpen] = useState(false)

  const filteredVendors = useMemo(() => {
    const q = query.trim().toLowerCase()

    if (!q) {
      return vendors.slice(0, 12)
    }

    return vendors
      .filter((vendor) => {
        const haystack = [
          vendor.vendor_name,
          vendor.service_type ?? '',
          vendor.business_name ?? '',
        ]
          .join(' ')
          .toLowerCase()

        return haystack.includes(q)
      })
      .slice(0, 12)
  }, [vendors, query])

  return (
    <div className="relative">
      <input type="hidden" name={name} value={selectedVendor?.id ?? ''} />

      <label className="block text-sm font-medium">Freelancer</label>

      <input
        type="text"
        value={selectedVendor ? selectedVendor.vendor_name : query}
        onChange={(e) => {
          setSelectedVendor(null)
          setQuery(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        placeholder="Start typing a freelancer name..."
        className="mt-1 w-full rounded-lg border px-3 py-2"
      />

      {open ? (
        <div className="absolute z-20 mt-2 max-h-72 w-full overflow-auto rounded-xl border bg-white shadow-lg">
          {!filteredVendors.length ? (
            <div className="px-3 py-2 text-sm text-slate-500">No freelancers found.</div>
          ) : (
            filteredVendors.map((vendor) => (
              <button
                key={vendor.id}
                type="button"
                onClick={() => {
                  setSelectedVendor(vendor)
                  setQuery(vendor.vendor_name)
                  setOpen(false)
                }}
                className="block w-full border-b px-3 py-2 text-left text-sm hover:bg-slate-50"
              >
                <div className="font-medium text-slate-900">{vendor.vendor_name}</div>
                <div className="text-xs text-slate-500">
                  {vendor.service_type ?? '—'}
                  {vendor.business_name ? ` • ${vendor.business_name}` : ''}
                </div>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}