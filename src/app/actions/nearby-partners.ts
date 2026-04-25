'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canEditBudgetStructure } from '@/lib/permissions'
import { resolveShowAccess } from '@/lib/show-access'

function revalidateNearbyPartnerPaths(showId: string) {
  revalidatePath(`/shows/${showId}/vendors`)
  revalidatePath(`/shows/${showId}/nearby-partners`)
  revalidatePath(`/shows/${showId}/budget-sheet`)
  revalidatePath(`/shows/${showId}/budget-summary`)
  revalidatePath(`/shows/${showId}/budget-comparison`)
  revalidatePath(`/shows/${showId}`)
  revalidatePath('/shows')
  revalidatePath('/dashboard')
}

function getShowDayCount(startDate: string | null, endDate: string | null) {
  if (!startDate || !endDate) return 1

  const start = new Date(`${startDate}T00:00:00`)
  const end = new Date(`${endDate}T00:00:00`)

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 1
  }

  const diffMs = end.getTime() - start.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1

  return diffDays > 0 ? diffDays : 1
}

async function ensureVendorBudgetLine(params: {
  supabase: Awaited<ReturnType<typeof createClient>>
  organizationId: string
  showId: string
  showVendorId: string
  vendorId: string | null
  vendorNameSnapshot: string
  defaultDayRateSnapshot: number | null
  startDate: string | null
  endDate: string | null
}) {
  const {
    supabase,
    organizationId,
    showId,
    showVendorId,
    vendorId,
    vendorNameSnapshot,
    defaultDayRateSnapshot,
    startDate,
    endDate,
  } = params

  const { data: currentVersionId, error: versionError } = await supabase.rpc(
    'get_or_create_current_budget_version',
    {
      target_show_id: showId,
      target_version_type: 'pre',
    }
  )

  if (versionError || !currentVersionId) {
    throw new Error(versionError?.message || 'Failed to resolve current budget version.')
  }

  const { data: existingLine, error: existingLineError } = await supabase
    .from('show_budget_line_items')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('show_id', showId)
    .eq('version_id', currentVersionId)
    .eq('section_type', 'vendor')
    .eq('reference_id', showVendorId)
    .maybeSingle()

  if (existingLineError) {
    throw new Error(existingLineError.message)
  }

  if (existingLine?.id) return

  const dayRate = Number(defaultDayRateSnapshot ?? 0)
  const days = getShowDayCount(startDate, endDate)
  const subtotal = dayRate * days

  const { error: insertError } = await supabase
    .from('show_budget_line_items')
    .insert({
      organization_id: organizationId,
      show_id: showId,
      version_id: currentVersionId,
      section_type: 'vendor',
      subgroup_type: null,
      line_name: vendorNameSnapshot,
      quantity: 1,
      days,
      hours: null,
      unit_cost: dayRate,
      subtotal,
      calculation_type: 'days_x_unit_cost',
      overtime_enabled: false,
      overtime_hours: 0,
      overtime_rate: 0,
      notes: null,
      reference_id: showVendorId,
      vendor_id: vendorId,
    })

  if (insertError) {
    throw new Error(insertError.message)
  }
}

export async function addNearbyFreelancerToShow(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const showId = String(formData.get('showId') || '').trim()
  const vendorId = String(formData.get('vendorId') || '').trim()

  if (!showId) throw new Error('Show id is required.')
  if (!vendorId) throw new Error('Vendor id is required.')

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId: membership.id,
    orgRole,
  })

  if (!canEditBudgetStructure(access)) {
    throw new Error('You do not have permission to assign freelancers to this show.')
  }

  const [{ data: show, error: showError }, { data: vendor, error: vendorError }] =
    await Promise.all([
      supabase
        .from('shows')
        .select('id, organization_id, start_date, end_date')
        .eq('id', showId)
        .eq('organization_id', organizationId)
        .single(),

      supabase
        .from('vendors')
        .select(`
          id,
          organization_id,
          partner_kind,
          vendor_name,
          freelancer_name,
          service_type,
          default_cost
        `)
        .eq('id', vendorId)
        .eq('organization_id', organizationId)
        .single(),
    ])

  if (showError || !show) {
    throw new Error(showError?.message || 'Show not found.')
  }

  if (vendorError || !vendor) {
    throw new Error(vendorError?.message || 'Vendor not found.')
  }

  if (vendor.partner_kind !== 'freelancer') {
    throw new Error('Only freelancers can be added directly to a show from this view.')
  }

  const { data: existingAssignment, error: existingError } = await supabase
    .from('show_vendors')
    .select(`
      id,
      vendor_id,
      vendor_name_snapshot,
      default_day_rate_snapshot
    `)
    .eq('show_id', showId)
    .eq('organization_id', organizationId)
    .eq('vendor_id', vendorId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  const vendorNameSnapshot =
    vendor.freelancer_name || vendor.vendor_name || 'Unnamed Freelancer'

  if (existingAssignment?.id) {
    await ensureVendorBudgetLine({
      supabase,
      organizationId,
      showId,
      showVendorId: existingAssignment.id,
      vendorId: existingAssignment.vendor_id,
      vendorNameSnapshot: existingAssignment.vendor_name_snapshot || vendorNameSnapshot,
      defaultDayRateSnapshot:
        existingAssignment.default_day_rate_snapshot ?? vendor.default_cost ?? 0,
      startDate: show.start_date,
      endDate: show.end_date,
    })

    revalidateNearbyPartnerPaths(showId)
    return
  }

  const { data: insertedAssignment, error: insertAssignmentError } = await supabase
    .from('show_vendors')
    .insert({
      organization_id: organizationId,
      show_id: showId,
      vendor_id: vendorId,
      vendor_name_snapshot: vendorNameSnapshot,
      service_type_snapshot: vendor.service_type,
      default_day_rate_snapshot: vendor.default_cost ?? 0,
    })
    .select('id, vendor_id, vendor_name_snapshot, default_day_rate_snapshot')
    .single()

  if (insertAssignmentError || !insertedAssignment?.id) {
    throw new Error(insertAssignmentError?.message || 'Failed to assign freelancer.')
  }

  await ensureVendorBudgetLine({
    supabase,
    organizationId,
    showId,
    showVendorId: insertedAssignment.id,
    vendorId: insertedAssignment.vendor_id,
    vendorNameSnapshot: insertedAssignment.vendor_name_snapshot || vendorNameSnapshot,
    defaultDayRateSnapshot:
      insertedAssignment.default_day_rate_snapshot ?? vendor.default_cost ?? 0,
    startDate: show.start_date,
    endDate: show.end_date,
  })

  revalidateNearbyPartnerPaths(showId)
}

export async function removeFreelancerFromShow(formData: FormData) {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()
  const { organizationId, membership, orgRole } = ctx

  const showId = String(formData.get('showId') || '').trim()
  const assignmentId = String(formData.get('assignmentId') || '').trim()

  if (!showId) throw new Error('Show id is required.')
  if (!assignmentId) throw new Error('Assignment id is required.')

  const { access } = await resolveShowAccess({
    supabase,
    showId,
    organizationId,
    membershipId: membership.id,
    orgRole,
  })

  if (!canEditBudgetStructure(access)) {
    throw new Error('You do not have permission to remove freelancers from this show.')
  }

  const { data: existingAssignment, error: lookupError } = await supabase
    .from('show_vendors')
    .select('id, organization_id, show_id')
    .eq('id', assignmentId)
    .eq('organization_id', organizationId)
    .eq('show_id', showId)
    .single()

  if (lookupError || !existingAssignment) {
    throw new Error(lookupError?.message || 'Assigned freelancer not found.')
  }

  const { error: deleteError } = await supabase
    .from('show_vendors')
    .delete()
    .eq('id', assignmentId)
    .eq('organization_id', organizationId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  revalidateNearbyPartnerPaths(showId)
}