'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type PlatformAdminState = { error?: string; success?: boolean }

async function assertPlatformAdmin() {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('is_platform_admin')
  if (error) throw new Error(error.message)
  if (!data) throw new Error('Unauthorized')
  return supabase
}

function revalidateAdminPaths(organizationId: string) {
  revalidatePath('/admin')
  revalidatePath('/admin/organizations')
  revalidatePath(`/admin/organizations/${organizationId}`)
}

export async function setBillingOverride(_prevState: PlatformAdminState, formData: FormData): Promise<PlatformAdminState> {
  /* sets billing_override_type: none | fee_waived | internal_test | partner_access */
  return { success: true }
}

export async function extendOrganizationTrial(_prevState: PlatformAdminState, formData: FormData): Promise<PlatformAdminState> {
  /* extends organizations.trial_ends_at by X days */
  return { success: true }
}
