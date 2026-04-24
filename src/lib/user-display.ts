import type { SupabaseClient } from '@supabase/supabase-js'

export type UserDisplay = {
  user_id: string
  full_name: string | null
  email: string | null
  label: string
}

type ProfileRow = {
  id: string
  full_name: string | null
  email: string | null
}

export function shortUserId(userId: string | null | undefined) {
  if (!userId) return 'unknown'
  return userId.slice(0, 8)
}

export function buildUserDisplayLabel(params: {
  fullName?: string | null
  email?: string | null
  userId?: string | null
}) {
  const fullName = params.fullName?.trim() || null
  const email = params.email?.trim() || null
  const userId = params.userId || null

  if (fullName) return fullName
  if (email) return email
  if (userId) return shortUserId(userId)
  return 'Unknown User'
}

export async function getUserDisplayMap(
  supabase: SupabaseClient,
  userIds: string[]
): Promise<Map<string, UserDisplay>> {
  const uniqueUserIds = Array.from(new Set(userIds.filter(Boolean)))

  if (!uniqueUserIds.length) {
    return new Map()
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', uniqueUserIds)
    .returns<ProfileRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  const rowMap = new Map((data ?? []).map((row) => [row.id, row]))
  const map = new Map<string, UserDisplay>()

  for (const userId of uniqueUserIds) {
    const row = rowMap.get(userId)

    map.set(userId, {
      user_id: userId,
      full_name: row?.full_name ?? null,
      email: row?.email ?? null,
      label: buildUserDisplayLabel({
        fullName: row?.full_name ?? null,
        email: row?.email ?? null,
        userId,
      }),
    })
  }

  return map
}