'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { finishSetup, type FinishSetupState } from '@/app/actions/setup'

const initialState: FinishSetupState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Creating workspace...' : 'Create Workspace'}
    </button>
  )
}

export default function FinishSetupPage() {
  const [state, formAction] = useFormState(finishSetup, initialState)

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">Finish Setup</h1>
      <p className="mt-2 text-sm text-slate-600">
        Create your workspace to enter the app.
      </p>

      <form action={formAction} className="mt-8 space-y-4 rounded-2xl border p-6">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium">Full Name</label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="workspaceName" className="block text-sm font-medium">Workspace Name</label>
          <input
            id="workspaceName"
            name="workspaceName"
            type="text"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <SubmitButton />
      </form>
    </main>
  )
}