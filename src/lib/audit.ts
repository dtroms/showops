import { createClient } from '@/lib/supabase/server'
import type { PlatformRole } from '@/lib/auth-context'

export type AuditEntityType =
  | 'organization'
  | 'organization_membership'
  | 'show'
  | 'show_membership'
  | 'vendor'
  | 'show_vendor'
  | 'budget_version'
  | 'budget_line_item'
  | 'time_entry'
  | 'system'

export type AuditActionType =
  | 'create'
  | 'update'
  | 'delete'
  | 'assign'
  | 'unassign'
  | 'status_change'
  | 'lock'
  | 'unlock'
  | 'archive'
  | 'unarchive'
  | 'invite'
  | 'enable'
  | 'disable'
  | 'approve'
  | 'reject'
  | 'system_create'
  | 'system_update'
  | 'system_repair'
  | 'impersonation_start'
  | 'impersonation_end'

export interface AuditEventInput {
  organizationId: string | null
  actorUserId: string | null
  actorMembershipId?: string | null
  actorPlatformRole?: PlatformRole | null
  entityType: AuditEntityType | string
  entityId: string
  showId?: string | null
  actionType: AuditActionType | string
  changeSummary: string
  beforeJson?: Record<string, unknown> | null
  afterJson?: Record<string, unknown> | null
  metadataJson?: Record<string, unknown> | null
  reason?: string | null
}

type AuditInsertRow = {
  organization_id: string | null
  actor_user_id: string | null
  actor_membership_id: string | null
  actor_platform_role: PlatformRole | null
  entity_type: string
  entity_id: string
  show_id: string | null
  action_type: string
  change_summary: string
  before_json: Record<string, unknown> | null
  after_json: Record<string, unknown> | null
  metadata_json: Record<string, unknown> | null
  reason: string | null
}

function cleanObject<T extends Record<string, unknown>>(obj: T | null | undefined): T | null {
  if (!obj) return null
  const entries = Object.entries(obj).filter(([, value]) => value !== undefined)
  return entries.length ? (Object.fromEntries(entries) as T) : null
}

export function diffAuditValues(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): {
  beforeJson: Record<string, unknown> | null
  afterJson: Record<string, unknown> | null
} {
  const safeBefore = before ?? {}
  const safeAfter = after ?? {}
  const allKeys = new Set([...Object.keys(safeBefore), ...Object.keys(safeAfter)])

  const beforeDiff: Record<string, unknown> = {}
  const afterDiff: Record<string, unknown> = {}

  for (const key of allKeys) {
    const beforeValue = safeBefore[key]
    const afterValue = safeAfter[key]

    if (JSON.stringify(beforeValue) !== JSON.stringify(afterValue)) {
      beforeDiff[key] = beforeValue
      afterDiff[key] = afterValue
    }
  }

  return {
    beforeJson: cleanObject(beforeDiff),
    afterJson: cleanObject(afterDiff),
  }
}

/**
 * Strict audit logger.
 * Throws when insert fails so we can actually see what's wrong while building Phase 2.
 */
export async function logAuditEvent(input: AuditEventInput): Promise<void> {
  const supabase = await createClient()

  const row: AuditInsertRow = {
    organization_id: input.organizationId ?? null,
    actor_user_id: input.actorUserId ?? null,
    actor_membership_id: input.actorMembershipId ?? null,
    actor_platform_role: input.actorPlatformRole ?? null,
    entity_type: input.entityType,
    entity_id: input.entityId,
    show_id: input.showId ?? null,
    action_type: input.actionType,
    change_summary: input.changeSummary,
    before_json: cleanObject(input.beforeJson),
    after_json: cleanObject(input.afterJson),
    metadata_json: cleanObject(input.metadataJson),
    reason: input.reason ?? null,
  }

  const { error } = await supabase.from('audit_logs').insert(row)

  if (error) {
    console.error('logAuditEvent: failed inserting audit log', {
      error,
      row,
    })
    throw new Error(`Audit log insert failed: ${error.message}`)
  }
}

export async function logCreateAuditEvent(params: {
  organizationId: string | null
  actorUserId: string | null
  actorMembershipId?: string | null
  actorPlatformRole?: PlatformRole | null
  entityType: AuditEntityType | string
  entityId: string
  showId?: string | null
  changeSummary: string
  afterJson?: Record<string, unknown> | null
  metadataJson?: Record<string, unknown> | null
  reason?: string | null
}) {
  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    actorMembershipId: params.actorMembershipId,
    actorPlatformRole: params.actorPlatformRole,
    entityType: params.entityType,
    entityId: params.entityId,
    showId: params.showId,
    actionType: 'create',
    changeSummary: params.changeSummary,
    beforeJson: null,
    afterJson: params.afterJson ?? null,
    metadataJson: params.metadataJson ?? null,
    reason: params.reason ?? null,
  })
}

export async function logUpdateAuditEvent(params: {
  organizationId: string | null
  actorUserId: string | null
  actorMembershipId?: string | null
  actorPlatformRole?: PlatformRole | null
  entityType: AuditEntityType | string
  entityId: string
  showId?: string | null
  changeSummary: string
  before: Record<string, unknown> | null
  after: Record<string, unknown> | null
  metadataJson?: Record<string, unknown> | null
  reason?: string | null
}) {
  const { beforeJson, afterJson } = diffAuditValues(params.before, params.after)

  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    actorMembershipId: params.actorMembershipId,
    actorPlatformRole: params.actorPlatformRole,
    entityType: params.entityType,
    entityId: params.entityId,
    showId: params.showId,
    actionType: 'update',
    changeSummary: params.changeSummary,
    beforeJson,
    afterJson,
    metadataJson: params.metadataJson ?? null,
    reason: params.reason ?? null,
  })
}

export async function logDeleteAuditEvent(params: {
  organizationId: string | null
  actorUserId: string | null
  actorMembershipId?: string | null
  actorPlatformRole?: PlatformRole | null
  entityType: AuditEntityType | string
  entityId: string
  showId?: string | null
  changeSummary: string
  beforeJson?: Record<string, unknown> | null
  metadataJson?: Record<string, unknown> | null
  reason?: string | null
}) {
  await logAuditEvent({
    organizationId: params.organizationId,
    actorUserId: params.actorUserId,
    actorMembershipId: params.actorMembershipId,
    actorPlatformRole: params.actorPlatformRole,
    entityType: params.entityType,
    entityId: params.entityId,
    showId: params.showId,
    actionType: 'delete',
    changeSummary: params.changeSummary,
    beforeJson: params.beforeJson ?? null,
    afterJson: null,
    metadataJson: params.metadataJson ?? null,
    reason: params.reason ?? null,
  })
}