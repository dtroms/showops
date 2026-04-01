'use client'

import { useFormState, useFormStatus } from 'react-dom'
import { createGearItem, updateGearItem, type GearState } from '@/app/actions/gear'

type GearItem = {
  id: string
  item_name: string
  internal_cost: number | null
  notes: string | null
  is_active: boolean
  category_name: string
  subcategory_name: string
}

const initialState: GearState = {}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
    >
      {pending ? 'Saving...' : mode === 'edit' ? 'Save Gear' : 'Create Gear'}
    </button>
  )
}

export function GearFormModal({
  mode,
  gearItem,
  onClose,
}: {
  mode: 'create' | 'edit'
  gearItem?: GearItem
  onClose: () => void
}) {
  const action = mode === 'edit' ? updateGearItem : createGearItem
  const [state, formAction] = useFormState(action, initialState)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold">
            {mode === 'edit' ? 'Edit Gear Item' : 'Add Gear Item'}
          </h3>
          <button onClick={onClose} className="rounded-lg border px-3 py-2 text-sm">
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === 'edit' && gearItem ? (
            <input type="hidden" name="gearItemId" value={gearItem.id} />
          ) : null}

          <div>
            <label className="block text-sm font-medium">Item Name</label>
            <input
              name="itemName"
              defaultValue={gearItem?.item_name ?? ''}
              required
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium">Category</label>
              <input
                name="categoryName"
                defaultValue={gearItem?.category_name ?? ''}
                required
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Subcategory</label>
              <input
                name="subcategoryName"
                defaultValue={gearItem?.subcategory_name ?? ''}
                className="mt-1 w-full rounded-lg border px-3 py-2"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium">Internal Cost</label>
            <input
              name="internalCost"
              type="number"
              step="0.01"
              defaultValue={gearItem?.internal_cost ?? ''}
              className="mt-1 w-full rounded-lg border px-3 py-2"
            />
          </div>

          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={gearItem?.notes ?? ''}
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