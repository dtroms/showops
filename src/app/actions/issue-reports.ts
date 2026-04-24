'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { requireMembershipContext } from '@/lib/auth-context'
import { canManageUsers } from '@/lib/permissions'

export type CreateIssueReportState = {
  error?: string
  success?: string
}

export type IssueReportRow = {
  id: string
  organization_id: string
  reported_by_user_id: string | null
  reported_by_membership_id: string | null
  title: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'new' | 'acknowledged' | 'fixed' | 'closed'
  route: string
  show_id: string | null
  browser_info: string | null
  page_context: Record<string, unknown> | null
  resolution_notes: string | null
  created_at: string
  updated_at: string
  reporter_name?: string | null
  reporter_email?: string | null
}

export type UpdateIssueReportState = {
  error?: string
  success?: string
}

function revalidateIssuePaths() {
  revalidatePath('/settings')
  revalidatePath('/settings/issues')
}

function normalizeRoute(value: string) {
  const trimmed = value.trim()
  if (!trimmed) return '/dashboard'
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`
}

function parseShowIdFromRoute(route: string): string | null {
  const match = route.match(/\/shows\/([^/]+)/)
  return match?.[1] ?? null
}

export async function createIssueReport(
  _prevState: CreateIssueReportState,
  formData: FormData
): Promise<CreateIssueReportState> {
  try {
    const supabase = await createClient()
    const ctx = await requireMembershipContext()

    if (!ctx.organizationId || !ctx.membership?.id || !ctx.userId) {
      return { error: 'You must be signed in to report an issue.' }
    }

    const title = String(formData.get('title') || '').trim()
    const description = String(formData.get('description') || '').trim()
    const severity = String(formData.get('severity') || 'medium').trim() as
      | 'low'
      | 'medium'
      | 'high'
      | 'critical'
    const route = normalizeRoute(String(formData.get('route') || '').trim())
    const browserInfo =
      String(formData.get('browserInfo') || '').trim() || null
    const rawShowId = String(formData.get('showId') || '').trim() || null

    if (!title) return { error: 'Issue title is required.' }
    if (!description) return { error: 'Issue description is required.' }

    const showId = rawShowId || parseShowIdFromRoute(route)

    const pageContext = {
      route,
      pathname: route,
      submitted_at: new Date().toISOString(),
    }

    const { error } = await supabase.from('issue_reports').insert({
      organization_id: ctx.organizationId,
      reported_by_user_id: ctx.userId,
      reported_by_membership_id: ctx.membership.id,
      title,
      description,
      severity,
      status: 'new',
      route,
      show_id: showId,
      browser_info: browserInfo,
      page_context: pageContext,
    })

    if (error) {
      return { error: error.message }
    }

    revalidateIssuePaths()
    return { success: 'Issue reported. Thank you.' }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to submit issue report.',
    }
  }
}

export async function listIssueReports(): Promise<IssueReportRow[]> {
  const supabase = await createClient()
  const ctx = await requireMembershipContext()

  if (!ctx.organizationId || !canManageUsers(ctx.orgRole)) {
    throw new Error('You do not have permission to view reported issues.')
  }

  const { data: rows, error } = await supabase
    .from('issue_reports')
    .select(`
      id,
      organization_id,
      reported_by_user_id,
      reported_by_membership_id,
      title,
      description,
      severity,
      status,
      route,
      show_id,
      browser_info,
      page_context,
      resolution_notes,
      created_at,
      updated_at
    `)
    .eq('organization_id', ctx.organizationId)
    .order('created_at', { ascending: false })
    .returns<IssueReportRow[]>()

  if (error) {
    throw new Error(error.message)
  }

  const userIds = Array.from(
    new Set((rows ?? []).map((row) => row.reported_by_user_id).filter(Boolean))
  ) as string[]

  let profileMap = new Map<string, { full_name: string | null; email: string | null }>()

  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds)
      .returns<Array<{ id: string; full_name: string | null; email: string | null }>>()

    if (profileError) {
      throw new Error(profileError.message)
    }

    profileMap = new Map(
      (profiles ?? []).map((profile) => [
        profile.id,
        { full_name: profile.full_name, email: profile.email },
      ])
    )
  }

  return (rows ?? []).map((row) => {
    const profile = row.reported_by_user_id
      ? profileMap.get(row.reported_by_user_id)
      : undefined

    return {
      ...row,
      reporter_name: profile?.full_name ?? null,
      reporter_email: profile?.email ?? null,
    }
  })
}

export async function updateIssueReportStatus(
  _prevState: UpdateIssueReportState,
  formData: FormData
): Promise<UpdateIssueReportState> {
  try {
    const supabase = await createClient()
    const ctx = await requireMembershipContext()

    if (!ctx.organizationId || !canManageUsers(ctx.orgRole)) {
      return { error: 'You do not have permission to update issues.' }
    }

    const issueId = String(formData.get('issueId') || '').trim()
    const status = String(formData.get('status') || '').trim() as
      | 'new'
      | 'acknowledged'
      | 'fixed'
      | 'closed'
    const resolutionNotes =
      String(formData.get('resolutionNotes') || '').trim() || null

    if (!issueId) return { error: 'Issue id is required.' }

    const { error } = await supabase
      .from('issue_reports')
      .update({
        status,
        resolution_notes: resolutionNotes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', issueId)
      .eq('organization_id', ctx.organizationId)

    if (error) {
      return { error: error.message }
    }

    revalidateIssuePaths()
    return { success: 'Issue updated.' }
  } catch (error) {
    return {
      error:
        error instanceof Error ? error.message : 'Failed to update issue.',
    }
  }
}