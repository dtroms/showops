import { createClient } from '@/lib/supabase/server'
import { VenuesPageShell } from '@/components/master-data/venues/venues-page-shell'

export default async function VenuesPage() {
  const supabase = await createClient()

  const { data: venues, error } = await supabase
    .from('venues')
    .select(`
      id,
      name,
      address,
      city,
      state,
      notes,
      primary_contact_name,
      primary_contact_role,
      primary_contact_email,
      primary_contact_phone,
      is_active
    `)
    .order('name', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  return <VenuesPageShell venues={venues ?? []} />
}