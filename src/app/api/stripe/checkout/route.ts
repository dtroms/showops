import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'

export async function POST() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('organization_id, role').eq('id', user.id).single()
  if (!profile?.organization_id) return NextResponse.json({ error: 'Profile not found' }, { status: 400 })
  if (profile.role !== 'admin') return NextResponse.json({ error: 'Only workspace admins can manage billing' }, { status: 403 })

  const { data: organization } = await supabase.from('organizations').select('id, name, stripe_customer_id').eq('id', profile.organization_id).single()
  if (!organization) return NextResponse.json({ error: 'Organization not found' }, { status: 400 })

  let customerId = organization.stripe_customer_id
  if (!customerId) {
    const customer = await stripe.customers.create({
      name: organization.name,
      email: user.email,
      metadata: { organization_id: organization.id },
    })
    customerId = customer.id
    await supabase.from('organizations').update({ stripe_customer_id: customerId }).eq('id', organization.id)
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
