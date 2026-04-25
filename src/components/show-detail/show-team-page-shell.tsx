'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import {
  assignUserToShow,
  removeUserFromShow,
} from '@/app/actions/show-memberships'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { MetricCard } from '@/components/ui/metric-card'
import { MetricRow } from '@/components/ui/metric-row'
import { PageSection } from '@/components/ui/page-section'
import { SearchInput } from '@/components/ui/search-input'
import { StatusBadge } from '@/components/ui/status-badge'

type Assignment = {
  id: string
  membership_id: string
  show_role: 'lead' | 'co_pm' | 'coordinator' | 'warehouse' | 'crew' | 'viewer'
  full_name: string | null
  email: string | null
  is_auto_inherited?: boolean
  inherited_from_name?: string | null
}

type AssignableUser = {
  membership_id: string
  full_name: string | null
  email: string | null
}

const SHOW_ROLE_OPTIONS = [
  { value: 'lead', label: 'Lead PM' },
  { value: 'coordinator', label: 'Coordinator' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'crew', label: 'Crew' },
  { value: 'viewer', label: 'Viewer' },
]

function roleTone(role: string | null | undefined): 'info' | 'warning' | 'default' {
  const normalized = (role ?? '').toLowerCase()
  if (normalized === 'lead') return 'info'
  if (normalized === 'coordinator' || normalized === 'warehouse') return 'warning'
  return 'default'
}

function displayLabel(user: { full_name: string | null; email: string | null }) {
  return user.full_name || user.email || 'Unnamed User'
}

function fieldClass() {
  return 'h-10 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none'
}

function UpdateRoleForm({
  showId,
  membershipId,
  currentRole,
  canEdit,
  isAutoInherited,
}: {
  showId: string
  membershipId: string
  currentRole: string
  canEdit: boolean
  isAutoInherited?: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!canEdit) return null

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await assignUserToShow(formData)
          router.refresh()
        })
      }}
      className="flex flex-wrap items-center gap-2"
    >
      <input type="hidden" name="showId" value={showId} />
      <input type="hidden" name="membershipId" value={membershipId} />

      <select
        name="showRole"
        defaultValue={currentRole}
        className="h-10 rounded-xl border border-white/10 bg-white/5 px-3 text-sm text-white outline-none"
      >
        {SHOW_ROLE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
            {option.label}
          </option>
        ))}
      </select>

      <Button type="submit" variant="secondary" disabled={pending}>
        {pending ? 'Saving...' : isAutoInherited ? 'Convert & Save' : 'Update'}
      </Button>
    </form>
  )
}

function RemoveAssignmentButton({
  showId,
  assignmentId,
  canEdit,
}: {
  showId: string
  assignmentId: string
  canEdit: boolean
}) {
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  if (!canEdit) return null
  if (assignmentId.startsWith('auto-')) return null

  return (
    <form
      action={() => {
        startTransition(async () => {
          await removeUserFromShow(assignmentId, showId)
          router.refresh()
        })
      }}
    >
      <Button type="submit" variant="destructive" disabled={pending}>
        {pending ? 'Removing...' : 'Remove'}
      </Button>
    </form>
  )
}

function AssignUserAutosuggest({
  showId,
  users,
  canEdit,
}: {
  showId: string
  users: AssignableUser[]
  canEdit: boolean
}) {
  const [query, setQuery] = useState('')
  const [selectedMembershipId, setSelectedMembershipId] = useState('')
  const [role, setRole] = useState('crew')
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  const router = useRouter()

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase()
    const results = users.filter((user) => {
      const haystack = [user.full_name ?? '', user.email ?? ''].join(' ').toLowerCase()
      return !q || haystack.includes(q)
    })
    return results.slice(0, 8)
  }, [users, query])

  const selectedUser = users.find((user) => user.membership_id === selectedMembershipId) ?? null

  if (!canEdit) return null

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
      <div className="relative">
        <label className="block text-sm font-medium text-slate-300">Assign User</label>
        <input
          value={selectedUser ? displayLabel(selectedUser) : query}
          onChange={(e) => {
            setSelectedMembershipId('')
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder="Type a name or email..."
          className={`mt-1 ${fieldClass()}`}
        />

        {open && !selectedUser && suggestions.length > 0 ? (
          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-2xl">
            <div className="space-y-1">
              {suggestions.map((user) => (
                <button
                  key={user.membership_id}
                  type="button"
                  onClick={() => {
                    setSelectedMembershipId(user.membership_id)
                    setQuery('')
                    setOpen(false)
                  }}
                  className="flex w-full items-start rounded-xl px-3 py-2 text-left hover:bg-white/5"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-white">
                      {displayLabel(user)}
                    </p>
                    <p className="truncate text-xs text-slate-500">{user.email ?? 'No email'}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-300">Show Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className={`mt-1 ${fieldClass()}`}
        >
          {SHOW_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} className="bg-slate-900 text-white">
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <Button
          type="button"
          disabled={pending || !selectedMembershipId}
          onClick={() => {
            if (!selectedMembershipId) return

            startTransition(async () => {
              const formData = new FormData()
              formData.set('showId', showId)
              formData.set('membershipId', selectedMembershipId)
              formData.set('showRole', role)
              await assignUserToShow(formData)

              setQuery('')
              setSelectedMembershipId('')
              setRole('crew')
              setOpen(false)
              router.refresh()
            })
          }}
        >
          {pending ? 'Adding...' : 'Add Assignment'}
        </Button>
      </div>
    </div>
  )
}

export function ShowTeamPageShell({
  showId,
  showName,
  showNumber,
  showStatus,
  initialAssignments,
  assignableUsers,
  canEdit,
}: {
  showId: string
  showName: string
  showNumber: string | null
  showStatus: string | null
  initialAssignments: Assignment[]
  assignableUsers: AssignableUser[]
  canEdit: boolean
}) {
  const [search, setSearch] = useState('')
  const [openIds, setOpenIds] = useState<Record<string, boolean>>({})

  const assignments = useMemo(() => {
    return initialAssignments.filter((assignment) => {
      const haystack = [
        assignment.full_name ?? '',
        assignment.email ?? '',
        assignment.show_role ?? '',
        assignment.inherited_from_name ?? '',
      ]
        .join(' ')
        .toLowerCase()

      return !search || haystack.includes(search.toLowerCase())
    })
  }, [initialAssignments, search])

  const leadCount = assignments.filter((item) => item.show_role === 'lead').length
  const coordinatorCount = assignments.filter(
    (item) => item.show_role === 'coordinator'
  ).length
  const warehouseCount = assignments.filter((item) => item.show_role === 'warehouse').length
  const crewCount = assignments.filter((item) => item.show_role === 'crew').length

  return (
    <div className="space-y-6">
      <MetricRow columns={4}>
        <MetricCard label="Total Assigned" value={String(assignments.length)} />
        <MetricCard
          label="Lead / Coordinator"
          value={String(leadCount + coordinatorCount)}
          tone="info"
        />
        <MetricCard label="Warehouse" value={String(warehouseCount)} tone="warning" />
        <MetricCard label="Crew" value={String(crewCount)} />
      </MetricRow>

      {canEdit ? (
        <PageSection title="Add Assignment">
          <AssignUserAutosuggest
            showId={showId}
            users={assignableUsers}
            canEdit={canEdit}
          />
        </PageSection>
      ) : null}

      <PageSection
        title="Assigned Team"
        actions={
          <div className="w-full max-w-sm">
<SearchInput
  value={search}
  onChange={(value) => {
    if (typeof value === 'string') {
      setSearch(value)
      return
    }

    setSearch(value.target.value)
  }}
  placeholder="Search assigned team..."
/>
          </div>
        }
      >
        {!assignments.length ? (
          <EmptyState
            title="No assigned team members"
            description="No assigned team members match your current search."
          />
        ) : (
          <div className="space-y-3">
            {assignments.map((assignment) => {
              const isOpen = Boolean(openIds[assignment.id])
              const label = displayLabel(assignment)

              return (
                <div
                  key={assignment.id}
                  className="overflow-hidden rounded-[20px] border border-white/10 bg-white/[0.03]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setOpenIds((prev) => ({
                        ...prev,
                        [assignment.id]: !prev[assignment.id],
                      }))
                    }
                    className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate font-medium text-white">{label}</p>
                        <StatusBadge
                          label={assignment.show_role.replaceAll('_', ' ')}
                          tone={roleTone(assignment.show_role)}
                        />
                        {assignment.is_auto_inherited ? (
                          <StatusBadge label="Auto" tone="default" />
                        ) : null}
                      </div>

                      <p className="mt-1 truncate text-xs text-slate-500">
                        {assignment.email ?? 'No email'}
                        {assignment.is_auto_inherited && assignment.inherited_from_name
                          ? ` • via ${assignment.inherited_from_name}`
                          : ''}
                      </p>
                    </div>

                    <span className="text-xs text-slate-500">
                      {isOpen ? 'Hide' : 'Edit'}
                    </span>
                  </button>

                  {isOpen ? (
                    <div className="border-t border-white/10 bg-white/[0.02] px-4 py-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <UpdateRoleForm
                          showId={showId}
                          membershipId={assignment.membership_id}
                          currentRole={assignment.show_role}
                          canEdit={canEdit}
                          isAutoInherited={assignment.is_auto_inherited}
                        />
                        <RemoveAssignmentButton
                          showId={showId}
                          assignmentId={assignment.id}
                          canEdit={canEdit}
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              )
            })}
          </div>
        )}
      </PageSection>
    </div>
  )
}