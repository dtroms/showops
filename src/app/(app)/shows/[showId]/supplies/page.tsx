import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { formatCurrency, formatShortDate } from '@/lib/format'

export default async function ShowSuppliesPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select('id')
    .eq('id', showId)
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
      <div className="rounded-2xl border bg-white p-6">
        <h2 className="text-2xl font-bold">Show Supplies</h2>
        <p className="mt-2 text-sm text-slate-600">
          Supply-related budget lines for this show.
        </p>
      </div>

      <div className="rounded-2xl border bg-white p-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Supply Lines</h3>
          <p className="text-sm text-slate-500">
            Total: <span className="font-semibold">{formatCurrency(total)}</span>
          </p>
        </div>

        {!items?.length ? (
          <div className="rounded-xl border border-dashed p-6 text-sm text-slate-500">
            No supply lines added yet. Add them from the Budget Sheet.
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-4 py-3">Item</th>
                  <th className="px-4 py-3">Quantity</th>
                  <th className="px-4 py-3">Unit Cost</th>
                  <th className="px-4 py-3">Subtotal</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Notes</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} className="border-t">
                    <td className="px-4 py-3 font-medium">{item.line_name}</td>
                    <td className="px-4 py-3">{item.quantity ?? 0}</td>
                    <td className="px-4 py-3">{formatCurrency(item.unit_cost)}</td>
                    <td className="px-4 py-3 font-medium">
                      {formatCurrency(item.subtotal)}
                    </td>
                    <td className="px-4 py-3">
                      {formatShortDate(item.created_at?.slice(0, 10))}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{item.notes || '—'}</td>
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