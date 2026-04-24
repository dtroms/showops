'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export type PlatformCreateOrganizationState = {
  error?: string
  success?: string
  inviteUrl?: string
}

export type PlatformAdminActionState = {
  error?: string
  success?: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

async function requirePlatformAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('platform_role')
    .eq('id', user.id)
    .maybeSingle()

  if (profile?.platform_role !== 'platform_admin') {
    throw new Error('Only platform admins can perform this action.')
  }

  return { supabase, user }
}

function revalidatePlatformAdminPaths() {
  revalidatePath('/admin')
  revalidatePath('/admin/organizations')
}

export async function createOrganizationAndOwnerInvite(
  _prevState: PlatformCreateOrganizationState,
  formData: FormData
): Promise<PlatformCreateOrganizationState> {
  let createdOrganizationId: string | null = null

  try {
    const { user } = await requirePlatformAdmin()
    const admin = createAdminClient()

    const organizationName = String(formData.get('organizationName') || '').trim()
    const ownerEmail = normalizeEmail(String(formData.get('ownerEmail') || ''))

    if (!organizationName) {
      return { error: 'Organization name is required.' }
    }

    if (!ownerEmail) {
      return { error: 'Owner email is required.' }
    }

    // Global single-org email rule for first owner invite too
    const { data: existingProfiles, error: profileLookupError } = await admin
      .from('profiles')
      .select('id, organization_id, email')
      .eq('email', ownerEmail)
      .limit(1)

    if (profileLookupError) {
      return { error: profileLookupError.message }
    }

    const existingProfile = existingProfiles?.[0] ?? null
    if (existingProfile?.id) {
      return { error: 'That email already belongs to an existing account and cannot be reused for a new organization.' }
    }

    const { data: existingOrgRows, error: existingOrgError } = await admin
      .from('organizations')
      .select('id')
      .ilike('name', organizationName)
      .limit(1)

    if (existingOrgError) {
      return { error: existingOrgError.message }
    }

    const existingOrg = existingOrgRows?.[0] ?? null
    if (existingOrg?.id) {
      return { error: 'An organization with that name already exists.' }
    }

    const { data: organizationRows, error: organizationError } = await admin
      .from('organizations')
      .insert({
        name: organizationName,
      })
      .select('id')
      .limit(1)

    if (organizationError) {
      return { error: organizationError.message || 'Failed to create organization.' }
    }

    const organization = organizationRows?.[0] ?? null

    if (!organization?.id) {
      return { error: 'Failed to create organization.' }
    }

    createdOrganizationId = organization.id

    const token = crypto.randomBytes(24).toString('hex')

    const invitePayload = {
      organization_id: organization.id,
      email: ownerEmail,
      role: 'owner',
      token,
      invited_by_user_id: user.id,
      invited_by_membership_id: null,
    }

    const { data: inviteRows, error: inviteError } = await admin
      .from('organization_invites')
      .insert(invitePayload)
      .select('id, token')
      .limit(1)

    if (inviteError) {
      console.error('createOrganizationAndOwnerInvite: invite insert failed', {
        inviteError,
        invitePayload,
      })

      await admin.from('organizations').delete().eq('id', organization.id)

      return {
        error: inviteError.message || 'Failed to create owner invite.',
      }
    }

    const invite = inviteRows?.[0] ?? null
    if (!invite?.token) {
      await admin.from('organizations').delete().eq('id', organization.id)
      return { error: 'Failed to create owner invite.' }
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    revalidatePlatformAdminPaths()

    return {
      success: 'Organization created and owner invite generated.',
      inviteUrl: `${appUrl}/invite?token=${invite.token}`,
    }
  } catch (error) {
    if (createdOrganizationId) {
      try {
        const admin = createAdminClient()
        await admin.from('organizations').delete().eq('id', createdOrganizationId)
      } catch {
        // ignore rollback failure
      }
    }

    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to create organization and owner invite.',
    }
  }
}

export async function disableOrganization(
  organizationId: string
): Promise<PlatformAdminActionState> {
  try {
    if (!organizationId) {
      return { error: 'Organization id is required.' }
    }

    await requirePlatformAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('organizations')
      .update({
        disabled_at: new Date().toISOString(),
      })
      .eq('id', organizationId)

    if (error) {
      return { error: error.message }
    }

    revalidatePlatformAdminPaths()
    return { success: 'Organization disabled.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to disable organization.',
    }
  }
}

export async function enableOrganization(
  organizationId: string
): Promise<PlatformAdminActionState> {
  try {
    if (!organizationId) {
      return { error: 'Organization id is required.' }
    }

    await requirePlatformAdmin()
    const admin = createAdminClient()

    const { error } = await admin
      .from('organizations')
      .update({
        disabled_at: null,
      })
      .eq('id', organizationId)

    if (error) {
      return { error: error.message }
    }

    revalidatePlatformAdminPaths()
    return { success: 'Organization re-enabled.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to re-enable organization.',
    }
  }
}

export async function deleteOrganizationPermanently(
  organizationId: string
): Promise<PlatformAdminActionState> {
  try {
    if (!organizationId) {
      return { error: 'Organization id is required.' }
    }

    await requirePlatformAdmin()
    const admin = createAdminClient()

    // Gather org users first so their auth accounts can be removed too.
    const { data: orgProfiles, error: profileLookupError } = await admin
      .from('profiles')
      .select('id')
      .eq('organization_id', organizationId)

    if (profileLookupError) {
      return { error: profileLookupError.message }
    }

    const orgUserIds = (orgProfiles ?? []).map((row) => row.id)

    const deleteSteps: Array<{ table: string; column: string }> = [
      { table: 'audit_logs', column: 'organization_id' },
      { table: 'organization_invites', column: 'organization_id' },
      { table: 'show_vendors', column: 'organization_id' },
      { table: 'show_memberships', column: 'organization_id' },
      { table: 'show_budget_line_items', column: 'organization_id' },
      { table: 'budget_versions', column: 'organization_id' },
      { table: 'vendors', column: 'organization_id' },
      { table: 'venues', column: 'organization_id' },
      { table: 'clients', column: 'organization_id' },
      { table: 'organization_memberships', column: 'organization_id' },
      { table: 'shows', column: 'organization_id' },
    ]

    for (const step of deleteSteps) {
      const { error } = await admin
        .from(step.table)
        .delete()
        .eq(step.column, organizationId)

      if (error) {
        return {
          error: `Failed deleting ${step.table}: ${error.message}`,
        }
      }
    }

    if (orgUserIds.length > 0) {
      const { error: profileDeleteError } = await admin
        .from('profiles')
        .delete()
        .in('id', orgUserIds)

      if (profileDeleteError) {
        return { error: `Failed deleting profiles: ${profileDeleteError.message}` }
      }

      for (const userId of orgUserIds) {
        const { error: authDeleteError } = await admin.auth.admin.deleteUser(userId)
        if (authDeleteError) {
          return {
            error: `Failed deleting auth user ${userId.slice(0, 8)}: ${authDeleteError.message}`,
          }
        }
      }
    }

    const { error: orgDeleteError } = await admin
      .from('organizations')
      .delete()
      .eq('id', organizationId)

    if (orgDeleteError) {
      return { error: orgDeleteError.message }
    }

    revalidatePlatformAdminPaths()
    return { success: 'Organization permanently deleted, including its users.' }
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? error.message
          : 'Failed to permanently delete organization.',
    }
  }
}