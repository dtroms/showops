import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewOrgAudit } from '@/lib/permissions'
import { listAuditLogs } from '@/app/actions/audit-logs'
import { AuditLogTable } from '@/components/audit/audit-log-table'

export default async function AuditPage() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const { organizationId, orgRole } = ctx

  if (!canViewOrgAudit(orgRole)) {
    throw new Error('You do not have permission to view audit logs.')
  }

  const logs = await listAuditLogs({ organizationId })

  const { count: totalCount, error: countError } = await supabase
    .from('audit_logs')
    .select('*', { count: 'exact', head: true })
    .eq('organization_id', organizationId)

  if (countError) {
    throw new Error(countError.message)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight text-white">Audit Log</h1>
            <p className="mt-2 text-sm text-slate-400">
              Append-only activity history for organization changes, assignments, budgets,
              vendors, and shows.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
              Showing
            </p>
            <p className="mt-1 text-sm font-semibold text-white">
              {logs.length} most recent entries
              {typeof totalCount === 'number' ? ` of ${totalCount}` : ''}
            </p>
          </div>
        </div>
      </div>

      <AuditLogTable logs={logs} />
    </div>
  )
}