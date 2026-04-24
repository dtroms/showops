'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useFormState, useFormStatus } from 'react-dom'
import {
  createBudgetLine,
  upsertOrgBudgetPreset,
  type BudgetLineState,
} from '@/app/actions/budget-lines'

type ShowVendorOption = {
  id: string
  vendor_id: string | null
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
  suggested_days?: number | null
}

type BudgetPreset = {
  id: string
  category_key: string
  item_label: string
  default_cost: number
}

const initialState: BudgetLineState = {}

const TRAVEL_OPTIONS = [
  'Hotel',
  'Flight',
  'Per Diem',
  'Mileage',
  'Parking',
  'Rental Car',
  'Freight',
  'Baggage',
  'Uber',
  'Fuel',
  'Tolls',
]

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function panelClass() {
  return 'rounded-2xl border border-white/10 bg-white/[0.02] p-4'
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Line Item'}
    </button>
  )
}

function normalizeSectionType(sectionType: string) {
  if (sectionType === 'vendor') return 'freelance_labor'
  return sectionType
}

function getAutoCalculationType(sectionType: string) {
  const normalized = normalizeSectionType(sectionType)

  switch (normalized) {
    case 'gear':
      return 'quantity_x_days_x_unit_cost'
    case 'w2_labor':
      return 'quantity_x_hours_x_unit_cost'
    case 'freelance_labor':
      return 'days_x_unit_cost'
    default:
      return 'quantity_x_unit_cost'
  }
}

export function AddLineItemModal({
  showId,
  sectionType,
  subgroupType,
  title,
  showVendors = [],
  presets = [],
  canManageOrgPresets = false,
  onClose,
}: {
  showId: string
  sectionType: string
  subgroupType?: string
  title: string
  showVendors?: ShowVendorOption[]
  presets?: BudgetPreset[]
  canManageOrgPresets?: boolean
  onClose: () => void
}) {
  const [state, formAction] = useFormState(createBudgetLine, initialState)
  const [hasSubmitted, setHasSubmitted] = useState(false)
  const [savingDefault, startSavingDefault] = useTransition()
  const router = useRouter()

  const normalizedSectionType = normalizeSectionType(sectionType)
  const calculationType = getAutoCalculationType(normalizedSectionType)

  const [selectedShowVendorId, setSelectedShowVendorId] = useState('')
  const [selectedTravelType, setSelectedTravelType] = useState('')
  const [overtimeEnabled, setOvertimeEnabled] = useState(false)
  const [overtimeHours, setOvertimeHours] = useState('')
  const [overtimeRate, setOvertimeRate] = useState('')

  const [lineName, setLineName] = useState('')
  const [quantity, setQuantity] = useState(
    ['gear', 'supply', 'travel', 'shipping', 'expedited', 'w2_labor'].includes(
      normalizedSectionType
    )
      ? '1'
      : ''
  )
  const [days, setDays] = useState(
    normalizedSectionType === 'gear' || normalizedSectionType === 'freelance_labor'
      ? '1'
      : ''
  )
  const [hours, setHours] = useState(normalizedSectionType === 'w2_labor' ? '10' : '')
  const [unitCost, setUnitCost] = useState('0')

  const isFreelanceLabor = normalizedSectionType === 'freelance_labor'
  const isW2Labor = normalizedSectionType === 'w2_labor'
  const isTravel = normalizedSectionType === 'travel'
  const isLabor = isFreelanceLabor || isW2Labor
  const supportsAutosuggest =
    normalizedSectionType === 'supply' ||
    normalizedSectionType === 'shipping' ||
    normalizedSectionType === 'expedited'

  const selectedVendor = useMemo(
    () => showVendors.find((vendor) => vendor.id === selectedShowVendorId) ?? null,
    [showVendors, selectedShowVendorId]
  )

  const matchingPreset = useMemo(
    () =>
      presets.find(
        (preset) =>
          preset.category_key === normalizedSectionType &&
          preset.item_label.toLowerCase() === lineName.trim().toLowerCase()
      ) ?? null,
    [presets, normalizedSectionType, lineName]
  )

  useEffect(() => {
    if (isFreelanceLabor && selectedVendor) {
      setUnitCost(String(selectedVendor.default_day_rate_snapshot ?? 0))
      setDays(String(selectedVendor.suggested_days ?? 1))
    }
  }, [isFreelanceLabor, selectedVendor])

  useEffect(() => {
    if (supportsAutosuggest && matchingPreset) {
      setUnitCost(String(matchingPreset.default_cost ?? 0))
    }
  }, [supportsAutosuggest, matchingPreset])

  useEffect(() => {
    if (hasSubmitted && state && !state.error) {
      router.refresh()
      onClose()
    }
  }, [hasSubmitted, state, onClose, router])

  const resolvedLineName = (() => {
    if (isFreelanceLabor) return selectedVendor?.vendor_name_snapshot ?? ''
    if (isTravel) return selectedTravelType
    return lineName
  })()

  const datalistId = `preset-options-${normalizedSectionType}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Add Line Item — {title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form
          action={(formData) => {
            setHasSubmitted(true)
            return formAction(formData)
          }}
          className="space-y-4"
        >
          <input type="hidden" name="showId" value={showId} />
          <input type="hidden" name="sectionType" value={normalizedSectionType} />
          <input type="hidden" name="subgroupType" value={subgroupType ?? ''} />
          <input type="hidden" name="calculationType" value={calculationType} />
          <input type="hidden" name="overtimeEnabled" value={String(overtimeEnabled)} />
          <input type="hidden" name="lineName" value={resolvedLineName} />
          <input type="hidden" name="subtotal" value="" />
          <input type="hidden" name="sortOrder" value="0" />

          {isFreelanceLabor ? (
            <>
              <input type="hidden" name="referenceId" value={selectedShowVendorId} />
              <div>
                <label className="block text-sm font-medium text-slate-300">
                  Assigned Vendor
                </label>
                <select
                  required
                  value={selectedShowVendorId}
                  onChange={(e) => setSelectedShowVendorId(e.target.value)}
                  className={fieldClass()}
                >
                  <option value="">Select assigned vendor</option>
                  {showVendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id} className="bg-slate-900 text-white">
                      {vendor.vendor_name_snapshot}
                      {vendor.service_type_snapshot ? ` — ${vendor.service_type_snapshot}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <input type="hidden" name="referenceId" value="" />
          )}

          {isTravel ? (
            <div>
              <label className="block text-sm font-medium text-slate-300">Travel Item</label>
              <select
                required
                value={selectedTravelType}
                onChange={(e) => setSelectedTravelType(e.target.value)}
                className={fieldClass()}
              >
                <option value="">Select travel item</option>
                {TRAVEL_OPTIONS.map((item) => (
                  <option key={item} value={item} className="bg-slate-900 text-white">
                    {item}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {!isFreelanceLabor && !isTravel ? (
            <div>
              <label className="block text-sm font-medium text-slate-300">Item Name</label>
              <input
                value={lineName}
                onChange={(e) => setLineName(e.target.value)}
                required
                list={supportsAutosuggest ? datalistId : undefined}
                className={fieldClass()}
                placeholder={
                  supportsAutosuggest
                    ? 'Start typing to see suggested defaults...'
                    : 'Item name'
                }
              />
              {supportsAutosuggest ? (
                <datalist id={datalistId}>
                  {presets
                    .filter((preset) => preset.category_key === normalizedSectionType)
                    .map((preset) => (
                      <option key={preset.id} value={preset.item_label} />
                    ))}
                </datalist>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {['gear', 'supply', 'travel', 'shipping', 'expedited', 'w2_labor'].includes(
              normalizedSectionType
            ) ? (
              <div>
                <label className="block text-sm font-medium text-slate-300">Quantity</label>
                <input
                  name="quantity"
                  type="number"
                  step="1"
                  min="0"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  required
                  className={fieldClass()}
                />
              </div>
            ) : (
              <input type="hidden" name="quantity" value="1" />
            )}

            <div>
              <label className="block text-sm font-medium text-slate-300">Cost</label>
              <input
                name="unitCost"
                type="number"
                step="0.01"
                min="0"
                value={unitCost}
                onChange={(e) => setUnitCost(e.target.value)}
                required
                className={fieldClass()}
              />
            </div>

            {normalizedSectionType === 'gear' || normalizedSectionType === 'freelance_labor' ? (
              <div>
                <label className="block text-sm font-medium text-slate-300">Days</label>
                <input
                  name="days"
                  type="number"
                  step="1"
                  min="0"
                  value={days}
                  onChange={(e) => setDays(e.target.value)}
                  required
                  className={fieldClass()}
                />
              </div>
            ) : (
              <input type="hidden" name="days" value="" />
            )}

            {isW2Labor ? (
              <div>
                <label className="block text-sm font-medium text-slate-300">Hours</label>
                <input
                  name="hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                  className={fieldClass()}
                />
              </div>
            ) : (
              <input type="hidden" name="hours" value="" />
            )}
          </div>

          {isLabor ? (
            <div className={panelClass()}>
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-white">Overtime</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Add overtime hours and rate when this labor line needs OT billed separately.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setOvertimeEnabled((value) => !value)}
                  className={`rounded-2xl px-3 py-2 text-sm font-medium transition ${
                    overtimeEnabled
                      ? 'bg-white text-slate-950'
                      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {overtimeEnabled ? 'OT On' : 'Enable OT'}
                </button>
              </div>

              {overtimeEnabled ? (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Overtime Hours
                    </label>
                    <input
                      name="overtimeHours"
                      type="number"
                      step="0.25"
                      min="0"
                      value={overtimeHours}
                      onChange={(e) => setOvertimeHours(e.target.value)}
                      className={fieldClass()}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-300">
                      Overtime Rate
                    </label>
                    <input
                      name="overtimeRate"
                      type="number"
                      step="0.01"
                      min="0"
                      value={overtimeRate}
                      onChange={(e) => setOvertimeRate(e.target.value)}
                      className={fieldClass()}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <input type="hidden" name="overtimeHours" value="" />
                  <input type="hidden" name="overtimeRate" value="" />
                </>
              )}
            </div>
          ) : (
            <>
              <input type="hidden" name="overtimeHours" value="" />
              <input type="hidden" name="overtimeRate" value="" />
            </>
          )}

          {canManageOrgPresets && supportsAutosuggest && lineName && unitCost ? (
            <div className={panelClass()}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-white">Organization Suggested Cost</p>
                  <p className="mt-1 text-xs text-slate-500">
                    Leadership can save this item and price org-wide.
                  </p>
                </div>

                <button
                  type="button"
                  disabled={savingDefault}
                  onClick={() => {
                    startSavingDefault(async () => {
                      const fd = new FormData()
                      fd.set('categoryKey', normalizedSectionType)
                      fd.set('itemLabel', lineName)
                      fd.set('defaultCost', unitCost)
                      await upsertOrgBudgetPreset(fd)
                      router.refresh()
                    })
                  }}
                  className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
                >
                  {savingDefault ? 'Saving...' : 'Save Org Default'}
                </button>
              </div>
            </div>
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-300">Notes</label>
            <textarea name="notes" rows={3} className={fieldClass()} />
          </div>

          {state?.error ? (
            <p className="text-sm text-rose-300">{state.error}</p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton />
          </div>
        </form>
      </div>
    </div>
  )
}