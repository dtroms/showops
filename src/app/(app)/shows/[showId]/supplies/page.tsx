import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { requireMembershipContext } from '@/lib/auth-context'
import { resolveShowAccess } from '@/lib/show-access'
import { canViewBudget } from '@/lib/permissions'
import { formatCurrency, formatShortDate } from '@/lib/format'

function shellClass() {
  return 'rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
}

function statCardClass() {
  return 'rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]'
}

export default async function ShowSuppliesPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId: ctx.organizationId,
    membershipId: ctx.membership.id,
    orgRole: ctx.orgRole,
  })

  if (!canViewBudget(access)) {
    notFound()
  }

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id, show_name, show_number')
    .eq('id', showId)
    .eq('organization_id', ctx.organizationId)
    .maybeSingle()

  if (showError || !show) {
    notFound()
  }

  const { data: items, error: itemsError } = await supabase
    .from('show_budget_line_items')
    .select(`
      id,
      line_name,
      quantity,
      unit_cost,
      subtotal,
      notes,
      created_at
    `)
    .eq('show_id', showId)
    .eq('section_type', 'supply')
    .order('created_at', { ascending: true })

  if (itemsError) {
    throw new Error(itemsError.message)
  }

  const total = (items ?? []).reduce(
    (sum, item) => sum + Number(item.subtotal ?? 0),
    0
  )

  return (
    <div className="space-y-6">
      <div className={shellClass()}>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h2 className="text-3xl font-semibold tracking-tight text-white">Supplies</h2>
            <p className="mt-2 text-sm text-slate-400">
              Supply-related budget lines for {show.show_name ?? 'this show'}.
            </p>
          </div>

          <Link
            href={`/shows/${showId}/budget-sheet`}
            className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Edit in Budget Sheet
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <div className={statCardClass()}>
          <p className="text-sm text-slate-500">Supply Lines</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {items?.length ?? 0}
          </p>
        </div>

        <div className={statCardClass()}>
          <p className="text-sm text-slate-500">Total Supply Cost</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {formatCurrency(total)}
          </p>
        </div>

        <div className={statCardClass()}>
          <p className="text-sm text-slate-500">Show Number</p>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
            {show.show_number ?? '—'}
          </p>
        </div>
      </div>

      <div className={shellClass()}>
        <div className="mb-4">
          <h3 className="text-lg font-semibold tracking-tight text-white">Supply Lines</h3>
          <p className="mt-1 text-sm text-slate-400">
            Review current supply items and related notes.
          </p>
        </div>

        {!items?.length ? (
          <div className="rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center text-sm text-slate-500">
            No supply lines added yet. Add them from the Budget Sheet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-[24px] border border-white/10 bg-white/[0.02]">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Quantity</th>
                  <th className="px-4 py-3 font-semibold">Unit Cost</th>
                  <th className="px-4 py-3 font-semibold">Subtotal</th>
                  <th className="px-4 py-3 font-semibold">Created</th>
                  <th className="px-4 py-3 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t border-white/10">
                    <td className="px-4 py-3 font-medium text-white">{item.line_name}</td>
                    <td className="px-4 py-3 text-slate-300">{item.quantity ?? 0}</td>
                    <td className="px-4 py-3 text-slate-300">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-4 py-3 font-medium text-white">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {formatShortDate(item.created_at?.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 text-slate-400">{item.notes || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}