'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { isOrgAdminRole, isOpsManagerRole } from '@/lib/permissions'

export type VenueState = {
  error?: string
  success?: boolean
}

function canEditVenues(role: string | null | undefined) {
  return isOrgAdminRole(role as any) || isOpsManagerRole(role as any) || role === 'project_manager'
}

async function getVenueEditorContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!canEditVenues(ctx.orgRole)) {
    throw new Error('You do not have permission to modify venues')
  }

  return {
    supabase,
    organizationId: ctx.organizationId,
  }
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
    const { supabase, organizationId } = await getVenueEditorContext()

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
      organization_id: organizationId,
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
    const { supabase, organizationId } = await getVenueEditorContext()

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
      .eq('organization_id', organizationId)

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
  const { supabase, organizationId } = await getVenueEditorContext()

  const venueId = String(formData.get('venueId') || '').trim()
  const nextValue = String(formData.get('nextValue') || '').trim() === 'true'

  if (!venueId) {
    throw new Error('Venue id is required.')
  }

  const { error } = await supabase
    .from('venues')
    .update({ is_active: nextValue })
    .eq('id', venueId)
    .eq('organization_id', organizationId)

  if (error) {
    throw new Error(error.message)
  }

  revalidateVenuePaths()
}