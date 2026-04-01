'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type CreateShowState = {
  error?: string
}

export type UpdateShowState = {
  error?: string
  success?: boolean
}

function revalidateShowPaths(showId: string) {
  revalidatePath('/dashboard')
  revalidatePath('/shows')
  revalidatePath(`/shows/${showId}`)
  revalidatePath(`/shows/${showId}/show-details`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/vendors`)
  revalidatePath(`/shows/${showId}/supplies`)
  revalidatePath(`/shows/${showId}/travel`)
}

export async function createShow(
  _prevState: CreateShowState,
  formData: FormData
): Promise<CreateShowState> {
  const showName = String(formData.get('showName') || '').trim()
  const showNumber = String(formData.get('showNumber') || '').trim()
  const clientName = String(formData.get('clientName') || '').trim()
  const venueName = String(formData.get('venueName') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const state = String(formData.get('state') || '').trim()
  const startDate = String(formData.get('startDate') || '').trim()
  const endDate = String(formData.get('endDate') || '').trim()
  const estimatedRevenueRaw = String(formData.get('estimatedRevenue') || '').trim()

  if (
    !showName ||
    !showNumber ||
    !clientName ||
    !venueName ||
    !city ||
    !state ||
    !startDate ||
    !endDate
  ) {
    return { error: 'Please fill out all required fields.' }
  }

  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : null

  if (estimatedRevenueRaw && Number.isNaN(estimatedRevenue)) {
    return { error: 'Estimated revenue must be a valid number.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { error: 'Organization not found for this user.' }
  }

  let clientId: string | null = null
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('name', clientName)
    .maybeSingle()

  if (existingClient?.id) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientInsertError } = await supabase
      .from('clients')
      .insert({
        organization_id: profile.organization_id,
        name: clientName,
      })
      .select('id')
      .single()

    if (clientInsertError || !newClient?.id) {
      return { error: clientInsertError?.message || 'Failed to create client.' }
    }

    clientId = newClient.id
  }

  let venueId: string | null = null
  const { data: existingVenue } = await supabase
    .from('venues')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('name', venueName)
    .eq('city', city)
    .eq('state', state)
    .maybeSingle()

  if (existingVenue?.id) {
    venueId = existingVenue.id
  } else {
    const { data: newVenue, error: venueInsertError } = await supabase
      .from('venues')
      .insert({
        organization_id: profile.organization_id,
        name: venueName,
        city,
        state,
      })
      .select('id')
      .single()

    if (venueInsertError || !newVenue?.id) {
      return { error: venueInsertError?.message || 'Failed to create venue.' }
    }

    venueId = newVenue.id
  }

  const { data: show, error: showError } = await supabase
    .from('shows')
    .insert({
      organization_id: profile.organization_id,
      show_name: showName,
      show_number: showNumber,
      client_id: clientId,
      venue_id: venueId,
      city,
      state,
      start_date: startDate,
      end_date: endDate,
      estimated_revenue: estimatedRevenue,
      status: 'draft',
    })
    .select('id')
    .single()

  if (showError || !show?.id) {
    return { error: showError?.message || 'Failed to create show.' }
  }

  redirect(`/shows/${show.id}/budget-summary`)
}

export async function updateShowDetails(
  _prevState: UpdateShowState,
  formData: FormData
): Promise<UpdateShowState> {
  const showId = String(formData.get('showId') || '').trim()
  const showName = String(formData.get('showName') || '').trim()
  const showNumber = String(formData.get('showNumber') || '').trim()
  const clientName = String(formData.get('clientName') || '').trim()
  const venueName = String(formData.get('venueName') || '').trim()
  const city = String(formData.get('city') || '').trim()
  const state = String(formData.get('state') || '').trim()
  const startDate = String(formData.get('startDate') || '').trim()
  const endDate = String(formData.get('endDate') || '').trim()
  const estimatedRevenueRaw = String(formData.get('estimatedRevenue') || '').trim()
  const status = String(formData.get('status') || '').trim()
  const internalNotes = String(formData.get('internalNotes') || '').trim() || null

  const venueContactName = String(formData.get('venueContactName') || '').trim() || null
  const venueContactEmail = String(formData.get('venueContactEmail') || '').trim() || null
  const venueContactPhone = String(formData.get('venueContactPhone') || '').trim() || null
  const eventContactName = String(formData.get('eventContactName') || '').trim() || null
  const eventContactEmail = String(formData.get('eventContactEmail') || '').trim() || null
  const eventContactPhone = String(formData.get('eventContactPhone') || '').trim() || null

  if (
    !showId ||
    !showName ||
    !showNumber ||
    !clientName ||
    !venueName ||
    !city ||
    !state ||
    !startDate ||
    !endDate ||
    !status
  ) {
    return { error: 'Please fill out all required fields.' }
  }

  const estimatedRevenue = estimatedRevenueRaw ? Number(estimatedRevenueRaw) : null

  if (estimatedRevenueRaw && Number.isNaN(estimatedRevenue)) {
    return { error: 'Estimated revenue must be a valid number.' }
  }

  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'You must be logged in.' }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    return { error: 'Organization not found for this user.' }
  }

  let clientId: string | null = null
  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('name', clientName)
    .maybeSingle()

  if (existingClient?.id) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientInsertError } = await supabase
      .from('clients')
      .insert({
        organization_id: profile.organization_id,
        name: clientName,
      })
      .select('id')
      .single()

    if (clientInsertError || !newClient?.id) {
      return { error: clientInsertError?.message || 'Failed to create client.' }
    }

    clientId = newClient.id
  }

  let venueId: string | null = null
  const { data: existingVenue } = await supabase
    .from('venues')
    .select('id')
    .eq('organization_id', profile.organization_id)
    .eq('name', venueName)
    .eq('city', city)
    .eq('state', state)
    .maybeSingle()

  if (existingVenue?.id) {
    venueId = existingVenue.id
  } else {
    const { data: newVenue, error: venueInsertError } = await supabase
      .from('venues')
      .insert({
        organization_id: profile.organization_id,
        name: venueName,
        city,
        state,
      })
      .select('id')
      .single()

    if (venueInsertError || !newVenue?.id) {
      return { error: venueInsertError?.message || 'Failed to create venue.' }
    }

    venueId = newVenue.id
  }

  const { error: updateError } = await supabase
    .from('shows')
    .update({
      show_name: showName,
      show_number: showNumber,
      client_id: clientId,
      venue_id: venueId,
      city,
      state,
      start_date: startDate,
      end_date: endDate,
      estimated_revenue: estimatedRevenue,
      status,
      internal_notes: internalNotes,
      venue_contact_name: venueContactName,
      venue_contact_email: venueContactEmail,
      venue_contact_phone: venueContactPhone,
      event_contact_name: eventContactName,
      event_contact_email: eventContactEmail,
      event_contact_phone: eventContactPhone,
    })
    .eq('id', showId)
    .eq('organization_id', profile.organization_id)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidateShowPaths(showId)
  return { success: true }
}
export async function updateShowNotes(showId: string, internalNotes: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('Organization not found for this user.')
  }

  const { error } = await supabase
    .from('shows')
    .update({
      internal_notes: internalNotes || null,
    })
    .eq('id', showId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath(`/shows/${showId}/notes`)
  revalidatePath(`/shows/${showId}/show-details`)
  revalidatePath(`/shows/${showId}`)
}

export async function deleteShow(showId: string) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('You must be logged in.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    throw new Error('Organization not found for this user.')
  }

  const { error } = await supabase
    .from('shows')
    .delete()
    .eq('id', showId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/dashboard')
  revalidatePath('/shows')
  redirect('/shows')
}