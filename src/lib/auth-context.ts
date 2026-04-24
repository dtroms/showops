import { createClient } from '@/lib/supabase/server'

export type OrgRole =
  | 'owner'
  | 'org_admin'
  | 'ops_manager'
  | 'project_manager'
  | 'coordinator'
  | 'warehouse_admin'
  | 'crew'

export type MembershipStatus = 'invited' | 'active' | 'disabled'

export type PlatformRole = 'platform_admin' | 'platform_support'

export interface ProfileFallback {
  id: string
  organization_id: string | null
  role: string | null
  full_name?: string | null
  email?: string | null
}

export interface OrganizationMembership {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  status: MembershipStatus
  reports_to_membership_id: string | null
  invited_by_membership_id: string | null
  created_at?: string
  updated_at?: string
}

export interface AuthContext {
  userId: string | null
  email: string | null
  isAuthenticated: boolean
  organizationId: string | null
  membership: OrganizationMembership | null
  orgRole: OrgRole | null
  platformRole: PlatformRole | null
  profileFallback: ProfileFallback | null
}

type MembershipRow = {
  id: string
  organization_id: string
  user_id: string
  role: OrgRole
  status: MembershipStatus
  reports_to_membership_id: string | null
  invited_by_membership_id: string | null
  created_at?: string
  updated_at?: string
}

type PlatformUserRow = {
  user_id: string
  platform_role: PlatformRole
  status: 'active' | 'disabled'
}

type ProfileRow = {
  id: string
  organization_id: string | null
  role: string | null
  full_name?: string | null
}

function normalizeLegacyRole(role: string | null | undefined): OrgRole | null {
  if (!role) return null

  switch (role) {
    case 'owner':
    case 'org_admin':
    case 'ops_manager':
    case 'project_manager':
    case 'coordinator':
    case 'warehouse_admin':
    case 'crew':
      return role
    case 'admin':
      return 'owner'
    default:
      return 'project_manager'
  }
}

function pickActiveMembership(
  memberships: MembershipRow[],
  fallbackOrgId: string | null
): MembershipRow | null {
  if (!memberships.length) return null

  const activeMemberships = memberships.filter((m) => m.status === 'active')
  if (!activeMemberships.length) return null

  if (fallbackOrgId) {
    const matching = activeMemberships.find((m) => m.organization_id === fallbackOrgId)
    if (matching) return matching
  }

  return activeMemberships[0] ?? null
}

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return {
      userId: null,
      email: null,
      isAuthenticated: false,
      organizationId: null,
      membership: null,
      orgRole: null,
      platformRole: null,
      profileFallback: null,
    }
  }

  const userId = user.id
  const email = user.email ?? null

  const [profileResult, membershipsResult, platformResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, organization_id, role, full_name')
      .eq('id', userId)
      .maybeSingle<ProfileRow>(),
    supabase
      .from('organization_memberships')
      .select(
        'id, organization_id, user_id, role, status, reports_to_membership_id, invited_by_membership_id, created_at, updated_at'
      )
      .eq('user_id', userId)
      .returns<MembershipRow[]>(),
    supabase
      .from('platform_users')
      .select('user_id, platform_role, status')
      .eq('user_id', userId)
      .eq('status', 'active')
      .maybeSingle<PlatformUserRow>(),
  ])

  if (profileResult.error) {
    console.error('getAuthContext: failed loading profile', profileResult.error)
  }

  if (membershipsResult.error) {
    console.error(
      'getAuthContext: failed loading organization_memberships',
      membershipsResult.error
    )
  }

  if (platformResult.error) {
    console.error('getAuthContext: failed loading platform_users', platformResult.error)
  }

  const profile = profileResult.data ?? null
  const memberships = membershipsResult.data ?? []
  const platformUser = platformResult.data ?? null

  const activeMembership = pickActiveMembership(memberships, profile?.organization_id ?? null)

  const normalizedProfileFallback: ProfileFallback | null = profile
    ? {
        id: profile.id,
        organization_id: profile.organization_id ?? null,
        role: profile.role ?? null,
        full_name: profile.full_name ?? null,
        email,
      }
    : null

  if (activeMembership) {
    return {
      userId,
      email,
      isAuthenticated: true,
      organizationId: activeMembership.organization_id,
      membership: activeMembership,
      orgRole: activeMembership.role,
      platformRole: platformUser?.platform_role ?? null,
      profileFallback: normalizedProfileFallback,
    }
  }

  const fallbackRole = normalizeLegacyRole(profile?.role)

  return {
    userId,
    email,
    isAuthenticated: true,
    organizationId: profile?.organization_id ?? null,
    membership: null,
    orgRole: fallbackRole,
    platformRole: platformUser?.platform_role ?? null,
    profileFallback: normalizedProfileFallback,
  }
}

export async function requireAuthContext(): Promise<AuthContext> {
  const ctx = await getAuthContext()

  if (!ctx.isAuthenticated || !ctx.userId) {
    throw new Error('Unauthorized')
  }

  return ctx
}

export async function requireOrgContext(): Promise<AuthContext> {
  const ctx = await requireAuthContext()

  if (!ctx.organizationId) {
    throw new Error('No organization context found for current user')
  }

  return ctx
}

export async function requireMembershipContext(): Promise<
  AuthContext & { membership: OrganizationMembership; orgRole: OrgRole; organizationId: string }
> {
  const ctx = await requireOrgContext()

  if (!ctx.membership || !ctx.orgRole || !ctx.organizationId) {
    throw new Error('Active organization membership required')
  }

  return {
    ...ctx,
    membership: ctx.membership,
    orgRole: ctx.orgRole,
    organizationId: ctx.organizationId,
  }
}

export function isLeadershipRole(role: OrgRole | null | undefined): boolean {
  return role === 'owner' || role === 'org_admin' || role === 'ops_manager'
}