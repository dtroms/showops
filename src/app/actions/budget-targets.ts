'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewOrgFinancials } from '@/lib/permissions'

const CATEGORY_KEYS = ['gear', 'w2_labor', 'freelance_labor', 'supply', 'travel'] as const
type CategoryKey = (typeof CATEGORY_KEYS)[number]

type BudgetTargetRow = {
  organization_id: string
  category_key: CategoryKey
  target_percent: number
  warning_percent: number | null
}

function revalidateBudgetTargetPaths() {
  revalidatePath('/settings/budget-targets')
  revalidatePath('/settings')
  revalidatePath('/shows')
  revalidatePath('/dashboard')
}

function parseOptionalPercent(value: FormDataEntryValue | null) {
  const raw = String(value ?? '').trim()

  if (!raw) {
    return { value: null as number | null, error: null as string | null }
  }

  const parsed = Number(raw)

  if (Number.isNaN(parsed)) {
    return { value: null as number | null, error: 'Must be a valid number.' }
  }

  if (parsed < 0) {
    return { value: null as number | null, error: 'Must be 0 or greater.' }
  }

  return { value: parsed, error: null as string | null }
}

export async function updateBudgetTargets(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, orgRole } = ctx

  if (!canViewOrgFinancials(orgRole)) {
    throw new Error('You do not have permission to update budget targets.')
  }

  const rowsToUpsert: BudgetTargetRow[] = []
  const categoryKeysToDelete: CategoryKey[] = []

  for (const categoryKey of CATEGORY_KEYS) {
    const targetResult = parseOptionalPercent(formData.get(`${categoryKey}_target_percent`))
    if (targetResult.error) {
      throw new Error(`${categoryKey} target: ${targetResult.error}`)
    }

    const warningResult = parseOptionalPercent(formData.get(`${categoryKey}_warning_percent`))
    if (warningResult.error) {
      throw new Error(`${categoryKey} warning: ${warningResult.error}`)
    }

    const targetPercent = targetResult.value
    const warningPercent = warningResult.value

    if (targetPercent === null) {
      categoryKeysToDelete.push(categoryKey)
      continue
    }

    if (warningPercent !== null && warningPercent < targetPercent) {
      throw new Error(
        `${categoryKey} warning percent must be greater than or equal to the target percent.`
      )
    }

    rowsToUpsert.push({
      organization_id: organizationId,
      category_key: categoryKey,
      target_percent: targetPercent,
      warning_percent: warningPercent,
    })
  }

  if (rowsToUpsert.length > 0) {
    const { error: upsertError } = await supabase
      .from('organization_budget_targets')
      .upsert(rowsToUpsert, {
        onConflict: 'organization_id,category_key',
      })

    if (upsertError) {
      throw new Error(upsertError.message)
    }
  }

  if (categoryKeysToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('organization_budget_targets')
      .delete()
      .eq('organization_id', organizationId)
      .in('category_key', categoryKeysToDelete)

    if (deleteError) {
      throw new Error(deleteError.message)
    }
  }

  revalidateBudgetTargetPaths()
}