import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { TrialBanner } from '@/components/trial-banner'

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.organization_id) {
    redirect('/finish-setup')
  }

  const { data: organization } = await supabase
    .from('organizations')
    .select('id, name, subscription_status, trial_ends_at, disabled_at')
    .eq('id', profile.organization_id)
    .single()

  if (!organization) {
    redirect('/finish-setup')
  }

  if (organization.disabled_at) {
    redirect('/workspace-disabled')
  }

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: profile.full_name,
        role: profile.role,
      }}
      organization={{
        id: organization.id,
        name: organization.name,
        subscriptionStatus: organization.subscription_status,
        trialEndsAt: organization.trial_ends_at,
      }}
    >
      <TrialBanner
        subscriptionStatus={organization.subscription_status}
        trialEndsAt={organization.trial_ends_at}
      />
      {children}
    </AppShell>
  )
}
