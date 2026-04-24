import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewAssignments } from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'

export async function POST(req: NextRequest) {
  const body = await req.json()
  const showId = String(body.showId || '')
  const vendorId = String(body.vendorId || '')

  if (!showId || !vendorId) {
    return NextResponse.json(
      { error: 'showId and vendorId are required' },
      { status: 400 }
    )
  }

  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId: membership.id,
    orgRole,
  })

  if (!canViewAssignments(access)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { data, error } = await supabase.rpc('get_vendor_conflicts_for_show', {
    target_show_id: showId,
    target_vendor_id: vendorId,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ conflicts: data ?? [] })
}