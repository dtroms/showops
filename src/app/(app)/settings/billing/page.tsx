import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewOrgFinancials } from '@/lib/permissions'

export default async function BillingPage() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, orgRole } = ctx

  if (!canViewOrgFinancials(orgRole)) {
    return (
      <div className="p-6">
        <div className="rounded-2xl border bg-white p-6">
          <h1 className="text-2xl font-bold">Billing</h1>
          <p className="mt-2 text-sm text-red-600">
            You do not have permission to manage billing.
          </p>
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
      trial_ends_at,
      stripe_customer_id
    `)
    .eq('id', organizationId)
    .single<{
      id: string
      name: string
      subscription_status: string | null
      trial_ends_at: string | null
      stripe_customer_id: string | null
    }>()

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

      <div className="grid gap-4 md:grid-cols-4">
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

        <div className="rounded-2xl border bg-white p-5">
          <p className="text-sm text-slate-500">Stripe Customer</p>
          <p className="mt-2 text-sm font-bold break-all">
            {organization.stripe_customer_id ?? 'Not created yet'}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-xl font-semibold">Manage Subscription</h2>
        <p className="mt-2 text-sm text-slate-600">
          Start a subscription or manage your existing billing details.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <form
            action="/api/stripe/checkout"
            method="post"
          >
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white"
            >
              Start / Update Subscription
            </button>
          </form>

          <form
            action="/api/stripe/portal"
            method="post"
          >
            <button
              type="submit"
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Open Billing Portal
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}