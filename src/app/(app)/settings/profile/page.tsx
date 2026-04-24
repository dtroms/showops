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
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <h1 className="text-3xl font-semibold tracking-tight text-white">My Settings</h1>
        <p className="mt-2 text-sm text-slate-400">
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