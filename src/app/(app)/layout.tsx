import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/app-shell'
import { TrialBanner } from '@/components/trial-banner'
import { canViewOrgAudit } from '@/lib/permissions'

const SUPPORT_MODE_COOKIE = 'showops_platform_support_mode'
const SUPPORT_ORG_COOKIE = 'showops_platform_support_org_id'

type ProfileRow = {
  organization_id: string | null
  full_name: string | null
  platform_role?: string | null
}

type MembershipRow = {
  id: string
  organization_id: string
  role: string
  status: string
}

type OrganizationRow = {
  id: string
  name: string
  subscription_status: string
  trial_ends_at: string | null
  disabled_at: string | null
}

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const cookieStore = await cookies()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id, full_name, platform_role')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>()

  if (profileError) {
    throw new Error(profileError.message)
  }

  const supportModeEnabled =
    profile?.platform_role === 'platform_admin' &&
    cookieStore.get(SUPPORT_MODE_COOKIE)?.value === 'true'

  const supportOrganizationId = cookieStore.get(SUPPORT_ORG_COOKIE)?.value ?? null

  let membership: MembershipRow | null = null
  let activeOrganizationId: string | null = null
  let activeRole: string | null = null

  if (supportModeEnabled && supportOrganizationId) {
    activeOrganizationId = supportOrganizationId
    activeRole = 'owner'
  } else {
    const { data: membershipRows, error: membershipError } = await supabase
      .from('organization_memberships')
      .select('id, organization_id, role, status')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .limit(1)
      .returns<MembershipRow[]>()

    if (membershipError) {
      throw new Error(membershipError.message)
    }

    membership = membershipRows?.[0] ?? null
    activeOrganizationId = membership?.organization_id ?? profile?.organization_id ?? null
    activeRole = membership?.role ?? null
  }

  if (!activeOrganizationId) {
    redirect('/finish-setup')
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, subscription_status, trial_ends_at, disabled_at')
    .eq('id', activeOrganizationId)
    .single<OrganizationRow>()

  if (organizationError || !organization) {
    redirect('/finish-setup')
  }

  if (organization.disabled_at && !supportModeEnabled) {
    redirect('/workspace-disabled')
  }

  if (!activeRole) {
    redirect('/finish-setup')
  }

  return (
    <AppShell
      user={{
        id: user.id,
        fullName: profile?.full_name ?? null,
        role: activeRole,
      }}
      organization={{
        id: organization.id,
        name: organization.name,
        subscriptionStatus: organization.subscription_status,
        trialEndsAt: organization.trial_ends_at,
      }}
      canViewAuditLog={canViewOrgAudit(activeRole as any)}
      supportMode={
        supportModeEnabled
          ? {
              active: true,
              organizationName: organization.name,
            }
          : undefined
      }
    >
      <TrialBanner
        subscriptionStatus={organization.subscription_status}
        trialEndsAt={organization.trial_ends_at}
      />
      {children}
    </AppShell>
  )
}