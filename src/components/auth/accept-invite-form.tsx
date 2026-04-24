'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { acceptInvite, type AcceptInviteState } from '@/app/actions/accept-invite'

const initialState: AcceptInviteState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Creating account...' : 'Accept Invite'}
    </button>
  )
}

function card(title: string, body: string) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <h1 className="text-2xl font-semibold text-white">{title}</h1>
      <p className="mt-2 text-sm text-slate-400">{body}</p>
    </div>
  )
}

export function AcceptInviteForm({
  token,
  invite,
}: {
  token: string
  invite: {
    id: string
    email: string
    role: string
    expires_at: string
    accepted_at: string | null
    revoked_at: string | null
  } | null
}) {
  const [state, formAction] = useFormState(acceptInvite, initialState)

  if (!token || !invite) return card('Invite Not Found', 'This invite link is invalid or no longer exists.')
  if (invite.revoked_at) return card('Invite Revoked', 'This invite was revoked by your organization.')
  if (invite.accepted_at) return card('Invite Already Used', 'This invite has already been accepted.')
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return card('Invite Expired', 'This invite has expired. Ask leadership to send a new one.')
  }

  return (
    <form action={formAction} className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
      <input type="hidden" name="token" value={token} />

      <h1 className="text-2xl font-semibold text-white">Accept Invite</h1>
      <p className="mt-2 text-sm text-slate-400">
        You’ve been invited as <span className="font-medium text-white">{invite.role.replaceAll('_', ' ')}</span>.
      </p>

      <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.02] p-4">
        <p className="text-sm text-slate-500">Email</p>
        <p className="mt-1 font-medium text-white">{invite.email}</p>
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300">Full Name</label>
        <input
          name="fullName"
          required
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
        />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          className="mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white"
        />
      </div>

      {state.error ? <p className="mt-4 text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? <p className="mt-4 text-sm text-emerald-300">{state.success}</p> : null}

      <div className="mt-5">
        <SubmitButton />
      </div>
    </form>
  )
}