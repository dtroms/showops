'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import {
  canEditShow,
  type ShowAccessContext,
} from '@/lib/permissions'
import {
  logCreateAuditEvent,
  logDeleteAuditEvent,
} from '@/lib/audit'
import { resolveShowAccess } from '@/lib/show-access'

export type ShowVendorState = {
  error?: string
  success?: string
}

type ShowRow = {
  id: string
  organization_id: string
  created_by_membership_id: string | null
  lead_membership_id: string | null
  status: string | null
  start_date: string | null
  end_date: string | null
}

type VendorRow = {
  id: string
  vendor_name: string
  vendor_type?: string | null
  service_type?: string | null
  contact_name?: string | null
  email?: string | null
  phone?: string | null
  default_cost?: number | null
}

type ShowVendorRow = {
  id: string
  vendor_name_snapshot: string
  service_type_snapshot: string | null
  default_day_rate_snapshot: number | null
  vendor_id: string | null
}

function parseTrimmed(formData: FormData, key: string) {
  return String(formData.get(key) || '').trim()
}

function revalidateShowVendorPaths(showId: string) {
  revalidatePath(`/shows/${showId}/vendors`)
  revalidatePath(`/shows/${showId}/nearby-partners`)
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}/budget-comparison`)
  revalidatePath(`/shows/${showId}`)
  revalidatePath('/shows')
  revalidatePath('/dashboard')
}

function calculateInclusiveShowDays(
  startDate: string | null | undefined,
  endDate: string | null | undefined
) {
  if (!startDate || !endDate) return 1

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 1

  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  return diffDays > 0 ? diffDays : 1
}

async function getContext() {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  return {
    supabase,
    organizationId: ctx.organizationId,
    membership: ctx.membership,
    orgRole: ctx.orgRole,
    userId: ctx.userId,
  }
}

async function getShowAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  showId: string,
  organizationId: string,
  membershipId: string,
  orgRole: ShowAccessContext['orgRole']
): Promise<{ show: ShowRow; access: ShowAccessContext }> {
  return resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId,
    orgRole,
  }) as unknown as Promise<{ show: ShowRow; access: ShowAccessContext }>
}

async function getOrCreateCurrentBudgetVersionId(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  showId: string
  versionType?: 'pre' | 'post'
}) {
  const { supabase, showId, versionType = 'pre' } = params

  const { data, error } = await supabase.rpc('get_or_create_current_budget_version', {
    target_show_id: showId,
    target_version_type: versionType,
  })

  if (error || !data) {
    return {
      versionId: null as string | null,
      error: error?.message || 'Failed to resolve budget version.',
    }
  }

  return {
    versionId: String(data),
    error: null as string | null,
  }
}

export async function addVendorToShow(
  _prevState: ShowVendorState,
  formData: FormData
): Promise<ShowVendorState> {
  try {
    const ctx = await getContext()
    const { supabase, organizationId, membership, orgRole, userId } = ctx

    const showId = parseTrimmed(formData, 'showId')
    const vendorId = parseTrimmed(formData, 'vendorId')
    const notes = parseTrimmed(formData, 'notes') || null

    if (!showId || !vendorId) {
      return { error: 'Show and vendor are required.' }
    }

    const { show, access } = await getShowAccess(
      supabase,
      showId,
      organizationId,
      membership.id,
      orgRole
    )

    if (!canEditShow(access)) {
      return { error: 'You do not have permission to assign vendors.' }
    }

    const { data: vendor, error: vendorError } = await supabase
      .from('vendors')
      .select(
        'id, vendor_name, vendor_type, service_type, contact_name, email, phone, default_cost'
      )
      .eq('id', vendorId)
      .eq('organization_id', organizationId)
      .single<VendorRow>()

    if (vendorError || !vendor) {
      return { error: vendorError?.message || 'Vendor not found.' }
    }

    const { data: existingAssignment, error: existingError } = await supabase
      .from('show_vendors')
      .select('id')
      .eq('show_id', showId)
      .eq('vendor_id', vendorId)
      .maybeSingle<{ id: string }>()

    if (existingError) {
      return { error: existingError.message }
    }

    if (existingAssignment?.id) {
      return { error: 'This vendor is already assigned to the show.' }
    }

    const { data: showVendor, error: showVendorError } = await supabase
      .from('show_vendors')
      .insert({
        organization_id: organizationId,
        show_id: showId,
        vendor_id: vendor.id,
        vendor_name_snapshot: vendor.vendor_name,
        vendor_type_snapshot: vendor.vendor_type ?? null,
        service_type_snapshot: vendor.service_type ?? null,
        contact_name_snapshot: vendor.contact_name ?? null,
        email_snapshot: vendor.email ?? null,
        phone_snapshot: vendor.phone ?? null,
        default_day_rate_snapshot: vendor.default_cost ?? null,
        assigned_by_membership_id: membership.id,
        notes,
      })
      .select(
        'id, vendor_name_snapshot, service_type_snapshot, default_day_rate_snapshot, vendor_id'
      )
      .single<ShowVendorRow>()

    if (showVendorError || !showVendor) {
      return { error: showVendorError?.message || 'Failed to assign vendor.' }
    }

    const isFreelanceLike =
      vendor.vendor_type === 'freelance' || vendor.vendor_type === 'both'

    if (isFreelanceLike) {
      const { versionId, error: versionError } = await getOrCreateCurrentBudgetVersionId({
        supabase,
        showId,
        versionType: 'pre',
      })

      if (versionError || !versionId) {
        return { error: versionError || 'Failed to resolve budget version.' }
      }

      const showDays = calculateInclusiveShowDays(show.start_date, show.end_date)
      const defaultDayRate = Number(showVendor.default_day_rate_snapshot ?? 0)

      const { data: existingBudgetLine, error: existingBudgetLineError } = await supabase
        .from('show_budget_line_items')
        .select('id')
        .eq('show_id', showId)
        .eq('version_id', versionId)
        .eq('section_type', 'freelance_labor')
        .eq('reference_id', showVendor.id)
        .maybeSingle<{ id: string }>()

      if (existingBudgetLineError) {
        return { error: existingBudgetLineError.message }
      }

      if (!existingBudgetLine?.id) {
        const { error: budgetLineError } = await supabase
          .from('show_budget_line_items')
          .insert({
            organization_id: organizationId,
            show_id: showId,
            version_id: versionId,
            vendor_id: vendor.id,
            reference_id: showVendor.id,
            section_type: 'freelance_labor',
            subgroup_type: showVendor.service_type_snapshot ?? null,
            line_name: showVendor.vendor_name_snapshot,
            quantity: 1,
            days: showDays,
            hours: null,
            unit_cost: defaultDayRate,
            subtotal: showDays * defaultDayRate,
            calculation_type: 'days_x_unit_cost',
            source_type: 'vendor_assignment',
            is_auto_generated: true,
            overtime_enabled: false,
            overtime_hours: null,
            overtime_rate: null,
            notes: null,
            sort_order: 0,
            created_by_membership_id: membership.id,
            updated_by_membership_id: membership.id,
          })

        if (budgetLineError) {
          return { error: budgetLineError.message }
        }
      }
    }

    await logCreateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'show_vendor',
      entityId: showVendor.id,
      showId,
      changeSummary: `Assigned vendor "${vendor.vendor_name}" to show`,
      afterJson: {
        vendor_id: vendor.id,
        vendor_name_snapshot: showVendor.vendor_name_snapshot,
        vendor_type: vendor.vendor_type ?? null,
        service_type: vendor.service_type ?? null,
        auto_generated_budget_line: isFreelanceLike,
      },
      metadataJson: {
        source: 'show-vendors.addVendorToShow',
      },
    })

    revalidateShowVendorPaths(showId)
    return { success: 'Vendor assigned to show.' }
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : 'Failed to assign vendor.',
    }
  }
}

export async function addVendorToShowFromShowPartners(formData: FormData) {
  const result = await addVendorToShow({}, formData)

  if (result?.error) {
    throw new Error(result.error)
  }
}

export async function removeVendorFromShow(showVendorId: string, showId: string) {
  const ctx = await getContext()
  const { supabase, organizationId, membership, orgRole, userId } = ctx

  const { access } = await getShowAccess(
    supabase,
    showId,
    organizationId,
    membership.id,
    orgRole
  )

  if (!canEditShow(access)) {
    throw new Error('You do not have permission to remove vendors.')
  }

  const { data: existingAssignment, error: fetchError } = await supabase
    .from('show_vendors')
    .select('id, vendor_name_snapshot, vendor_id')
    .eq('id', showVendorId)
    .eq('show_id', showId)
    .eq('organization_id', organizationId)
    .single<{ id: string; vendor_name_snapshot: string; vendor_id: string | null }>()

  if (fetchError || !existingAssignment) {
    throw new Error(fetchError?.message || 'Assigned vendor not found.')
  }

  const { error: budgetDeleteError } = await supabase
    .from('show_budget_line_items')
    .delete()
    .eq('reference_id', showVendorId)
    .eq('show_id', showId)
    .in('section_type', ['vendor', 'freelance_labor'])
    .eq('organization_id', organizationId)

  if (budgetDeleteError) {
    throw new Error(budgetDeleteError.message)
  }

  const { error: deleteError } = await supabase
    .from('show_vendors')
    .delete()
    .eq('id', showVendorId)
    .eq('show_id', showId)
    .eq('organization_id', organizationId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  await logDeleteAuditEvent({
    organizationId,
    actorUserId: userId,
    actorMembershipId: membership.id,
    entityType: 'show_vendor',
    entityId: showVendorId,
    showId,
    changeSummary: `Removed vendor "${existingAssignment.vendor_name_snapshot}" from show`,
    beforeJson: {
      vendor_id: existingAssignment.vendor_id,
      vendor_name_snapshot: existingAssignment.vendor_name_snapshot,
    },
    metadataJson: {
      source: 'show-vendors.removeVendorFromShow',
    },
  })

  revalidateShowVendorPaths(showId)
}

export async function removeVendorFromShowFromShowPartners(formData: FormData) {
  const showId = parseTrimmed(formData, 'showId')
  const showVendorId = parseTrimmed(formData, 'assignmentId')

  if (!showId || !showVendorId) {
    throw new Error('Show and assignment are required.')
  }

  await removeVendorFromShow(showVendorId, showId)
}

export async function addAssignedVendorBudgetLine(vendorAssignmentId: string, showId: string) {
  const ctx = await getContext()
  const { supabase, organizationId, membership, orgRole, userId } = ctx

  if (!vendorAssignmentId) {
    throw new Error('Vendor assignment id is required.')
  }

  if (!showId) {
    throw new Error('Show id is required.')
  }

  const { show, access } = await getShowAccess(
    supabase,
    showId,
    organizationId,
    membership.id,
    orgRole
  )

  if (!canEditShow(access)) {
    throw new Error('You do not have permission to add budget lines for this show.')
  }

  const { data: showVendor, error: showVendorError } = await supabase
    .from('show_vendors')
    .select(
      `
        id,
        organization_id,
        show_id,
        vendor_id,
        vendor_name_snapshot,
        service_type_snapshot,
        default_day_rate_snapshot
      `
    )
    .eq('id', vendorAssignmentId)
    .eq('organization_id', organizationId)
    .eq('show_id', showId)
    .single<ShowVendorRow & { organization_id: string; show_id: string }>()

  if (showVendorError || !showVendor) {
    throw new Error(showVendorError?.message || 'Assigned vendor not found.')
  }

  const { versionId, error: versionError } = await getOrCreateCurrentBudgetVersionId({
    supabase,
    showId,
    versionType: 'pre',
  })

  if (versionError || !versionId) {
    throw new Error(versionError || 'Failed to resolve budget version.')
  }

  const { data: existingBudgetLine, error: existingBudgetLineError } = await supabase
    .from('show_budget_line_items')
    .select('id')
    .eq('show_id', showId)
    .eq('version_id', versionId)
    .eq('section_type', 'freelance_labor')
    .eq('reference_id', showVendor.id)
    .maybeSingle<{ id: string }>()

  if (existingBudgetLineError) {
    throw new Error(existingBudgetLineError.message)
  }

  if (!existingBudgetLine?.id) {
    const showDays = calculateInclusiveShowDays(show.start_date, show.end_date)
    const defaultDayRate = Number(showVendor.default_day_rate_snapshot ?? 0)

    const { error: budgetLineError } = await supabase
      .from('show_budget_line_items')
      .insert({
        organization_id: organizationId,
        show_id: showId,
        version_id: versionId,
        vendor_id: showVendor.vendor_id,
        reference_id: showVendor.id,
        section_type: 'freelance_labor',
        subgroup_type: showVendor.service_type_snapshot ?? null,
        line_name: showVendor.vendor_name_snapshot,
        quantity: 1,
        days: showDays,
        hours: null,
        unit_cost: defaultDayRate,
        subtotal: showDays * defaultDayRate,
        calculation_type: 'days_x_unit_cost',
        source_type: 'vendor_assignment',
        is_auto_generated: true,
        overtime_enabled: false,
        overtime_hours: null,
        overtime_rate: null,
        notes: null,
        sort_order: 0,
        created_by_membership_id: membership.id,
        updated_by_membership_id: membership.id,
      })

    if (budgetLineError) {
      throw new Error(budgetLineError.message)
    }

    await logCreateAuditEvent({
      organizationId,
      actorUserId: userId,
      actorMembershipId: membership.id,
      entityType: 'budget_line_item',
      entityId: crypto.randomUUID(),
      showId,
      changeSummary: `Re-added freelance labor budget line for "${showVendor.vendor_name_snapshot}"`,
      afterJson: {
        reference_id: showVendor.id,
        line_name: showVendor.vendor_name_snapshot,
        section_type: 'freelance_labor',
        quantity: 1,
        days: showDays,
        unit_cost: defaultDayRate,
        subtotal: showDays * defaultDayRate,
      },
      metadataJson: {
        source: 'show-vendors.addAssignedVendorBudgetLine',
        version_id: versionId,
      },
    })
  }

  revalidateShowVendorPaths(showId)
}