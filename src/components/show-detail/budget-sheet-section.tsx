'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { BudgetSheetTable } from './budget-sheet-table'
import { AddLineItemModal } from './add-line-item-modal'
import { VendorBudgetAddBack } from './vendor-budget-add-back'

type BudgetItem = {
  id: string
  version_id?: string | null
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  days?: number | null
  hours?: number | null
  unit_cost: number | null
  subtotal: number | null
  calculation_type?: string | null
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

type BudgetTarget = {
  category_key: string
  target_percent: number
  warning_percent: number | null
}

type BudgetPreset = {
  id: string
  category_key: string
  item_label: string
  default_cost: number
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(value: number) {
  return `${value.toFixed(1)}%`
}

function getKpiState(percentOfRevenue: number, target?: BudgetTarget) {
  if (!target) return null

  if (target.warning_percent !== null && percentOfRevenue > target.warning_percent) {
    return {
      label: `Over warning (${formatPercent(target.warning_percent)})`,
      className: 'border-rose-500/20 bg-rose-500/15 text-rose-300',
    }
  }

  if (percentOfRevenue > target.target_percent) {
    return {
      label: `Over target (${formatPercent(target.target_percent)})`,
      className: 'border-amber-500/20 bg-amber-500/15 text-amber-300',
    }
  }

  return {
    label: `On target (${formatPercent(target.target_percent)})`,
    className: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-300',
  }
}

export function BudgetSheetSection({
  showId,
  title,
  sectionType,
  subgroupType,
  subtotal,
  totalRevenue,
  items,
  showVendors = [],
  budgetTargets = [],
  presets = [],
  canManageOrgPresets = false,
}: {
  showId: string
  title: string
  sectionType: string
  subgroupType?: string
  subtotal: number
  totalRevenue: number
  items: BudgetItem[]
  showVendors?: ShowVendorOption[]
  budgetTargets?: BudgetTarget[]
  presets?: BudgetPreset[]
  canManageOrgPresets?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)

  const normalizedSectionType = normalizeSectionType(sectionType)
  const isFreelanceLaborSection = normalizedSectionType === 'freelance_labor'
  const supportsOrgDefaults =
    normalizedSectionType === 'supply' ||
    normalizedSectionType === 'shipping' ||
    normalizedSectionType === 'expedited'

  const vendorBudgetReferenceIds = useMemo(
    () =>
      new Set(
        items
          .map((item) => item.reference_id)
          .filter((value): value is string => Boolean(value))
      ),
    [items]
  )

  const missingAssignedVendors = isFreelanceLaborSection
    ? showVendors.filter((vendor) => !vendorBudgetReferenceIds.has(vendor.id))
    : []

  const percentOfRevenue = totalRevenue > 0 ? (subtotal / totalRevenue) * 100 : 0
  const target = budgetTargets.find((x) => x.category_key === normalizedSectionType)
  const kpiState = getKpiState(percentOfRevenue, target)

  return (
    <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-white/[0.02]"
      >
        <div>
          <p className="font-semibold text-white">{title}</p>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>
              {items.length} line item{items.length === 1 ? '' : 's'}
            </span>
            <span>•</span>
            <span>{formatPercent(percentOfRevenue)} of revenue</span>
            {kpiState ? (
              <>
                <span>•</span>
                <span className={cn('rounded-full border px-2 py-0.5', kpiState.className)}>
                  {kpiState.label}
                </span>
              </>
            ) : null}
          </div>
        </div>

        <div className="text-right">
          <p className="text-sm text-slate-500">Subtotal</p>
          <p className="font-semibold text-white">{formatCurrency(subtotal)}</p>
        </div>
      </button>

      {open ? (
        <div className="border-t border-white/10 p-5">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-semibold text-white">{title}</h3>
            </div>

            <div className="flex gap-2">
              {supportsOrgDefaults && canManageOrgPresets ? (
                <Link
                  href={`/settings/budget-presets/${normalizedSectionType}`}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  Manage Defaults
                </Link>
              ) : null}

              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
              >
                Add Line Item
              </button>
            </div>
          </div>

          {isFreelanceLaborSection ? (
            <VendorBudgetAddBack
              showId={showId}
              vendors={missingAssignedVendors}
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
          presets={presets}
          canManageOrgPresets={canManageOrgPresets}
          onClose={() => setModalOpen(false)}
        />
      ) : null}
    </div>
  )
}