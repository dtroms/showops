'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'

export type ProfileSettingsState = {
  error?: string
  success?: string
}

export async function updateMyProfile(
  _prevState: ProfileSettingsState,
  formData: FormData
): Promise<ProfileSettingsState> {
  try {
    const supabase = await createClient()
    const ctx = await requireMembershipContext()

    const fullName = String(formData.get('fullName') || '').trim()
    const newPassword = String(formData.get('newPassword') || '')
    const confirmPassword = String(formData.get('confirmPassword') || '')

    if (!fullName) {
      return { error: 'Full name is required.' }
    }

    if ((newPassword || confirmPassword) && newPassword.length < 8) {
      return { error: 'New password must be at least 8 characters.' }
    }

    if (newPassword !== confirmPassword) {
      return { error: 'New password and confirm password must match.' }
    }

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', ctx.userId)

    if (profileError) {
      return { error: profileError.message }
    }

    if (newPassword) {
      const { error: passwordError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (passwordError) {
        return { error: passwordError.message }
      }
    }

    revalidatePath('/settings/profile')
    revalidatePath('/dashboard')
    revalidatePath('/shows')

    return {
      success: newPassword
        ? 'Profile and password updated.'
        : 'Profile updated.',
    }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update profile.',
    }
  }
}