import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()

  const [
    { count: orgCount, error: orgCountError },
    { count: inviteCount, error: inviteCountError },
    { count: acceptedInviteCount, error: acceptedCountError },
  ] = await Promise.all([
    supabase.from('organizations').select('*', { count: 'exact', head: true }),
    supabase
      .from('organization_invites')
      .select('*', { count: 'exact', head: true })
      .is('revoked_at', null),
    supabase
      .from('organization_invites')
      .select('*', { count: 'exact', head: true })
      .not('accepted_at', 'is', null),
  ])

  if (orgCountError) throw new Error(orgCountError.message)
  if (inviteCountError) throw new Error(inviteCountError.message)
  if (acceptedCountError) throw new Error(acceptedCountError.message)

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Platform Admin
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Create organizations, send the first owner invite, and manage tenant setup.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Organizations</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {orgCount ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Total Invites</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
            {inviteCount ?? 0}
          </p>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Accepted Invites</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-emerald-600">
            {acceptedInviteCount ?? 0}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/admin/organizations"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Manage Organizations
          </Link>

          <Link
            href="/admin/organizations"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            Create New Organization
          </Link>
        </div>
      </div>
    </div>
  )
}