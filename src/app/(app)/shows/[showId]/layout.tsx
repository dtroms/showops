import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShowShell } from '@/components/show-detail/show-shell'

export default async function ShowDetailLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const [{ data: show, error: showError }, { data: summary }] = await Promise.all([
    supabase
      .from('shows')
      .select('id, show_name, show_number, status, start_date, end_date')
      .eq('id', showId)
      .maybeSingle(),
    supabase
      .from('show_budget_summaries')
      .select('estimated_revenue, total_estimated_cost, projected_profit, margin_percent')
      .eq('show_id', showId)
      .maybeSingle(),
  ])

  if (showError || !show) {
    notFound()
  }

  return (
    <ShowShell
      show={show}
      summary={{
        estimated_revenue: summary?.estimated_revenue ?? 0,
        total_estimated_cost: summary?.total_estimated_cost ?? 0,
        projected_profit: summary?.projected_profit ?? 0,
        margin_percent: summary?.margin_percent ?? null,
      }}
    >
      {children}
    </ShowShell>
  )
}