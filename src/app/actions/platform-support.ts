'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit'

const SUPPORT_MODE_COOKIE = 'showops_platform_support_mode'
const SUPPORT_ORG_COOKIE = 'showops_platform_support_org_id'

async function requirePlatformAdmin() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('platform_role')
    .eq('id', user.id)
    .maybeSingle<{ platform_role: string | null }>()

  if (error) {
    throw new Error(error.message)
  }

  if (profile?.platform_role !== 'platform_admin') {
    throw new Error('Only platform admins can use support mode.')
  }

  return { supabase, user }
}

export async function enterOrganizationSupportMode(organizationId: string) {
  const { supabase, user } = await requirePlatformAdmin()

  if (!organizationId) {
    throw new Error('Organization id is required.')
  }

  const { data: organization, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('id', organizationId)
    .maybeSingle<{ id: string; name: string | null }>()

  if (error) {
    throw new Error(error.message)
  }

  if (!organization?.id) {
    throw new Error('Organization not found.')
  }

  await logAuditEvent({
    organizationId,
    actorUserId: user.id,
    actorPlatformRole: 'platform_admin',
    entityType: 'system',
    entityId: organizationId,
    actionType: 'impersonation_start',
    changeSummary: `Entered support mode for ${organization.name ?? organizationId}`,
    metadataJson: {
      source: 'platform-support.enterOrganizationSupportMode',
      organization_name: organization.name ?? null,
    },
  })

  const cookieStore = await cookies()

  cookieStore.set(SUPPORT_MODE_COOKIE, 'true', {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  cookieStore.set(SUPPORT_ORG_COOKIE, organizationId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  })

  redirect('/dashboard')
}

export async function exitOrganizationSupportMode() {
  const { supabase, user } = await requirePlatformAdmin()
  const cookieStore = await cookies()
  const organizationId = cookieStore.get(SUPPORT_ORG_COOKIE)?.value ?? null

  if (organizationId) {
    const { data: organization } = await supabase
      .from('organizations')
      .select('id, name')
      .eq('id', organizationId)
      .maybeSingle<{ id: string; name: string | null }>()

    await logAuditEvent({
      organizationId,
      actorUserId: user.id,
      actorPlatformRole: 'platform_admin',
      entityType: 'system',
      entityId: organizationId,
      actionType: 'impersonation_end',
      changeSummary: `Exited support mode for ${organization?.name ?? organizationId}`,
      metadataJson: {
        source: 'platform-support.exitOrganizationSupportMode',
        organization_name: organization?.name ?? null,
      },
    })
  }

  cookieStore.delete(SUPPORT_MODE_COOKIE)
  cookieStore.delete(SUPPORT_ORG_COOKIE)

  redirect('/admin')
}