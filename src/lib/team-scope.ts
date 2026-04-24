import type { SupabaseClient } from '@supabase/supabase-js'

type MembershipRow = {
  id: string
  reports_to_membership_id: string | null
  status: string
}

type ShowMembershipRow = {
  show_id: string
}

type ShowOwnerRow = {
  id: string
  lead_membership_id: string | null
  created_by_membership_id: string | null
}

export async function listManagedMembershipIds(
  supabase: SupabaseClient,
  organizationId: string,
  rootMembershipId: string
): Promise<string[]> {
  const { data, error } = await supabase
    .from('organization_memberships')
    .select('id, reports_to_membership_id, status')
    .eq('organization_id', organizationId)
    .returns<MembershipRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []).filter((row) => row.status === 'active')
  const childrenByParent = new Map<string, string[]>()

  for (const row of rows) {
    if (!row.reports_to_membership_id) continue
    const bucket = childrenByParent.get(row.reports_to_membership_id) ?? []
    bucket.push(row.id)
    childrenByParent.set(row.reports_to_membership_id, bucket)
  }

  const visited = new Set<string>()
  const queue = [rootMembershipId]

  while (queue.length) {
    const current = queue.shift()
    if (!current || visited.has(current)) continue
    visited.add(current)

    for (const childId of childrenByParent.get(current) ?? []) {
      if (!visited.has(childId)) {
        queue.push(childId)
      }
    }
  }

  return Array.from(visited)
}

export async function listVisibleShowIdsForMembershipScope(
  supabase: SupabaseClient,
  organizationId: string,
  membershipIds: string[]
): Promise<Set<string>> {
  if (!membershipIds.length) {
    return new Set()
  }

  const [{ data: showMemberships, error: showMembershipsError }, { data: shows, error: showsError }] =
    await Promise.all([
      supabase
        .from('show_memberships')
        .select('show_id')
        .eq('organization_id', organizationId)
        .in('membership_id', membershipIds)
        .returns<ShowMembershipRow[]>(),

      supabase
        .from('shows')
        .select('id, lead_membership_id, created_by_membership_id')
        .eq('organization_id', organizationId)
        .returns<ShowOwnerRow[]>(),
    ])

  if (showMembershipsError) throw new Error(showMembershipsError.message)
  if (showsError) throw new Error(showsError.message)

  const visible = new Set<string>((showMemberships ?? []).map((row) => row.show_id))

  for (const row of shows ?? []) {
    if (
      (row.lead_membership_id && membershipIds.includes(row.lead_membership_id)) ||
      (row.created_by_membership_id && membershipIds.includes(row.created_by_membership_id))
    ) {
      visible.add(row.id)
    }
  }

  return visible
}