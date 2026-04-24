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

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white outline-none placeholder:text-slate-500'
}

function SubmitButton({ mode }: { mode: 'create' | 'edit' }) {
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-2xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-slate-950 p-6 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-bold text-white">
            {mode === 'edit' ? 'Edit Gear Item' : 'Add Gear Item'}
          </h3>
          <button
            onClick={onClose}
            className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <form action={formAction} className="space-y-4">
          {mode === 'edit' && gearItem ? (
            <input type="hidden" name="gearItemId" value={gearItem.id} />
          ) : null}

          <div>
            <label className="block text-sm font-medium text-slate-300">Item Name</label>
            <input
              name="itemName"
              defaultValue={gearItem?.item_name ?? ''}
              required
              className={fieldClass()}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-300">Category</label>
              <input
                name="categoryName"
                defaultValue={gearItem?.category_name ?? ''}
                required
                className={fieldClass()}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300">Subcategory</label>
              <input
                name="subcategoryName"
                defaultValue={gearItem?.subcategory_name ?? ''}
                className={fieldClass()}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Internal Cost</label>
            <input
              name="internalCost"
              type="number"
              step="0.01"
              defaultValue={gearItem?.internal_cost ?? ''}
              className={fieldClass()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300">Notes</label>
            <textarea
              name="notes"
              rows={4}
              defaultValue={gearItem?.notes ?? ''}
              className={fieldClass()}
            />
          </div>

          {state.error ? <p className="text-sm text-rose-300">{state.error}</p> : null}
          {state.success ? (
            <p className="text-sm text-emerald-300">Saved successfully.</p>
          ) : null}

          <div className="flex justify-end">
            <SubmitButton mode={mode} />
          </div>
        </form>
      </div>
    </div>
  )
}