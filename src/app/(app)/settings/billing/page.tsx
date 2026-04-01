import { createClient } from '@/lib/supabase/server'

export default async function BillingPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="mt-2 text-sm text-red-600">No logged in user found.</p>
        </div>
      </div>
    )
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="mt-2 text-sm text-red-600">
            Could not load workspace profile.
          </p>
          <pre className="mt-4 text-xs text-slate-500">
            {JSON.stringify({ profileError, profile }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  const { data: organization, error: orgError } = await supabase
    .from('organizations')
    .select(`
      id,
      name,
      subscription_status,
      trial_ends_at
    `)
    .eq('id', profile.organization_id)
    .single()

  if (orgError || !organization) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="mt-2 text-sm text-red-600">
            Could not load organization billing info.
          </p>
          <pre className="mt-4 text-xs text-slate-500">
            {JSON.stringify({ orgError, organization }, null, 2)}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="rounded-2xl border bg-white p-6">
        <h1 className="text-3xl font-bold">Billing</h1>
        <p className="mt-2 text-sm text-slate-600">
          Review your workspace billing status.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Workspace</p>
          <p className="mt-2 text-xl font-bold">{organization.name}</p>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Subscription Status</p>
          <p className="mt-2 text-xl font-bold">
            {organization.subscription_status ?? '—'}
          </p>
        </div>

        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Trial Ends</p>
          <p className="mt-2 text-xl font-bold">
            {organization.trial_ends_at
              ? new Date(organization.trial_ends_at).toLocaleDateString()
              : '—'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Next Step</h2>
        <p className="mt-2 text-sm text-slate-600">
          This page shell is now working. We can add Stripe fields and actions next once we confirm your organizations table schema.
        </p>
      </div>
    </div>
  )
}