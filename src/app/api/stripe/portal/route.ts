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

  const { data: organization } = await supabase.from('organizations').select('stripe_customer_id').eq('id', profile.organization_id).single()
  if (!organization?.stripe_customer_id) return NextResponse.json({ error: 'Stripe customer not found' }, { status: 400 })

  const portalSession = await stripe.billingPortal.sessions.create({
    customer: organization.stripe_customer_id,
    return_url: `${process.env.NEXT_PUBLIC_SITE_URL}/settings/billing`,
  })

  return NextResponse.json({ url: portalSession.url })
}
