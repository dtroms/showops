'use server'

import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'

export type AcceptInviteState = {
  error?: string
  success?: string
}

type InviteRow = {
  id: string
  organization_id: string
  email: string
  role: string
  token: string
  accepted_at: string | null
  revoked_at: string | null
  expires_at: string
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

export async function acceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData
): Promise<AcceptInviteState> {
  try {
    const token = String(formData.get('token') || '').trim()
    const fullName = String(formData.get('fullName') || '').trim()
    const password = String(formData.get('password') || '')

    if (!token) return { error: 'Missing invite token.' }
    if (!fullName) return { error: 'Full name is required.' }
    if (password.length < 8) {
      return { error: 'Password must be at least 8 characters.' }
    }

    const admin = createAdminClient()

    const { data: inviteRows, error: inviteError } = await admin
      .from('organization_invites')
      .select('*')
      .eq('token', token)
      .limit(1)

    if (inviteError) {
      return { error: inviteError.message }
    }

    const invite = (inviteRows ?? [])[0] as InviteRow | undefined

    if (!invite) {
      return { error: 'Invite not found.' }
    }

    if (invite.revoked_at) {
      return { error: 'This invite has been revoked.' }
    }

    if (invite.accepted_at) {
      return { error: 'This invite has already been used.' }
    }

    if (new Date(invite.expires_at).getTime() < Date.now()) {
      return { error: 'This invite has expired.' }
    }

    // Global single-org email rule
    const { data: existingProfiles, error: existingProfileError } = await admin
      .from('profiles')
      .select('id, organization_id, email')
      .eq('email', invite.email)
      .limit(1)

    if (existingProfileError) {
      return { error: existingProfileError.message }
    }

    const existingProfile = existingProfiles?.[0] ?? null
    if (existingProfile?.id) {
      return {
        error:
          'This email is already tied to an existing organization account. It cannot join another organization.',
      }
    }

    const { data: createdUser, error: createUserError } =
      await admin.auth.admin.createUser({
        email: invite.email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
        },
      })

    if (createUserError || !createdUser.user) {
      console.error('acceptInvite: auth.admin.createUser failed', createUserError)
      return {
        error: createUserError?.message || 'Failed to create auth user.',
      }
    }

    const authUserId = createdUser.user.id

    const { error: profileError } = await admin
      .from('profiles')
      .upsert({
        id: authUserId,
        organization_id: invite.organization_id,
        email: invite.email,
        full_name: fullName,
      })

    if (profileError) {
      console.error('acceptInvite: profile upsert failed', profileError)
      await admin.auth.admin.deleteUser(authUserId)
      return { error: profileError.message }
    }

    const { error: membershipError } = await admin
      .from('organization_memberships')
      .insert({
        organization_id: invite.organization_id,
        user_id: authUserId,
        role: invite.role,
        status: 'active',
      })

    if (membershipError) {
      console.error('acceptInvite: membership insert failed', membershipError)
      await admin.from('profiles').delete().eq('id', authUserId)
      await admin.auth.admin.deleteUser(authUserId)
      return { error: membershipError.message }
    }

    const { error: inviteUpdateError } = await admin
      .from('organization_invites')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by_user_id: authUserId,
      })
      .eq('id', invite.id)

    if (inviteUpdateError) {
      console.error('acceptInvite: invite update failed', inviteUpdateError)
      return { error: inviteUpdateError.message }
    }

    redirect('/login')
  } catch (error) {
    if (isRedirectError(error)) {
      throw error
    }

    console.error('acceptInvite: unexpected failure', error)

    return {
      error: error instanceof Error ? error.message : 'Failed to accept invite.',
    }
  }
}