import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShowDetailsForm } from '@/components/show-detail/show-details-form'

export default async function ShowDetailsPage({
  params,
}: {
  params: Promise<{ showId: string }>
}) {
  const { showId } = await params
  const supabase = await createClient()

  const { data: show, error } = await supabase
    .from('shows')
    .select(`
      id,
      show_name,
      show_number,
      city,
      state,
      start_date,
      end_date,
      estimated_revenue,
      status,
      internal_notes,
      venue_contact_name,
      venue_contact_email,
      venue_contact_phone,
      event_contact_name,
      event_contact_email,
      event_contact_phone,
      clients ( name ),
      venues ( name )
    `)
    .eq('id', showId)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!show) {
    notFound()
  }

  const clientName =
    Array.isArray(show.clients) && show.clients.length > 0
      ? show.clients[0]?.name ?? ''
      : (show.clients as { name?: string } | null)?.name ?? ''

  const venueName =
    Array.isArray(show.venues) && show.venues.length > 0
      ? show.venues[0]?.name ?? ''
      : (show.venues as { name?: string } | null)?.name ?? ''

  return (
    <ShowDetailsForm
      show={{
        id: show.id,
        showName: show.show_name ?? '',
        showNumber: show.show_number ?? '',
        clientName,
        venueName,
        city: show.city ?? '',
        state: show.state ?? '',
        startDate: show.start_date ?? '',
        endDate: show.end_date ?? '',
        estimatedRevenue: show.estimated_revenue ?? '',
        status: show.status ?? 'draft',
        internalNotes: show.internal_notes ?? '',
        venueContactName: show.venue_contact_name ?? '',
        venueContactEmail: show.venue_contact_email ?? '',
        venueContactPhone: show.venue_contact_phone ?? '',
        eventContactName: show.event_contact_name ?? '',
        eventContactEmail: show.event_contact_email ?? '',
        eventContactPhone: show.event_contact_phone ?? '',
      }}
    />
  )
}