'use client'

import { useFormStatus } from 'react-dom'
import { updateMemberManager, type TeamStructureState } from '@/app/actions/team-structure'

type MemberRow = {
  membership_id: string
  user_id: string
  role: string
  status: string
  full_name: string | null
  email: string | null
  reports_to_membership_id: string | null
  manager_label: string | null
}

const initialState: TeamStructureState = {}

function SaveButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition hover:bg-white/10 hover:text-white disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save'}
    </button>
  )
}

function labelFor(member: MemberRow) {
  return member.full_name || member.email || 'Unnamed User'
}

export function TeamStructurePanel({ members }: { members: MemberRow[] }) {
  const managerOptions = members.filter(
    (member) =>
      member.status === 'active' &&
      (member.role === 'owner' || member.role === 'org_admin' || member.role === 'ops_manager')
  )

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Reporting Structure</h2>
        <p className="mt-1 text-sm text-slate-400">
          Assign PMs, coordinators, and crew under an ops manager or admin.
        </p>
      </div>

      {!members.length ? (
        <div className="mt-4 rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-6 text-sm text-slate-500">
          No team members found.
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          <table className="w-full text-left text-sm">
            <thead className="bg-white/[0.03] text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Member</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Current Manager</th>
                <th className="px-4 py-3 font-semibold">Assign Manager</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => {
                const canHaveManager = member.role !== 'owner' && member.role !== 'org_admin'

                return (
                  <tr key={member.membership_id} className="border-t border-white/10">
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{labelFor(member)}</div>
                      <div className="mt-1 text-xs text-slate-500">{member.email ?? '—'}</div>
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {member.role.replaceAll('_', ' ')}
                    </td>

                    <td className="px-4 py-4 text-slate-300">
                      {member.manager_label ?? 'None'}
                    </td>

                    <td className="px-4 py-4">
                      {canHaveManager ? (
                       <form
  action={async (formData) => {
    await updateMemberManager(initialState, formData)
  }}
  className="flex items-center gap-2"
>
                          <input type="hidden" name="membershipId" value={member.membership_id} />
                          <select
                            name="reportsToMembershipId"
                            defaultValue={member.reports_to_membership_id ?? ''}
                            className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
                          >
                            <option value="" className="bg-slate-900 text-white">No manager</option>
                            {managerOptions
                              .filter((option) => option.membership_id !== member.membership_id)
                              .map((option) => (
                                <option
                                  key={option.membership_id}
                                  value={option.membership_id}
                                  className="bg-slate-900 text-white"
                                >
                                  {labelFor(option)} ({option.role.replaceAll('_', ' ')})
                                </option>
                              ))}
                          </select>
                          <SaveButton />
                        </form>
                      ) : (
                        <span className="text-xs text-slate-500">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}