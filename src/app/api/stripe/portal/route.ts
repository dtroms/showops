import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewOrgFinancials } from '@/lib/permissions'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, orgRole } = ctx

  if (!canViewOrgFinancials(orgRole)) {
    return NextResponse.json(
      { error: 'Only workspace owners and org admins can manage billing' },
      { status: 403 }
    )
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('stripe_customer_id')
    .eq('id', organizationId)
    .single<{ stripe_customer_id: string | null }>()

  if (organizationError || !organization?.stripe_customer_id) {
    return NextResponse.json(
      { error: organizationError?.message || 'Stripe customer not found' },
      { status: 400 }
    )
  }

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}