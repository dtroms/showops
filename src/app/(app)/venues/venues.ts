'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'

export type VenueState = {
  error?: string
  success?: boolean
}

async function getVenueEditorContext() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (error || !profile?.organization_id) {
    throw new Error('Workspace profile not found')
  }

  if (!['admin', 'editor'].includes(profile.role)) {
    throw new Error('You do not have permission to modify venues')
  }

  return { supabase, profile }
}

function revalidateVenuePaths() {
  revalidatePath('/venues')
  revalidatePath('/shows')
}

export async function createVenue(
  _prevState: VenueState,
  formData: FormData
): Promise<VenueState> {
  try {
    const { supabase, profile } = await getVenueEditorContext()

    const name = String(formData.get('name') || '').trim()
    const address = String(formData.get('address') || '').trim() || null
    const city = String(formData.get('city') || '').trim() || null
    const state = String(formData.get('state') || '').trim() || null
    const notes = String(formData.get('notes') || '').trim() || null
    const primaryContactName =
      String(formData.get('primaryContactName') || '').trim() || null
    const primaryContactRole =
      String(formData.get('primaryContactRole') || '').trim() || null
    const primaryContactEmail =
      String(formData.get('primaryContactEmail') || '').trim() || null
    const primaryContactPhone =
      String(formData.get('primaryContactPhone') || '').trim() || null

    if (!name) {
      return { error: 'Venue name is required.' }
    }

    const { error } = await supabase.from('venues').insert({
      organization_id: profile.organization_id,
      name,
      address,
      city,
      state,
      notes,
      primary_contact_name: primaryContactName,
      primary_contact_role: primaryContactRole,
      primary_contact_email: primaryContactEmail,
      primary_contact_phone: primaryContactPhone,
      is_active: true,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateVenuePaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to create venue.',
    }
  }
}

export async function updateVenue(
  _prevState: VenueState,
  formData: FormData
): Promise<VenueState> {
  try {
    const { supabase, profile } = await getVenueEditorContext()

    const venueId = String(formData.get('venueId') || '').trim()
    const name = String(formData.get('name') || '').trim()
    const address = String(formData.get('address') || '').trim() || null
    const city = String(formData.get('city') || '').trim() || null
    const state = String(formData.get('state') || '').trim() || null
    const notes = String(formData.get('notes') || '').trim() || null
    const primaryContactName =
      String(formData.get('primaryContactName') || '').trim() || null
    const primaryContactRole =
      String(formData.get('primaryContactRole') || '').trim() || null
    const primaryContactEmail =
      String(formData.get('primaryContactEmail') || '').trim() || null
    const primaryContactPhone =
      String(formData.get('primaryContactPhone') || '').trim() || null

    if (!venueId) {
      return { error: 'Venue id is required.' }
    }

    if (!name) {
      return { error: 'Venue name is required.' }
    }

    const { error } = await supabase
      .from('venues')
      .update({
        name,
        address,
        city,
        state,
        notes,
        primary_contact_name: primaryContactName,
        primary_contact_role: primaryContactRole,
        primary_contact_email: primaryContactEmail,
        primary_contact_phone: primaryContactPhone,
      })
      .eq('id', venueId)
      .eq('organization_id', profile.organization_id)

    if (error) {
      return { error: error.message }
    }

    revalidateVenuePaths()
    return { success: true }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to update venue.',
    }
  }
}

export async function toggleVenueActive(formData: FormData) {
  const { supabase, profile } = await getVenueEditorContext()

  const venueId = String(formData.get('venueId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!venueId) {
    throw new Error('Venue id is required.')
  }

  const { error } = await supabase
    .from('venues')
    .update({ is_active: nextValue })
    .eq('id', venueId)
    .eq('organization_id', profile.organization_id)

  if (error) {
    throw new Error(error.message)
  }

  revalidateVenuePaths()
}