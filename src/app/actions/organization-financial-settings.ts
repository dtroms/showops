'use server'

import { revalidatePath } from 'next/cache'
import { requireMembershipContext } from '@/lib/auth-context'
import { createClient } from '@/lib/supabase/server'
import { canViewOrgFinancials } from '@/lib/permissions'

function revalidateFinancialSettingPaths() {
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

export async function updateOrganizationFinancialSettings(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, orgRole } = ctx

  if (!canViewOrgFinancials(orgRole)) {
    throw new Error('You do not have permission to update financial settings.')
  }

  const gearPercentResult = parseOptionalPercent(
    formData.get('company_owned_gear_percent')
  )

  if (gearPercentResult.error) {
    throw new Error(`Company-owned gear allocation: ${gearPercentResult.error}`)
  }

  const companyOwnedGearPercent = gearPercentResult.value ?? 0

  const { error: upsertError } = await supabase
    .from('organization_financial_settings')
    .upsert(
      {
        organization_id: organizationId,
        company_owned_gear_percent: companyOwnedGearPercent,
      },
      {
        onConflict: 'organization_id',
      }
    )

  if (upsertError) {
    throw new Error(upsertError.message)
  }

  revalidateFinancialSettingPaths()
}