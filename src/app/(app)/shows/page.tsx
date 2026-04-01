import { createClient } from '@/lib/supabase/server'
import { AllShowsPageShell } from '@/components/shows/all-shows-page-shell'

export default async function AllShowsPage() {
  const supabase = await createClient()

  const { data: shows, error } = await supabase
    .from('show_budget_summaries')
    .select(`
      show_id,
      show_name,
      show_number,
      client_name,
      venue_name,
      city,
      start_date,
      end_date,
      status,
      estimated_revenue,
      total_estimated_cost,
      projected_profit,
      margin_percent
    `)
    .order('start_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return <AllShowsPageShell shows={shows ?? []} />
}