import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewOrgFinancials } from '@/lib/permissions'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, orgRole, email } = ctx

  if (!canViewOrgFinancials(orgRole)) {
    return NextResponse.json(
      { error: 'Only workspace owners and org admins can manage billing' },
      { status: 403 }
    )
  }

  const { data: organization, error: organizationError } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('id', organizationId)
    .single<{ id: string; name: string | null; stripe_customer_id: string | null }>()

  if (organizationError || !organization) {
    return NextResponse.json(
      { error: organizationError?.message || 'Organization not found' },
      { status: 400 }
    )
  }

  let customerId = organization.stripe_customer_id

  if (!customerId) {
    const customer = await stripe.customers.create({
      name: organization.name ?? undefined,
      email: email ?? undefined,
      metadata: { organization_id: organization.id },
    })

    customerId = customer.id

    const { error: updateError } = await supabase
      .from('organizations')
      .update({ stripe_customer_id: customerId })
      .eq('id', organization.id)

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_ID_PRO_MONTHLY!, quantity: 1 }],
    success_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?checkout=success`,
    cancel_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing?checkout=canceled`,
    allow_promotion_codes: true,
    subscription_data: { metadata: { organization_id: organization.id } },
    metadata: { organization_id: organization.id },
  })

  return NextResponse.json({ url: session.url })
}