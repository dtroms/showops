'use client'

import { useFormState, useFormStatus } from 'react-dom'
import {
  createSupplyItem,
  updateSupplyItem,
  type SupplyState,
} from '@/app/actions/supplies'

type SupplyItem = {
  id: string
  supply_name: string
  unit_type: string | null
  default_cost: number | null
  notes: string | null
  is_active: boolean
}

const initialState: SupplyState = {}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Saving...' : mode === 'edit' ? 'Save Supply' : 'Create Supply'}
    </button>
  )
}

export function SupplyFormModal({
  mode,
  supplyItem,
  onClose,
}: {
  mode: 'create' | 'edit'
  supplyItem?: SupplyItem
  onClose: () => void
}) {
  const action = mode === 'edit' ? updateSupplyItem : createSupplyItem
  const [state, formAction] = useFormState(action, initialState)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {mode === 'edit' ? 'Edit Supply Item' : 'Add Supply Item'}
          </h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === 'edit' && supplyItem ? (
            <input type="hidden" name="supplyItemId" value={supplyItem.id} />
          ) : null}

          <div>
            <label className="block text-sm font-medium">Supply Name</label>
            <input
              name="supplyName"
              defaultValue={supplyItem?.supply_name ?? ''}
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Unit Type</label>
            <input
              name="unitType"
              defaultValue={supplyItem?.unit_type ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              placeholder="Each, Roll, Box, Pack, Gallon, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Default Cost</label>
            <input
              name="defaultCost"
              type="number"
              step="0.01"
              defaultValue={supplyItem?.default_cost ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={supplyItem?.notes ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}
          {state.success ? <p className="text-sm text-emerald-600">Saved successfully.</p> : null}

          <SubmitButton mode={mode} />
        </form>
      </div>
    </div>
  )
}