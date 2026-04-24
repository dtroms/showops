import { createAdminClient } from '@/lib/supabase/admin'
import { AcceptInviteForm } from '@/components/auth/accept-invite-form'

type InviteLookupRow = {
  id: string
  email: string
  role: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

export default async function InvitePage({
  searchParams,
}: {
  searchParams?: Promise<{ token?: string }>
}) {
  const resolved = searchParams ? await searchParams : undefined
  const token = resolved?.token?.trim() || ''

  let invite: InviteLookupRow | null = null

  if (token) {
    const admin = createAdminClient()

    const { data, error } = await admin
      .from('organization_invites')
      .select('id, email, role, expires_at, accepted_at, revoked_at')
      .eq('token', token)
      .limit(1)

    if (error) {
      throw new Error(error.message)
    }

    invite = (data ?? [])[0] ?? null
  }

  return (
    <div className="mx-auto max-w-lg p-6">
      <AcceptInviteForm token={token} invite={invite} />
    </div>
  )
}