'use server'

import { createClient } from '@/lib/supabase/server'
import { getUserDisplayMap, shortUserId } from '@/lib/user-display'

type AuditLogRow = {
  id: string
  organization_id: string | null
  actor_user_id: string | null
  actor_membership_id: string | null
  actor_platform_role: string | null
  entity_type: string
  entity_id: string
  show_id: string | null
  action_type: string
  change_summary: string
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  metadata_json: Record<string, unknown> | null
  reason: string | null
  created_at: string
}

type ShowRow = {
  id: string
  show_name: string | null
  show_number: string | null
}

export type AuditLogWithDisplay = AuditLogRow & {
  actor_display: string
  show_display: string | null
}

export async function listAuditLogs({
  organizationId,
  showId,
  limit = 200,
}: {
  organizationId?: string
  showId?: string
  limit?: number
}): Promise<AuditLogWithDisplay[]> {
  const supabase = await createClient()

  let query = supabase
    .from('audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (organizationId) {
    query = query.eq('organization_id', organizationId)
  }

  if (showId) {
    query = query.eq('show_id', showId)
  }

  const { data, error } = await query.returns<AuditLogRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  const logs = data ?? []

  const userIds = Array.from(
    new Set(
      logs
        .map((row) => row.actor_user_id)
        .filter((value): value is string => Boolean(value))
    )
  )

  const showIds = Array.from(
    new Set(
      logs
        .map((row) => row.show_id)
        .filter((value): value is string => Boolean(value))
    )
  )

  const [userMap, showsResult] = await Promise.all([
    getUserDisplayMap(supabase, userIds),
    showIds.length
      ? supabase
          .from('shows')
          .select('id, show_name, show_number')
          .in('id', showIds)
          .returns<ShowRow[]>()
      : Promise.resolve({ data: [], error: null }),
  ])

  if (showsResult.error) {
    throw new Error(showsResult.error.message)
  }

  const showMap = new Map((showsResult.data ?? []).map((row) => [row.id, row]))

  return logs.map((row) => {
    const show = row.show_id ? showMap.get(row.show_id) : null
    const showDisplay = show
      ? [show.show_name ?? 'Untitled Show', show.show_number ? `#${show.show_number}` : null]
          .filter(Boolean)
          .join(' ')
      : row.show_id
        ? `Show ${row.show_id.slice(0, 8)}`
        : null

   return {
  ...row,
  actor_display: row.actor_user_id
    ? userMap.get(row.actor_user_id)?.label ?? shortUserId(row.actor_user_id)
    : 'System',
  show_display: showDisplay,
}
  })
}