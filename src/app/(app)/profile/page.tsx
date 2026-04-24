import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { ProfileSettingsForm } from '@/components/settings/profile-settings-form'

export default async function ProfileSettingsPage() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .eq('id', ctx.userId)
    .single()

  if (error) {
    throw new Error(error.message)
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          My Settings
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Update your personal profile details.
        </p>
      </div>

      <ProfileSettingsForm
        profile={{
          fullName: profile.full_name ?? '',
          email: profile.email ?? '',
        }}
      />
    </div>
  )
}