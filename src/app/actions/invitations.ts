'use server'

import crypto from 'node:crypto'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext, type OrgRole } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'
import { logCreateAuditEvent, logUpdateAuditEvent } from '@/lib/audit'
import { createAdminClient } from '@/lib/supabase/admin'

export type InviteState = {
  error?: string
  success?: string
  inviteUrl?: string
}

type InviteRow = {
  id: string
  organization_id: string
  email: string
  role: OrgRole
  token: string
  invited_by_user_id: string | null
  invited_by_membership_id: string | null
  accepted_by_user_id: string | null
  accepted_at: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase()
}

function revalidateInvitePaths() {
  revalidatePath('/settings/team')
  revalidatePath('/audit')
}

export async function createOrganizationInvite(
  _prevState: InviteState,
  formData: FormData
): Promise<InviteState> {
  try {
    const supabase = await createClient()
    const admin = createAdminClient()
    const ctx = await requireMembershipContext()

    const { organizationId, membership, orgRole, userId } = ctx

    if (!isLeadershipRole(orgRole)) {
      return { error: 'Only leadership can create invites.' }
    }

    const email = normalizeEmail(String(formData.get('email') || ''))
    const role = String(formData.get('role') || '').trim() as OrgRole

    const validRoles: OrgRole[] = [
      'owner',
      'org_admin',
      'ops_manager',
      'project_manager',
      'warehouse_admin',
      'coordinator',
      'crew',
    ]

    if (!email) return { error: 'Email is required.' }
    if (!validRoles.includes(role)) return { error: 'Invalid role.' }

    // Global single-org email rule
    const { data: existingProfiles, error: profileLookupError } = await admin
      .from('profiles')
      .select('id, organization_id, email')
      .eq('email', email)
      .limit(1)

    if (profileLookupError) {
      return { error: profileLookupError.message }
    }

    const existingProfile = existingProfiles?.[0] ?? null
    if (existingProfile?.id) {
      return { error: 'That email already belongs to an existing account and cannot be invited to another organization.' }
    }

    const { data: existingInviteRows, error: inviteLookupError } = await supabase
      .from('organization_invites')
      .select('id, organization_id, accepted_at, revoked_at, expires_at')
      .eq('email', email)
      .is('revoked_at', null)
      .is('accepted_at', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (inviteLookupError) {
      return { error: inviteLookupError.message }
    }

    const existingInvite = existingInviteRows?.[0] ?? null
    if (existingInvite?.id) {
      return { error: 'There is already an active invite for this email.' }
    }

    const token = crypto.randomBytes(24).toString('hex')

    const { data: inviteRows, error } = await supabase
      .from('organization_invites')
      .insert({
        organization_id: organizationId,
        email,
        role,
        token,
        invited_by_user_id: userId,
        invited_by_membership_id: membership.id,
      })
      .select('*')
      .limit(1)

    if (error) {
      return { error: error.message || 'Failed to create invite.' }
    }

    const invite = inviteRows?.[0] as InviteRow | undefined

    if (!invite) {
      return { error: 'Failed to create invite.' }
    }

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      'http://localhost:3000'

    const inviteUrl = `${appUrl}/invite?token=${invite.token}`

await logCreateAuditEvent({
  organizationId,
  actorUserId: userId,
  actorMembershipId: membership.id,
  entityType: 'organization_membership',
  entityId: invite.id,
  changeSummary: `Invited ${email} as ${role}`,
      afterJson: {
        invite_id: invite.id,
        email,
        role,
        expires_at: invite.expires_at,
      },
      metadataJson: {
        source: 'invitations.createOrganizationInvite',
      },
    })

    revalidateInvitePaths()

    return {
      success: 'Invite created.',
      inviteUrl,
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create invite.',
    }
  }
}

export async function revokeOrganizationInvite(inviteId: string): Promise<InviteState> {
  try {
    const supabase = await createClient()
    const ctx = await requireMembershipContext()

    const { organizationId, membership, orgRole, userId } = ctx

    if (!isLeadershipRole(orgRole)) {
      return { error: 'Only leadership can revoke invites.' }
    }

    const { data: inviteRows, error: fetchError } = await supabase
      .from('organization_invites')
      .select('*')
      .eq('id', inviteId)
      .eq('organization_id', organizationId)
      .limit(1)

    if (fetchError) {
      return { error: fetchError.message }
    }

    const invite = (inviteRows?.[0] ?? null) as InviteRow | null

    if (!invite) {
      return { error: 'Invite not found.' }
    }

    if (invite.accepted_at) {
      return { error: 'Accepted invites cannot be revoked.' }
    }

    const revokedAt = new Date().toISOString()

    const { error: updateError } = await supabase
      .from('organization_invites')
      .update({ revoked_at: revokedAt })
      .eq('id', inviteId)
      .eq('organization_id', organizationId)

    if (updateError) {
      return { error: updateError.message }
    }

await logUpdateAuditEvent({
  organizationId,
  actorUserId: userId,
  actorMembershipId: membership.id,
  entityType: 'organization_membership',
  entityId: inviteId,
  changeSummary: `Revoked invite for ${invite.email}`,
      before: {
        revoked_at: null,
      },
      after: {
        revoked_at: revokedAt,
      },
      metadataJson: {
        source: 'invitations.revokeOrganizationInvite',
        email: invite.email,
      },
    })

    revalidateInvitePaths()

    return { success: 'Invite revoked.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to revoke invite.',
    }
  }
}

export async function listOrganizationInvites() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, orgRole } = ctx

  if (!isLeadershipRole(orgRole)) {
    throw new Error('Only leadership can view invites.')
  }

  const { data, error } = await supabase
    .from('organization_invites')
    .select('*')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false })
    .returns<InviteRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  return data ?? []
}