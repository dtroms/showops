'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { updateMyProfile, type ProfileSettingsState } from '@/app/actions/profile-settings'

const initialState: ProfileSettingsState = {}

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-100 disabled:opacity-50"
    >
      {pending ? 'Saving...' : 'Save Changes'}
    </button>
  )
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-white'
}

export function ProfileSettingsForm({
  profile,
}: {
  profile: {
    fullName: string
    email: string
  }
}) {
  const [state, formAction] = useFormState(updateMyProfile, initialState)

  return (
    <form
      action={formAction}
      className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]"
    >
      <div>
        <h2 className="text-lg font-semibold tracking-tight text-white">Profile</h2>
        <p className="mt-1 text-sm text-slate-400">Update your name and password.</p>
      </div>

      <div className="mt-5">
        <label className="block text-sm font-medium text-slate-300">Full Name</label>
        <input name="fullName" defaultValue={profile.fullName} required className={fieldClass()} />
      </div>

      <div className="mt-4">
        <label className="block text-sm font-medium text-slate-300">Email</label>
        <input value={profile.email} readOnly className={`${fieldClass()} text-slate-400`} />
      </div>

      <div className="mt-6 border-t border-white/10 pt-6">
        <h3 className="text-base font-semibold text-white">Change Password</h3>
        <p className="mt-1 text-sm text-slate-400">
          Leave these blank if you do not want to change your password.
        </p>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300">New Password</label>
          <input name="newPassword" type="password" minLength={8} className={fieldClass()} />
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-300">Confirm New Password</label>
          <input name="confirmPassword" type="password" minLength={8} className={fieldClass()} />
        </div>
      </div>

      {state.error ? <p className="mt-4 text-sm text-rose-300">{state.error}</p> : null}
      {state.success ? <p className="mt-4 text-sm text-emerald-300">{state.success}</p> : null}

      <div className="mt-6">
        <SubmitButton />
      </div>
    </form>
  )
}