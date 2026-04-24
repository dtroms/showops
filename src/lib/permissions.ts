import type { OrgRole } from '@/lib/auth-context'

export type ShowRole =
  | 'lead'
  | 'co_pm'
  | 'coordinator'
  | 'warehouse'
  | 'crew'
  | 'viewer'

export type ShowStatus =
  | 'draft'
  | 'planning'
  | 'active'
  | 'completed'
  | 'locked'
  | 'archived'

export interface ShowAccessContext {
  orgRole: OrgRole | null
  showRole: ShowRole | null
  showStatus: ShowStatus
  isAssigned: boolean
  isManagedTeam?: boolean
}

export interface FeatureOverrideMap {
  reports?: { can_view: boolean; can_edit: boolean }
  audit_log?: { can_view: boolean; can_edit: boolean }
  gear?: { can_view: boolean; can_edit: boolean }
  supplies?: { can_view: boolean; can_edit: boolean }
}

export function normalizeShowStatus(status: string | null | undefined): ShowStatus {
  const value = (status ?? '').toLowerCase()

  if (value === 'planning') return 'planning'
  if (value === 'active' || value === 'in_progress') return 'active'
  if (value === 'completed') return 'completed'
  if (value === 'locked') return 'locked'
  if (value === 'archived') return 'archived'
  return 'draft'
}

export function canAssignLeadershipRoles(role: OrgRole | null | undefined): boolean {
  return role === 'owner' || role === 'org_admin'
}

export function canAssignOperationalRoles(role: OrgRole | null | undefined): boolean {
  return role === 'owner' || role === 'org_admin' || role === 'ops_manager'
}

export function canDisableUsers(role: OrgRole | null | undefined): boolean {
  return role === 'owner' || role === 'org_admin'
}

export function isOrgAdminRole(role: OrgRole | null | undefined): boolean {
  return role === 'owner' || role === 'org_admin'
}

export function isOpsManagerRole(role: OrgRole | null | undefined): boolean {
  return role === 'ops_manager'
}

export function isLeadershipRole(role: OrgRole | null | undefined): boolean {
  return isOrgAdminRole(role) || role === 'ops_manager'
}

export function canManageUsers(role: OrgRole | null | undefined): boolean {
  return isOrgAdminRole(role)
}

export function canViewOrgAudit(role: OrgRole | null | undefined): boolean {
  return isOrgAdminRole(role)
}

export function canViewOrgFinancials(role: OrgRole | null | undefined): boolean {
  return isOrgAdminRole(role)
}

export function canCreateShows(role: OrgRole | null | undefined): boolean {
  return (
    role === 'owner' ||
    role === 'org_admin' ||
    role === 'ops_manager' ||
    role === 'project_manager'
  )
}

export function canViewOrgVendorLibrary(role: OrgRole | null | undefined): boolean {
  return (
    role === 'owner' ||
    role === 'org_admin' ||
    role === 'ops_manager' ||
    role === 'project_manager'
  )
}

export function canEditOrgVendorLibrary(role: OrgRole | null | undefined): boolean {
  return (
    role === 'owner' ||
    role === 'org_admin' ||
    role === 'ops_manager' ||
    role === 'project_manager'
  )
}

export function canViewShow(ctx: ShowAccessContext): boolean {
  if (isOrgAdminRole(ctx.orgRole)) return true
  if (ctx.orgRole === 'ops_manager') return ctx.isAssigned || ctx.isManagedTeam === true
  if (ctx.orgRole === 'project_manager') return ctx.isAssigned
  if (ctx.orgRole === 'warehouse_admin') return ctx.isAssigned
  if (ctx.orgRole === 'coordinator') return ctx.isAssigned
  return ctx.isAssigned
}

export function canViewAssignments(ctx: ShowAccessContext): boolean {
  return canViewShow(ctx)
}

export function canEditShow(ctx: ShowAccessContext): boolean {
  if (isOrgAdminRole(ctx.orgRole)) return true
  if (ctx.showStatus === 'locked' || ctx.showStatus === 'archived') return false

  if (ctx.orgRole === 'ops_manager') return ctx.isAssigned || ctx.isManagedTeam === true

  if (ctx.orgRole === 'project_manager') {
    return ctx.showRole === 'lead' || ctx.showRole === 'co_pm' || ctx.showRole === 'coordinator'
  }

  if (ctx.orgRole === 'coordinator' && ctx.showRole === 'coordinator') return true
  if (ctx.orgRole === 'warehouse_admin' && ctx.showRole === 'warehouse') return true

  return false
}

export function canEditShowIdentity(ctx: ShowAccessContext): boolean {
  return canEditShow(ctx)
}

export function canEditShowStatus(ctx: ShowAccessContext): boolean {
  return isOrgAdminRole(ctx.orgRole) || ctx.orgRole === 'ops_manager'
}

export function canEditOperations(ctx: ShowAccessContext): boolean {
  return canEditShow(ctx)
}

export function canEditBudgetStructure(ctx: ShowAccessContext): boolean {
  if (isOrgAdminRole(ctx.orgRole)) return true

  if (
    ctx.showStatus === 'active' ||
    ctx.showStatus === 'completed' ||
    ctx.showStatus === 'locked' ||
    ctx.showStatus === 'archived'
  ) {
    return false
  }

  if (ctx.orgRole === 'ops_manager') {
    return true
  }

  if (ctx.orgRole === 'project_manager') {
    if (ctx.showRole === 'lead' || ctx.showRole === 'co_pm') return true
    if (ctx.isManagedTeam === true) return true
  }

  return false
}

export function canEditBudgetValues(ctx: ShowAccessContext): boolean {
  if (isOrgAdminRole(ctx.orgRole)) return true

  if (ctx.showStatus === 'locked' || ctx.showStatus === 'archived') {
    return false
  }

  if (ctx.orgRole === 'ops_manager') {
    return ctx.isAssigned || ctx.isManagedTeam === true
  }

  if (ctx.orgRole === 'project_manager') {
    return (
      ctx.showRole === 'lead' ||
      ctx.showRole === 'co_pm' ||
      ctx.showRole === 'coordinator'
    )
  }

  if (ctx.orgRole === 'coordinator') {
    return (
      ctx.showRole === 'coordinator' &&
      (ctx.showStatus === 'draft' || ctx.showStatus === 'planning')
    )
  }

  return false
}

export function canViewBudget(ctx: ShowAccessContext): boolean {
  if (isOrgAdminRole(ctx.orgRole)) return true
  if (ctx.orgRole === 'ops_manager') return ctx.isAssigned || ctx.isManagedTeam === true
  if (ctx.orgRole === 'project_manager') return ctx.isAssigned
  if (ctx.orgRole === 'coordinator') return ctx.isAssigned
  if (ctx.orgRole === 'warehouse_admin') return ctx.isAssigned
  return false
}

export function canViewRevenue(ctx: ShowAccessContext): boolean {
  return isOrgAdminRole(ctx.orgRole) || ctx.isAssigned || ctx.isManagedTeam === true
}

export function canViewShowProfitability(ctx: ShowAccessContext): boolean {
  return isOrgAdminRole(ctx.orgRole) || ctx.isAssigned || ctx.isManagedTeam === true
}

export function canAccessFeature(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined,
  key: keyof FeatureOverrideMap
) {
  if (isOrgAdminRole(role)) return { canView: true, canEdit: true }
  const match = overrides?.[key]
  return {
    canView: Boolean(match?.can_view),
    canEdit: Boolean(match?.can_edit),
  }
}

export function canViewReportsWithOverride(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined
) {
  if (isOrgAdminRole(role)) return true
  return canAccessFeature(role, overrides, 'reports').canView
}

export function canViewAuditWithOverride(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined
) {
  if (isOrgAdminRole(role)) return true
  return canAccessFeature(role, overrides, 'audit_log').canView
}

export function canViewGearWithOverride(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined
) {
  if (isOrgAdminRole(role)) return true
  return canAccessFeature(role, overrides, 'gear').canView
}

export function canEditGearWithOverride(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined
) {
  if (isOrgAdminRole(role)) return true
  return canAccessFeature(role, overrides, 'gear').canEdit
}

export function canViewSuppliesWithOverride(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined
) {
  if (isOrgAdminRole(role)) return true
  return canAccessFeature(role, overrides, 'supplies').canView
}

export function canEditSuppliesWithOverride(
  role: OrgRole | null | undefined,
  overrides: FeatureOverrideMap | null | undefined
) {
  if (isOrgAdminRole(role)) return true
  return canAccessFeature(role, overrides, 'supplies').canEdit
}