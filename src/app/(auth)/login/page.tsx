'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { logIn, type LoginState } from '@/app/actions/auth'

const initialState: LoginState = {}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Logging in...' : 'Log in'}
    </button>
  )
}

export default function LoginPage() {
  const [state, formAction] = useFormState(logIn, initialState)

  return (
    <main className="mx-auto max-w-md p-8">
      <h1 className="text-3xl font-bold">Log in</h1>
      <p className="mt-2 text-sm text-slate-600">
        Access your company workspace.
      </p>

      <form action={formAction} className="mt-8 space-y-4 rounded-2xl border p-6">
        <div>
          <label htmlFor="email" className="block text-sm font-medium">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium">Password</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            className="mt-1 w-full rounded-lg border px-3 py-2"
          />
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <SubmitButton />
      </form>

      <p className="mt-4 text-sm text-slate-600">
        Need an account? <Link href="/signup" className="underline">Start your free trial</Link>
      </p>
    </main>
  )
}