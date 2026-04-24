'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canViewAssignments } from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'

export type SaveFreelancerRatingsState = {
  error?: string
  success?: boolean
}

function revalidateFreelancerRatingPaths(showId: string, vendorIds: string[]) {
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}/nearby-partners`)
  revalidatePath(`/shows/${showId}/vendors`)
  revalidatePath(`/shows/${showId}`)

  for (const vendorId of vendorIds) {
    revalidatePath(`/vendors/freelance/${vendorId}`)
  }

  revalidatePath('/vendors/freelance')
}

export async function saveFreelancerRatings(
  _prevState: SaveFreelancerRatingsState,
  formData: FormData
): Promise<SaveFreelancerRatingsState> {
  try {
    const supabase = await createClient()
    const ctx = await requireMembershipContext()
    const { organizationId, membership, orgRole, userId } = ctx

    const showId = String(formData.get('showId') || '').trim()

    if (!showId) {
      return { error: 'Show id is required.' }
    }

    const { access } = await resolveShowAccess({
      supabase,
      showId,
      organizationId,
      membershipId: membership.id,
      orgRole,
    })

    if (!canViewAssignments(access)) {
      return { error: 'You do not have permission to rate freelancers for this show.' }
    }

    const { data: show, error: showError } = await supabase
      .from('shows')
      .select('id, organization_id')
      .eq('id', showId)
      .eq('organization_id', organizationId)
      .single()

    if (showError || !show) {
      return { error: showError?.message || 'Show not found.' }
    }

    const vendorIds = formData.getAll('ratingVendorId').map(String).filter(Boolean)

    if (!vendorIds.length) {
      return { success: true }
    }

    const rows: {
      organization_id: string
      vendor_id: string
      show_id: string
      rated_by_user_id: string
      rating: number
      notes: string | null
    }[] = []

    for (const vendorId of vendorIds) {
      const ratingRaw = String(formData.get(`rating_${vendorId}`) || '').trim()
      const notesRaw = String(formData.get(`notes_${vendorId}`) || '').trim()

      if (!ratingRaw) {
        continue
      }

      const rating = Number(ratingRaw)

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return { error: 'Each freelancer rating must be a whole number from 1 to 5.' }
      }

      rows.push({
        organization_id: organizationId,
        vendor_id: vendorId,
        show_id: showId,
        rated_by_user_id: userId,
        rating,
        notes: notesRaw || null,
      })
    }

    for (const row of rows) {
      const { error } = await supabase
        .from('freelancer_ratings')
        .upsert(row, {
          onConflict: 'show_id,vendor_id,rated_by_user_id',
        })

      if (error) {
        return { error: error.message }
      }
    }

    revalidateFreelancerRatingPaths(showId, vendorIds)
    return { success: true }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to save freelancer ratings.',
    }
  }
}