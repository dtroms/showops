import { createClient } from '@/lib/supabase/server'
import { DashboardShell } from '@/components/dashboard/dashboard-shell'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: shows, error } = await supabase
    .from('show_budget_summaries')
    .select('*')
    .order('start_date', { ascending: false })

  if (error) {
    throw new Error(error.message)
  }

  return <DashboardShell shows={shows ?? []} />
}