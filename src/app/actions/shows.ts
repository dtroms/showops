'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext, type OrgRole } from '@/lib/auth-context'
import {
  canCreateShows,
  canEditShow,
  canEditShowIdentity,
  canEditShowStatus,
  isLeadershipRole,
  normalizeShowStatus,
  type ShowAccessContext,
  type ShowRole,
} from '@/lib/permissions'
import {
  logCreateAuditEvent,
  logDeleteAuditEvent,
  logUpdateAuditEvent,
} from '@/lib/audit'

export type CreateShowState = {
  error?: string
  success?: boolean
}

export type UpdateShowState = {
  error?: string
  success?: boolean
}

type ExistingShowRow = {
  id: string
  organization_id: string
  show_name: string
  show_number: string
  start_date: string | null
  end_date: string | null
  status: string | null
  city: string | null
  state: string | null
  estimated_revenue: number | null
  client_id: string | null
  venue_id: string | null
  internal_notes: string | null
  venue_contact_name: string | null
  venue_contact_email: string | null
  venue_contact_phone: string | null
  event_contact_name: string | null
  event_contact_email: string | null
  event_contact_phone: string | null
  created_by_membership_id: string | null
  lead_membership_id: string | null
}

type ShowMembershipRow = {
  show_role: ShowRole
}

type OrganizationMembershipLookupRow = {
  id: string
  status: string | null
  organization_id: string
  user_id: string
  role: string | null
}

type ActionContext = Awaited<ReturnType<typeof requireMembershipContext>> & {
  supabase: Awaited<ReturnType<typeof createClient>>
}

function isRedirectError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'digest' in error &&
    typeof (error as { digest?: unknown }).digest === 'string' &&
    (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')
  )
}

async function getShowActionContext(): Promise<ActionContext> {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  return {
    ...ctx,
    supabase,
  }
}

function normalizeCurrency(value: string): number {
  if (!value.trim()) return 0
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function revalidateShowPaths(showId?: string) {
  revalidatePath('/shows')
  revalidatePath('/dashboard')

  if (showId) {
    revalidatePath(`/shows/${showId}`)
    revalidatePath(`/shows/${showId}/show-details`)
    revalidatePath(`/shows/${showId}/budget-summary`)
    revalidatePath(`/shows/${showId}/budget-sheet`)
    revalidatePath(`/shows/${showId}/budget-comparison`)
    revalidatePath(`/shows/${showId}/team`)
    revalidatePath(`/shows/${showId}/vendors`)
    revalidatePath(`/shows/${showId}/notes`)
    revalidatePath(`/shows/${showId}/travel`)
  }
}

async function getShowAccessContext(
  ctx: ActionContext,
  showId: string
): Promise<{ show: ExistingShowRow; access: ShowAccessContext }> {
  const { supabase, organizationId, membership, orgRole } = ctx

  const { data: show, error: showError } = await supabase
    .from('shows')
    .select(
      `
        id,
        organization_id,
        show_name,
        show_number,
        start_date,
        end_date,
        status,
        city,
        state,
        estimated_revenue,
        client_id,
        venue_id,
        internal_notes,
        venue_contact_name,
        venue_contact_email,
        venue_contact_phone,
        event_contact_name,
        event_contact_email,
        event_contact_phone,
        created_by_membership_id,
        lead_membership_id
      `
    )
    .eq('id', showId)
    .eq('organization_id', organizationId)
    .single<ExistingShowRow>()

  if (showError || !show) {
    throw new Error(showError?.message || 'Show not found.')
  }

  let showRole: ShowRole | null = null
  let isAssigned = false

  const { data: showMembership } = await supabase
    .from('show_memberships')
    .select('show_role')
    .eq('show_id', showId)
    .eq('membership_id', membership.id)
    .maybeSingle<ShowMembershipRow>()

  if (showMembership?.show_role) {
    showRole = showMembership.show_role
    isAssigned = true
  } else if (show.lead_membership_id === membership.id) {
    showRole = 'lead'
    isAssigned = true
  } else if (show.created_by_membership_id === membership.id) {
    showRole = 'lead'
    isAssigned = true
  }

  const access: ShowAccessContext = {
    orgRole,
    showRole,
    showStatus: normalizeShowStatus(show.status),
    isAssigned,
  }

  return { show, access }
}

async function getOrCreateClientId(
  ctx: ActionContext,
  clientName: string
): Promise<string> {
  const { supabase, organizationId } = ctx

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .eq('organization_id', organizationId)
    .ilike('name', clientName)
    .maybeSingle<{ id: string }>()

  if (existingClient?.id) {
    return existingClient.id
  }

  const { data: newClient, error: clientInsertError } = await supabase
    .from('clients')
    .insert({
      organization_id: organizationId,
      name: clientName,
    })
    .select('id')
    .single<{ id: string }>()

  if (clientInsertError || !newClient?.id) {
    throw new Error(clientInsertError?.message || 'Failed to create client.')
  }

  return newClient.id
}

async function getOrCreateVenueId(
  ctx: ActionContext,
  params: {
    venueIdFromForm: string
    venueName: string
    city: string
    state: string
    venueContactName: string | null
    venueContactEmail: string | null
    venueContactPhone: string | null
  }
): Promise<string> {
  const { supabase, organizationId } = ctx
  const {
    venueIdFromForm,
    venueName,
    city,
    state,
    venueContactName,
    venueContactEmail,
    venueContactPhone,
  } = params

  if (venueIdFromForm) {
    return venueIdFromForm
  }

  const { data: existingVenue } = await supabase
    .from('venues')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('name', venueName)
    .eq('city', city)
    .eq('state', state)
    .maybeSingle<{ id: string }>()

  if (existingVenue?.id) {
    return existingVenue.id
  }

  const { data: newVenue, error: venueInsertError } = await supabase
    .from('venues')
    .insert({
      organization_id: organizationId,
      name: venueName,
      city,
      state,
      primary_contact_name: venueContactName,
      primary_contact_email: venueContactEmail,
      primary_contact_phone: venueContactPhone,
    })
    .select('id')
    .single<{ id: string }>()

  if (venueInsertError || !newVenue?.id) {
    throw new Error(venueInsertError?.message || 'Failed to create venue.')
  }

  return newVenue.id
}

function sanitizeStatusInput(input: string, role: OrgRole): string {
  const normalized = normalizeShowStatus(input)

  if (isLeadershipRole(role)) {
    return normalized
  }

  if (normalized === 'locked' || normalized === 'archived') {
    return 'draft'
  }

  return normalized
}

export async function createShow(
  _prevState: CreateShowState,
  formData: FormData
): Promise<CreateShowState> {
  try {
    const ctx = await getShowActionContext()
    const { supabase, organizationId, membership, orgRole, userId } = ctx

    if (!canCreateShows(orgRole)) {
      return { error: 'You do not have permission to create shows.' }
    }

    const showName = String(formData.get('showName') || '').trim()
    const showNumber = String(formData.get('showNumber') || '').trim()
    const clientName = String(formData.get('clientName') || '').trim()

    const venueIdFromForm = String(formData.get('venueId') || '').trim()
    const venueName = String(formData.get('venueName') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const state = String(formData.get('state') || '').trim()

    const venueContactName =
      String(formData.get('venueContactName') || '').trim() || null
    const venueContactEmail =
      String(formData.get('venueContactEmail') || '').trim() || null
    const venueContactPhone =
      String(formData.get('venueContactPhone') || '').trim() || null

    const startDate = String(formData.get('startDate') || '').trim()
    const endDate = String(formData.get('endDate') || '').trim()
    const estimatedRevenue = normalizeCurrency(
      String(formData.get('estimatedRevenue') || '').trim()
    )

    if (!showName) return { error: 'Show name is required.' }
    if (!showNumber) return { error: 'Show number is required.' }
    if (!clientName) return { error: 'Client name is required.' }
    if (!venueName) return { error: 'Venue name is required.' }
    if (!city) return { error: 'City is required.' }
    if (!state) return { error: 'State is required.' }
    if (!startDate) return { error: 'Start date is required.' }
    if (!endDate) return { error: 'End date is required.' }

    const clientId = await getOrCreateClientId(ctx, clientName)
    const venueId = await getOrCreateVenueId(ctx, {
      venueIdFromForm,
      venueName,
      city,
      state,
      venueContactName,
      venueContactEmail,
      venueContactPhone,
    })

    const assignedPmMembershipId =
      String(formData.get('leadMembershipId') || '').trim() || null

    let leadMembershipId = membership.id

    if (isLeadershipRole(orgRole) && assignedPmMembershipId) {
      const { data: selectedMembership, error: selectedMembershipError } = await supabase
        .from('organization_memberships')
        .select('id, status, organization_id, user_id, role')
        .eq('organization_id', organizationId)
        .eq('id', assignedPmMembershipId)
        .maybeSingle<OrganizationMembershipLookupRow>()

      if (selectedMembershipError) {
        return { error: selectedMembershipError.message }
      }

      if (!selectedMembership?.id) {
        return { error: 'Selected project manager was not found in this organization.' }
      }

      if (selectedMembership.status && selectedMembership.status !== 'active') {
        return { error: 'Selected project manager is not active.' }
      }

      leadMembershipId = selectedMembership.id
    }

    const { data: authData, error: authError } = await supabase.auth.getUser()

    if (authError || !authData.user) {
      return { error: 'No authenticated Supabase user found in server action.' }
    }

    const { data: creatorMembership, error: creatorMembershipError } = await supabase
      .from('organization_memberships')
      .select('id, organization_id, user_id, role, status')
      .eq('id', membership.id)
      .maybeSingle<OrganizationMembershipLookupRow>()

    if (creatorMembershipError) {
      return { error: creatorMembershipError.message }
    }

    if (!creatorMembership) {
      return {
        error: `Current membership not found. membership.id=${membership.id}`,
      }
    }

    if (creatorMembership.user_id !== authData.user.id) {
      return {
        error: `Membership user mismatch. membership.user_id=${creatorMembership.user_id} auth.uid=${authData.user.id}`,
      }
    }

    if (creatorMembership.organization_id !== organizationId) {
      return {
        error: `Membership organization mismatch. membership.organization_id=${creatorMembership.organization_id} current.organization_id=${organizationId}`,
      }
    }

    if (creatorMembership.status !== 'active') {
      return {
        error: `Membership is not active. status=${creatorMembership.status}`,
      }
    }

    if (
      !['owner', 'org_admin', 'ops_manager', 'project_manager'].includes(
        String(creatorMembership.role)
      )
    ) {
      return {
        error: `Membership role is not allowed to create shows. role=${creatorMembership.role}`,
      }
    }

    const insertPayload = {
      organization_id: organizationId,
      created_by_membership_id: membership.id,
      lead_membership_id: leadMembershipId,
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
      venue_contact_name: venueContactName,
      venue_contact_email: venueContactEmail,
      venue_contact_phone: venueContactPhone,
    }

    const { data: show, error: showError } = await supabase
      .from('shows')
      .insert(insertPayload)
      .select('id')
      .single<{ id: string }>()

    if (showError || !show?.id) {
      return { error: showError?.message || 'Failed to create show.' }
    }

    const { error: showMembershipError } = await supabase
      .from('show_memberships')
      .insert({
        organization_id: organizationId,
        show_id: show.id,
        membership_id: leadMembershipId,
        show_role: 'lead',
        assignment_type:
          leadMembershipId === membership.id ? 'auto_creator' : 'lead_assignment',
        assigned_by_membership_id: membership.id,
      })

    if (showMembershipError) {
      console.error('createShow: failed to create lead show_membership', {
        showId: show.id,
        membershipId: leadMembershipId,
        error: showMembershipError,
      })
    }

    await logCreateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'show',
      entityId: show.id,
      showId: show.id,
      changeSummary: `Created show "${showName}" (${showNumber})`,
      afterJson: {
        show_name: showName,
        show_number: showNumber,
        status: 'draft',
        city,
        state,
        start_date: startDate,
        end_date: endDate,
        estimated_revenue: estimatedRevenue,
        client_id: clientId,
        venue_id: venueId,
        created_by_membership_id: membership.id,
        lead_membership_id: leadMembershipId,
      },
      metadataJson: {
        source: 'shows.createShow',
        auto_creator_assignment_attempted: true,
      },
    })

    revalidateShowPaths(show.id)
    redirect(`/shows/${show.id}/show-details`)
  } catch (error) {
    if (isRedirectError(error)) throw error

    return {
      error: error instanceof Error ? error.message : 'Failed to create show.',
    }
  }
}

export async function updateShowDetails(
  _prevState: UpdateShowState,
  formData: FormData
): Promise<UpdateShowState> {
  try {
    const ctx = await getShowActionContext()
    const { supabase, organizationId, orgRole, membership, userId } = ctx

    const showId = String(formData.get('showId') || '').trim()
    const showName = String(formData.get('showName') || '').trim()
    const showNumber = String(formData.get('showNumber') || '').trim()
    const clientName = String(formData.get('clientName') || '').trim()

    const venueIdFromForm = String(formData.get('venueId') || '').trim()
    const venueName = String(formData.get('venueName') || '').trim()
    const city = String(formData.get('city') || '').trim()
    const state = String(formData.get('state') || '').trim()

    const venueContactName =
      String(formData.get('venueContactName') || '').trim() || null
    const venueContactEmail =
      String(formData.get('venueContactEmail') || '').trim() || null
    const venueContactPhone =
      String(formData.get('venueContactPhone') || '').trim() || null

    const eventContactName =
      String(formData.get('eventContactName') || '').trim() || null
    const eventContactEmail =
      String(formData.get('eventContactEmail') || '').trim() || null
    const eventContactPhone =
      String(formData.get('eventContactPhone') || '').trim() || null

    const estimatedRevenue = normalizeCurrency(
      String(formData.get('estimatedRevenue') || '').trim()
    )
    const rawStatus = String(formData.get('status') || 'draft').trim() || 'draft'

    if (!showId) return { error: 'Show id is required.' }
    if (!showName) return { error: 'Show name is required.' }
    if (!showNumber) return { error: 'Show number is required.' }
    if (!clientName) return { error: 'Client name is required.' }
    if (!venueName) return { error: 'Venue name is required.' }
    if (!city) return { error: 'City is required.' }
    if (!state) return { error: 'State is required.' }

    const { show, access } = await getShowAccessContext(ctx, showId)

    if (!canEditShow(access)) {
      return { error: 'You do not have permission to edit this show.' }
    }

    if (!canEditShowIdentity(access)) {
      return { error: 'You do not have permission to edit show details.' }
    }

    const nextNormalizedStatus = sanitizeStatusInput(rawStatus, orgRole)

    if (
      normalizeShowStatus(rawStatus) !== access.showStatus &&
      !canEditShowStatus(access)
    ) {
      return { error: 'You do not have permission to change show status.' }
    }

    const clientId = await getOrCreateClientId(ctx, clientName)
    const venueId = await getOrCreateVenueId(ctx, {
      venueIdFromForm,
      venueName,
      city,
      state,
      venueContactName,
      venueContactEmail,
      venueContactPhone,
    })

    const nextValues = {
      show_name: showName,
      show_number: showNumber,
      client_id: clientId,
      venue_id: venueId,
      city,
      state,
      estimated_revenue: estimatedRevenue,
      status: nextNormalizedStatus,
      venue_contact_name: venueContactName,
      venue_contact_email: venueContactEmail,
      venue_contact_phone: venueContactPhone,
      event_contact_name: eventContactName,
      event_contact_email: eventContactEmail,
      event_contact_phone: eventContactPhone,
    }

    const { error: updateError } = await supabase
      .from('shows')
      .update(nextValues)
      .eq('id', showId)
      .eq('organization_id', organizationId)

    if (updateError) {
      return { error: updateError.message }
    }

    await logUpdateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'show',
      entityId: showId,
      showId,
      changeSummary: `Updated show "${show.show_name}" (${show.show_number})`,
      before: {
        show_name: show.show_name,
        show_number: show.show_number,
        client_id: show.client_id,
        venue_id: show.venue_id,
        city: show.city,
        state: show.state,
        estimated_revenue: show.estimated_revenue,
        status: normalizeShowStatus(show.status),
        venue_contact_name: show.venue_contact_name,
        venue_contact_email: show.venue_contact_email,
        venue_contact_phone: show.venue_contact_phone,
        event_contact_name: show.event_contact_name,
        event_contact_email: show.event_contact_email,
        event_contact_phone: show.event_contact_phone,
      },
      after: nextValues,
      metadataJson: {
        source: 'shows.updateShowDetails',
      },
    })

    revalidateShowPaths(showId)
    return { success: true }
  } catch (error) {
    if (isRedirectError(error)) throw error

    return {
      error: error instanceof Error ? error.message : 'Failed to update show.',
    }
  }
}

export async function uploadShowFile(formData: FormData) {
  const ctx = await getShowActionContext()
  const { supabase, organizationId, membership } = ctx

  const showId = String(formData.get('showId') || '').trim()
  const file = formData.get('file')

  if (!showId) throw new Error('Show id is required.')
  if (!(file instanceof File)) throw new Error('A file is required.')
  if (!file.size) throw new Error('The uploaded file is empty.')

  await getShowAccessContext(ctx, showId)

  const extension = file.name.includes('.') ? file.name.split('.').pop() : ''
  const safeExtension = extension ? `.${extension}` : ''
  const storagePath = `${organizationId}/${showId}/${crypto.randomUUID()}${safeExtension}`

  const fileBytes = await file.arrayBuffer()

  const { error: uploadError } = await supabase.storage
    .from('show-files')
    .upload(storagePath, fileBytes, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) throw new Error(uploadError.message)

  const { error: insertError } = await supabase.from('show_files').insert({
    organization_id: organizationId,
    show_id: showId,
    file_name: file.name,
    storage_path: storagePath,
    mime_type: file.type || null,
    file_size: file.size,
    uploaded_by_membership_id: membership.id,
  })

  if (insertError) throw new Error(insertError.message)

  revalidateShowPaths(showId)
}

export async function createShowNote(formData: FormData) {
  const ctx = await getShowActionContext()
  const { supabase, organizationId, membership } = ctx

  const showId = String(formData.get('showId') || '').trim()
  const title = String(formData.get('title') || 'Untitled Note').trim() || 'Untitled Note'
  const bodyHtml = String(formData.get('bodyHtml') || '').trim()

  if (!showId) throw new Error('Show id is required.')

  await getShowAccessContext(ctx, showId)

  const { data: lastNote } = await supabase
    .from('show_notes')
    .select('sort_order')
    .eq('show_id', showId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>()

  const nextSortOrder = Number(lastNote?.sort_order ?? -1) + 1

  const { error } = await supabase.from('show_notes').insert({
    organization_id: organizationId,
    show_id: showId,
    title,
    body_html: bodyHtml,
    sort_order: nextSortOrder,
    created_by_membership_id: membership.id,
    updated_by_membership_id: membership.id,
  })

  if (error) throw new Error(error.message)

  revalidateShowPaths(showId)
}

export async function updateShowNote(formData: FormData) {
  const ctx = await getShowActionContext()
  const { supabase, organizationId, membership } = ctx

  const showId = String(formData.get('showId') || '').trim()
  const noteId = String(formData.get('noteId') || '').trim()
  const title = String(formData.get('title') || 'Untitled Note').trim() || 'Untitled Note'
  const bodyHtml = String(formData.get('bodyHtml') || '').trim()

  if (!showId || !noteId) throw new Error('Show id and note id are required.')

  await getShowAccessContext(ctx, showId)

  const { error } = await supabase
    .from('show_notes')
    .update({
      title,
      body_html: bodyHtml,
      updated_by_membership_id: membership.id,
    })
    .eq('id', noteId)
    .eq('show_id', showId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  revalidateShowPaths(showId)
}

export async function deleteShowNote(formData: FormData) {
  const ctx = await getShowActionContext()
  const { supabase, organizationId } = ctx

  const showId = String(formData.get('showId') || '').trim()
  const noteId = String(formData.get('noteId') || '').trim()

  if (!showId || !noteId) throw new Error('Show id and note id are required.')

  await getShowAccessContext(ctx, showId)

  const { error } = await supabase
    .from('show_notes')
    .delete()
    .eq('id', noteId)
    .eq('show_id', showId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  revalidateShowPaths(showId)
}

export async function deleteShow(showId: string) {
  const ctx = await getShowActionContext()
  const { supabase, organizationId, membership, userId } = ctx

  if (!showId) throw new Error('Show id is required.')

  const { show, access } = await getShowAccessContext(ctx, showId)

  if (!isLeadershipRole(access.orgRole)) {
    throw new Error('You do not have permission to delete this show.')
  }

  const beforeJson = {
    show_name: show.show_name,
    show_number: show.show_number,
    status: show.status,
    city: show.city,
    state: show.state,
    start_date: show.start_date,
    end_date: show.end_date,
    estimated_revenue: show.estimated_revenue,
    client_id: show.client_id,
    venue_id: show.venue_id,
    created_by_membership_id: show.created_by_membership_id,
    lead_membership_id: show.lead_membership_id,
  }

  const { error } = await supabase
    .from('shows')
    .delete()
    .eq('id', showId)
    .eq('organization_id', organizationId)

  if (error) throw new Error(error.message)

  await logDeleteAuditEvent({
    organizationId,
    actorUserId: userId,
    actorMembershipId: membership.id,
    entityType: 'show',
    entityId: showId,
    showId,
    changeSummary: `Deleted show "${show.show_name}" (${show.show_number})`,
    beforeJson,
    metadataJson: {
      source: 'shows.deleteShow',
    },
  })

  revalidateShowPaths(showId)
  redirect('/shows')
}