'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import {
  canEditBudgetStructure,
  canEditBudgetValues,
  isLeadershipRole,
  type ShowAccessContext,
} from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'

export type BudgetLineState = {
  error?: string
}

type CalculationType =
  | 'quantity_x_unit_cost'
  | 'quantity_x_days_x_unit_cost'
  | 'quantity_x_hours_x_unit_cost'
  | 'days_x_unit_cost'
  | 'hours_x_unit_cost'
  | 'flat_amount'
  | 'manual'

type ShowRow = {
  id: string
  organization_id: string
  show_name: string | null
  show_number: string | null
  status: string | null
  estimated_revenue: number | null
  start_date: string | null
  end_date: string | null
  lead_membership_id: string | null
  created_by_membership_id: string | null
}

type BudgetLineRow = {
  id: string
  organization_id: string
  show_id: string
  version_id: string | null
  section_type: string
  subgroup_type: string | null
  line_name: string
  quantity: number | null
  days: number | null
  hours: number | null
  unit_cost: number | null
  subtotal: number | null
  calculation_type: string | null
  overtime_enabled: boolean | null
  overtime_hours: number | null
  overtime_rate: number | null
  notes: string | null
  sort_order: number | null
  reference_id: string | null
}

const VALID_SECTION_TYPES = new Set([
  'gear',
  'vendor',
  'freelance_labor',
  'w2_labor',
  'supply',
  'travel',
  'shipping',
  'expedited',
])

const VALID_CALCULATION_TYPES = new Set<CalculationType>([
  'quantity_x_unit_cost',
  'quantity_x_days_x_unit_cost',
  'quantity_x_hours_x_unit_cost',
  'days_x_unit_cost',
  'hours_x_unit_cost',
  'flat_amount',
  'manual',
])

function revalidateBudgetPaths(showId: string) {
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}/budget-comparison`)
  revalidatePath(`/shows/${showId}`)
  revalidatePath('/dashboard')
  revalidatePath('/shows')
}

function parseTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function parseNullableText(formData: FormData, key: string) {
  const value = parseTrimmed(formData, key)
  return value || null
}

function parseNullableNumber(
  raw: string,
  label: string,
  options?: { min?: number }
): { value: number | null; error?: string } {
  if (!raw) return { value: null }
  const value = Number(raw)
  if (Number.isNaN(value)) return { value: null, error: `${label} must be a valid number.` }
  if (options?.min !== undefined && value < options.min) {
    return { value: null, error: `${label} must be at least ${options.min}.` }
  }
  return { value }
}

function normalizeSectionType(raw: string): string {
  const value = raw.trim().toLowerCase()
  if (value === 'vendor') return 'freelance_labor'
  return value
}

function resolveCalculationType(
  sectionType: string,
  formValue: string,
  days: number | null,
  hours: number | null
): CalculationType {
  const normalized = formValue.trim() as CalculationType
  if (VALID_CALCULATION_TYPES.has(normalized)) return normalized

  if (sectionType === 'freelance_labor') {
    if (days && days > 0) return 'days_x_unit_cost'
    return 'quantity_x_unit_cost'
  }

  if (sectionType === 'w2_labor') {
    if (hours && hours > 0) return 'quantity_x_hours_x_unit_cost'
    if (days && days > 0) return 'quantity_x_days_x_unit_cost'
    return 'quantity_x_unit_cost'
  }

  if (hours && hours > 0) return 'quantity_x_hours_x_unit_cost'
  if (days && days > 0) return 'quantity_x_days_x_unit_cost'
  return 'quantity_x_unit_cost'
}

function calculateSubtotal(params: {
  quantity: number
  days: number | null
  hours: number | null
  unitCost: number
  calculationType: CalculationType
  overtimeEnabled: boolean
  overtimeHours: number | null
  overtimeRate: number | null
  manualSubtotal: number | null
}) {
  const {
    quantity,
    days,
    hours,
    unitCost,
    calculationType,
    overtimeEnabled,
    overtimeHours,
    overtimeRate,
    manualSubtotal,
  } = params

  if (calculationType === 'manual') return manualSubtotal ?? 0

  let baseSubtotal = 0

  switch (calculationType) {
    case 'quantity_x_unit_cost':
      baseSubtotal = quantity * unitCost
      break
    case 'quantity_x_days_x_unit_cost':
      baseSubtotal = quantity * (days ?? 0) * unitCost
      break
    case 'quantity_x_hours_x_unit_cost':
      baseSubtotal = quantity * (hours ?? 0) * unitCost
      break
    case 'days_x_unit_cost':
      baseSubtotal = (days ?? 0) * unitCost
      break
    case 'hours_x_unit_cost':
      baseSubtotal = (hours ?? 0) * unitCost
      break
    case 'flat_amount':
      baseSubtotal = unitCost
      break
    default:
      baseSubtotal = quantity * unitCost
      break
  }

  const otSubtotal =
    overtimeEnabled && (overtimeHours ?? 0) > 0 && (overtimeRate ?? 0) > 0
      ? (overtimeHours ?? 0) * (overtimeRate ?? 0)
      : 0

  return baseSubtotal + otSubtotal
}

function getShowDayCount(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 1

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1

  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  return Math.max(1, diffDays)
}

async function getBudgetActionContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  return {
    supabase,
    organizationId: ctx.organizationId,
    membership: ctx.membership,
    orgRole: ctx.orgRole,
  }
}

async function getShowAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  showId: string,
  organizationId: string,
  membershipId: string,
  orgRole: ShowAccessContext['orgRole']
): Promise<{ show: ShowRow; access: ShowAccessContext }> {
  return resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId,
    orgRole,
  })
}

async function getBudgetVersionId(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  showId: string
  versionType?: 'pre' | 'post'
  providedVersionId?: string | null
}) {
  const { supabase, showId, versionType = 'pre', providedVersionId } = params

  if (providedVersionId) {
    return { versionId: providedVersionId, error: null as string | null }
  }

  const { data, error } = await supabase.rpc('get_or_create_current_budget_version', {
    target_show_id: showId,
    target_version_type: versionType,
  })

  if (error || !data) {
    return { versionId: null as string | null, error: error?.message || 'Failed to resolve budget version.' }
  }

  return { versionId: String(data), error: null as string | null }
}

export async function upsertOrgBudgetPreset(formData: FormData) {
  const ctx = await getBudgetActionContext()
  const { supabase, organizationId, orgRole } = ctx

  if (!isLeadershipRole(orgRole)) {
    throw new Error('Only leadership can update organization default costs.')
  }

  const categoryKey = parseTrimmed(formData, 'categoryKey')
  const itemLabel = parseTrimmed(formData, 'itemLabel')
  const defaultCostRaw = parseTrimmed(formData, 'defaultCost')

  if (!categoryKey || !itemLabel) throw new Error('Category and item label are required.')

  const parsedCost = Number(defaultCostRaw)
  if (Number.isNaN(parsedCost) || parsedCost < 0) {
    throw new Error('Default cost must be a valid non-negative number.')
  }

  const { error } = await supabase
    .from('organization_budget_item_presets')
    .upsert(
      {
        organization_id: organizationId,
        category_key: categoryKey,
        item_label: itemLabel,
        default_cost: parsedCost,
        is_active: true,
      },
      { onConflict: 'organization_id,category_key,item_label' }
    )

  if (error) throw new Error(error.message)
}

export async function createBudgetLine(
  _prevState: BudgetLineState,
  formData: FormData
): Promise<BudgetLineState> {
  try {
    const showId = parseTrimmed(formData, 'showId')
    const versionIdRaw = parseTrimmed(formData, 'versionId')
    const versionTypeRaw = parseTrimmed(formData, 'versionType')
    const sectionTypeInput = parseTrimmed(formData, 'sectionType')
    const subgroupType = parseNullableText(formData, 'subgroupType')
    const lineName = parseTrimmed(formData, 'lineName')
    const notes = parseNullableText(formData, 'notes')
    const referenceIdRaw = parseTrimmed(formData, 'referenceId')
    const quantityRaw = parseTrimmed(formData, 'quantity')
    const daysRaw = parseTrimmed(formData, 'days')
    const hoursRaw = parseTrimmed(formData, 'hours')
    const unitCostRaw = parseTrimmed(formData, 'unitCost')
    const subtotalRaw = parseTrimmed(formData, 'subtotal')
    const calculationTypeRaw = parseTrimmed(formData, 'calculationType')
    const sortOrderRaw = parseTrimmed(formData, 'sortOrder')
    const overtimeEnabled = String(formData.get('overtimeEnabled') || '') === 'true'
    const overtimeHoursRaw = parseTrimmed(formData, 'overtimeHours')
    const overtimeRateRaw = parseTrimmed(formData, 'overtimeRate')

    if (!showId) return { error: 'Show is required.' }

    const sectionType = normalizeSectionType(sectionTypeInput)
    if (!VALID_SECTION_TYPES.has(sectionType)) return { error: 'Invalid budget section.' }
    if (!lineName) return { error: 'Item name is required.' }

    const ctx = await getBudgetActionContext()
    const { supabase, organizationId, membership, orgRole } = ctx

    const { show, access } = await getShowAccess(
      supabase,
      showId,
      organizationId,
      membership.id,
      orgRole
    )

    if (!canEditBudgetStructure(access)) {
      return { error: 'You do not have permission to add budget lines.' }
    }

    const { versionId, error: versionError } = await getBudgetVersionId({
      supabase,
      showId,
      versionType: versionTypeRaw === 'post' ? 'post' : 'pre',
      providedVersionId: versionIdRaw || null,
    })

    if (versionError || !versionId) return { error: versionError || 'Version not found.' }

    const parsedQuantity = parseNullableNumber(quantityRaw || '1', 'Quantity', { min: 0 })
    const parsedDays = parseNullableNumber(daysRaw, 'Days', { min: 0 })
    const parsedHours = parseNullableNumber(hoursRaw, 'Hours', { min: 0 })
    const parsedUnitCost = parseNullableNumber(unitCostRaw, 'Unit cost', { min: 0 })
    const parsedSubtotal = parseNullableNumber(subtotalRaw, 'Subtotal', { min: 0 })
    const parsedOvertimeHours = parseNullableNumber(overtimeHoursRaw, 'Overtime hours', { min: 0 })
    const parsedOvertimeRate = parseNullableNumber(overtimeRateRaw, 'Overtime rate', { min: 0 })

    const parseError =
      parsedQuantity.error ||
      parsedDays.error ||
      parsedHours.error ||
      parsedUnitCost.error ||
      parsedSubtotal.error ||
      parsedOvertimeHours.error ||
      parsedOvertimeRate.error

    if (parseError) return { error: parseError }

    const quantity = parsedQuantity.value ?? 1
    let days = parsedDays.value
    const hours = parsedHours.value
    const unitCost = parsedUnitCost.value ?? 0

    if (sectionType === 'freelance_labor' && (!days || days <= 0)) {
      days = getShowDayCount(show.start_date ?? null, show.end_date ?? null)
    }

    const calculationType = resolveCalculationType(sectionType, calculationTypeRaw, days, hours)

    const subtotal = calculateSubtotal({
      quantity,
      days,
      hours,
      unitCost,
      calculationType,
      overtimeEnabled,
      overtimeHours: overtimeEnabled ? parsedOvertimeHours.value : null,
      overtimeRate: overtimeEnabled ? parsedOvertimeRate.value : null,
      manualSubtotal: parsedSubtotal.value,
    })

    const { data: maxSort } = await supabase
      .from('show_budget_line_items')
      .select('sort_order')
      .eq('show_id', showId)
      .eq('version_id', versionId)
      .eq('section_type', sectionType)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle<{ sort_order: number | null }>()

    const nextSortOrder =
      Number.isFinite(Number(sortOrderRaw))
        ? Number(sortOrderRaw)
        : Number(maxSort?.sort_order ?? -1) + 1

    const { error: insertError } = await supabase
      .from('show_budget_line_items')
      .insert({
        organization_id: organizationId,
        show_id: showId,
        version_id: versionId,
        section_type: sectionType,
        subgroup_type: subgroupType,
        line_name: lineName,
        quantity,
        days,
        hours,
        unit_cost: unitCost,
        subtotal,
        calculation_type: calculationType,
        source_type: 'manual',
        is_auto_generated: false,
        overtime_enabled: overtimeEnabled,
        overtime_hours: overtimeEnabled ? parsedOvertimeHours.value : null,
        overtime_rate: overtimeEnabled ? parsedOvertimeRate.value : null,
        notes,
        sort_order: nextSortOrder,
        created_by_membership_id: membership.id,
        updated_by_membership_id: membership.id,
        reference_id: referenceIdRaw || null,
      })

    if (insertError) return { error: insertError.message }

    revalidateBudgetPaths(showId)
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create budget line.',
    }
  }
}

export async function updateBudgetLine(
  _prevState: BudgetLineState,
  formData: FormData
): Promise<BudgetLineState> {
  try {
    const lineItemId = parseTrimmed(formData, 'lineItemId')
    const showId = parseTrimmed(formData, 'showId')
    const lineName = parseTrimmed(formData, 'lineName')
    const notes = parseNullableText(formData, 'notes')
    const quantityRaw = parseTrimmed(formData, 'quantity')
    const daysRaw = parseTrimmed(formData, 'days')
    const hoursRaw = parseTrimmed(formData, 'hours')
    const unitCostRaw = parseTrimmed(formData, 'unitCost')
    const subtotalRaw = parseTrimmed(formData, 'subtotal')
    const calculationTypeRaw = parseTrimmed(formData, 'calculationType')
    const overtimeEnabled = String(formData.get('overtimeEnabled') || '') === 'true'
    const overtimeHoursRaw = parseTrimmed(formData, 'overtimeHours')
    const overtimeRateRaw = parseTrimmed(formData, 'overtimeRate')

    if (!lineItemId || !showId) return { error: 'Budget line is required.' }

    const ctx = await getBudgetActionContext()
    const { supabase, organizationId, membership, orgRole } = ctx

    const [{ access }, { data: existing, error: existingError }] = await Promise.all([
      getShowAccess(supabase, showId, organizationId, membership.id, orgRole),
      supabase
        .from('show_budget_line_items')
        .select('*')
        .eq('id', lineItemId)
        .eq('organization_id', organizationId)
        .single<BudgetLineRow>(),
    ])

    if (existingError || !existing) return { error: existingError?.message || 'Budget line not found.' }
    if (!canEditBudgetValues(access)) return { error: 'You do not have permission to edit budget values.' }

    const parsedQuantity = parseNullableNumber(quantityRaw || '1', 'Quantity', { min: 0 })
    const parsedDays = parseNullableNumber(daysRaw, 'Days', { min: 0 })
    const parsedHours = parseNullableNumber(hoursRaw, 'Hours', { min: 0 })
    const parsedUnitCost = parseNullableNumber(unitCostRaw, 'Unit cost', { min: 0 })
    const parsedSubtotal = parseNullableNumber(subtotalRaw, 'Subtotal', { min: 0 })
    const parsedOvertimeHours = parseNullableNumber(overtimeHoursRaw, 'Overtime hours', { min: 0 })
    const parsedOvertimeRate = parseNullableNumber(overtimeRateRaw, 'Overtime rate', { min: 0 })

    const parseError =
      parsedQuantity.error ||
      parsedDays.error ||
      parsedHours.error ||
      parsedUnitCost.error ||
      parsedSubtotal.error ||
      parsedOvertimeHours.error ||
      parsedOvertimeRate.error

    if (parseError) return { error: parseError }

    const quantity = parsedQuantity.value ?? 1
    const days = parsedDays.value
    const hours = parsedHours.value
    const unitCost = parsedUnitCost.value ?? 0
    const sectionType = normalizeSectionType(existing.section_type)

    const calculationType = resolveCalculationType(
      sectionType,
      calculationTypeRaw || existing.calculation_type || '',
      days,
      hours
    )

    const subtotal = calculateSubtotal({
      quantity,
      days,
      hours,
      unitCost,
      calculationType,
      overtimeEnabled,
      overtimeHours: overtimeEnabled ? parsedOvertimeHours.value : null,
      overtimeRate: overtimeEnabled ? parsedOvertimeRate.value : null,
      manualSubtotal: parsedSubtotal.value,
    })

    const { error: updateError } = await supabase
      .from('show_budget_line_items')
      .update({
        line_name: lineName || existing.line_name,
        quantity,
        days,
        hours,
        unit_cost: unitCost,
        subtotal,
        calculation_type: calculationType,
        overtime_enabled: overtimeEnabled,
        overtime_hours: overtimeEnabled ? parsedOvertimeHours.value : null,
        overtime_rate: overtimeEnabled ? parsedOvertimeRate.value : null,
        notes,
        updated_by_membership_id: membership.id,
      })
      .eq('id', lineItemId)
      .eq('organization_id', organizationId)

    if (updateError) return { error: updateError.message }

    revalidateBudgetPaths(showId)
    return {}
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update budget line.',
    }
  }
}

export async function deleteBudgetLine(lineItemId: string, showId: string) {
  const ctx = await getBudgetActionContext()
  const { supabase, organizationId, membership, orgRole } = ctx

  const [{ access }] = await Promise.all([
    getShowAccess(supabase, showId, organizationId, membership.id, orgRole),
    Promise.resolve({ error: null }),
  ])

  if (!canEditBudgetStructure(access)) {
    throw new Error('You do not have permission to delete budget lines.')
  }

  const { error: deleteError } = await supabase
    .from('show_budget_line_items')
    .delete()
    .eq('id', lineItemId)
    .eq('organization_id', organizationId)

  if (deleteError) throw new Error(deleteError.message)

  revalidateBudgetPaths(showId)
}