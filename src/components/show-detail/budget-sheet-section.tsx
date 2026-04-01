'use client'

import { useState } from 'react'
import { BudgetSheetTable } from './budget-sheet-table'
import { AddLineItemModal } from './add-line-item-modal'
import { VendorBudgetAddBack } from './vendor-budget-add-back'

type BudgetItem = {
  id: string
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  unit_cost: number | null
  subtotal: number | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  overtime_rate: number | null
  notes: string | null
  reference_id?: string | null
}

type ShowVendorOption = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
}

export function BudgetSheetSection({
  showId,
  title,
  sectionType,
  subgroupType,
  subtotal,
  items,
  showVendors = [],
}: {
  showId: string
  title: string
  sectionType: string
  subgroupType?: string
  subtotal: number
  items: BudgetItem[]
  showVendors?: ShowVendorOption[]
}) {
  const [open, setOpen] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)

  const vendorBudgetReferenceIds = new Set(
    items
      .map((item) => item.reference_id)
      .filter((value): value is string => Boolean(value))
  )

  const missingAssignedVendors =
    sectionType === 'vendor'
      ? showVendors.filter((vendor) => !vendorBudgetReferenceIds.has(vendor.id))
      : []

  return (
    <div className="overflow-hidden rounded-2xl border bg-white">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-5 py-4 text-left"
      >
        <div>
          <p className="font-semibold">{title}</p>
          <p className="text-xs text-slate-500">
            {items.length} line item{items.length === 1 ? '' : 's'}
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Subtotal</p>
          <p className="font-semibold">${subtotal.toLocaleString()}</p>
        </div>
      </button>

      {open ? (
        <div className="border-t p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold">{title}</h3>
              <p className="text-sm text-slate-600">
                {sectionType === 'vendor'
                  ? 'Assigned vendors appear here as budget lines. You can also re-add removed vendor lines.'
                  : `Manage ${title.toLowerCase()} line items.`}
              </p>
            </div>

            {sectionType !== 'vendor' ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg border px-4 py-2 text-sm"
              >
                Add Line Item
              </button>
            ) : null}
          </div>

          {sectionType === 'vendor' ? (
            <VendorBudgetAddBack
              showId={showId}
              missingVendors={missingAssignedVendors}
            />
          ) : null}

          <BudgetSheetTable items={items} showId={showId} />
        </div>
      ) : null}

      {modalOpen ? (
        <AddLineItemModal
          showId={showId}
          sectionType={sectionType}
          subgroupType={subgroupType}
          title={title}
          showVendors={showVendors}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  )
}