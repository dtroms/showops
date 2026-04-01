'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type FinishSetupState = {
  error?: string
}

export async function finishSetup(
  _prevState: FinishSetupState,
  formData: FormData
): Promise<FinishSetupState> {
  const fullName = String(formData.get('fullName') || '').trim()
  const workspaceName = String(formData.get('workspaceName') || '').trim()

  if (!fullName || !workspaceName) {
    return { error: 'Please fill out all fields.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in first.' }
  }

  const { error } = await supabase.rpc('finish_user_setup', {
    workspace_name: workspaceName,
    full_name: fullName,
  })

  if (error) {
    return { error: error.message }
  }

  redirect('/dashboard')
}