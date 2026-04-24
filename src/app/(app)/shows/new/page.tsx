import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { type OrgRole } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'
import { getUserDisplayMap } from '@/lib/user-display'
import { NewShowForm, type PMOption } from '@/components/shows/new-show-form'

type VenueRow = {
  id: string
  name: string
  address: string | null
  city: string | null
  state: string | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  primary_contact_phone: string | null
  is_active: boolean | null
}

type MembershipRow = {
  id: string
  user_id: string
  role: OrgRole
  status: 'invited' | 'active' | 'disabled'
}

export default async function NewShowPage() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const { organizationId, orgRole } = ctx
  const leadership = isLeadershipRole(orgRole)

  const [{ data: venues, error: venuesError }, { data: memberships, error: membershipsError }] =
    await Promise.all([
      supabase
        .from('venues')
        .select(`
          id,
          name,
          address,
          city,
          state,
          primary_contact_name,
          primary_contact_email,
          primary_contact_phone,
          is_active
        `)
        .eq('organization_id', organizationId)
        .order('name', { ascending: true })
        .returns<VenueRow[]>(),

      leadership
        ? supabase
            .from('organization_memberships')
            .select('id, user_id, role, status')
            .eq('organization_id', organizationId)
            .eq('status', 'active')
            .in('role', ['project_manager', 'ops_manager', 'org_admin', 'owner'])
            .order('created_at', { ascending: true })
            .returns<MembershipRow[]>()
        : Promise.resolve({ data: [], error: null }),
    ])

  if (venuesError) {
    throw new Error(venuesError.message)
  }

  if (membershipsError) {
    throw new Error(membershipsError.message)
  }

  const userDisplayMap = await getUserDisplayMap(
    supabase,
    (memberships ?? []).map((row) => row.user_id)
  )

  const pmOptions: PMOption[] = (memberships ?? []).map((row) => ({
    membership_id: row.id,
    name: userDisplayMap.get(row.user_id)?.label ?? row.user_id.slice(0, 8),
  }))

  return (
    <NewShowForm
      venues={venues ?? []}
      isLeadership={leadership}
      pmOptions={pmOptions}
    />
  )
}