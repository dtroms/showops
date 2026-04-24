'use client'

import { useState, useTransition } from 'react'
import {
  createBudgetPreset,
  updateBudgetPreset,
  deleteBudgetPreset,
} from '@/app/actions/budget-presets'

type BudgetPreset = {
  id: string
  category_key: string
  item_label: string
  default_cost: number
}

const CATEGORY_META: Record<string, { title: string; description: string }> = {
  supply: {
    title: 'Supplies Default Pricing',
    description: 'Manage org-wide suggested costs for common supply items.',
  },
  shipping: {
    title: 'Shipping Default Pricing',
    description: 'Manage org-wide suggested costs for shipping and transport items.',
  },
  expedited: {
    title: 'Expedited Default Pricing',
    description: 'Manage org-wide suggested costs for emergency logistics items.',
  },
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

function fieldClass() {
  return 'rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white'
}

export function BudgetPresetManager({
  categoryKey,
  presets,
}: {
  categoryKey: 'supply' | 'shipping' | 'expedited'
  presets: BudgetPreset[]
}) {
  const meta = CATEGORY_META[categoryKey]
  const [newItemLabel, setNewItemLabel] = useState('')
  const [newDefaultCost, setNewDefaultCost] = useState('')
  const [pending, startTransition] = useTransition()

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <h1 className="text-2xl font-semibold text-white">{meta.title}</h1>
        <p className="mt-2 text-sm text-slate-400">{meta.description}</p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6">
        <h2 className="text-lg font-semibold text-white">Add Default Item</h2>

        <div className="mt-4 grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto]">
          <input
            value={newItemLabel}
            onChange={(e) => setNewItemLabel(e.target.value)}
            placeholder="Item name"
            className={fieldClass()}
          />

          <input
            value={newDefaultCost}
            onChange={(e) => setNewDefaultCost(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            placeholder="Default cost"
            className={fieldClass()}
          />

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const fd = new FormData()
                fd.set('categoryKey', categoryKey)
                fd.set('itemLabel', newItemLabel)
                fd.set('defaultCost', newDefaultCost)
                await createBudgetPreset(fd)
                setNewItemLabel('')
                setNewDefaultCost('')
              })
            }}
            className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
          >
            {pending ? 'Saving...' : 'Add Default'}
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03]">
        <div className="border-b border-white/10 px-6 py-4">
          <h2 className="text-lg font-semibold text-white">Current Defaults</h2>
        </div>

        <div className="divide-y divide-white/10">
          {presets.length === 0 ? (
            <div className="px-6 py-8 text-sm text-slate-500">No defaults saved yet.</div>
          ) : (
            presets.map((preset) => (
              <PresetRow key={preset.id} preset={preset} categoryKey={categoryKey} />
            ))
          )}
        </div>
      </div>
    </div>
  )
}

function PresetRow({
  preset,
  categoryKey,
}: {
  preset: BudgetPreset
  categoryKey: 'supply' | 'shipping' | 'expedited'
}) {
  const [editing, setEditing] = useState(false)
  const [itemLabel, setItemLabel] = useState(preset.item_label)
  const [defaultCost, setDefaultCost] = useState(String(preset.default_cost))
  const [pending, startTransition] = useTransition()

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <div>
          <p className="font-medium text-white">{preset.item_label}</p>
          <p className="mt-1 text-sm text-slate-500">{formatCurrency(preset.default_cost)}</p>
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-300"
          >
            Edit
          </button>

          <button
            type="button"
            disabled={pending}
            onClick={() => {
              startTransition(async () => {
                const fd = new FormData()
                fd.set('presetId', preset.id)
                fd.set('categoryKey', categoryKey)
                await deleteBudgetPreset(fd)
              })
            }}
            className="rounded-xl border border-rose-500/20 bg-rose-500/10 px-3 py-2 text-sm text-rose-300 disabled:opacity-50"
          >
            Delete
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 py-4">
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto_auto]">
        <input value={itemLabel} onChange={(e) => setItemLabel(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white" />

        <input
          value={defaultCost}
          onChange={(e) => setDefaultCost(e.target.value)}
          type="number"
          step="0.01"
          min="0"
          className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white"
        />

        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              const fd = new FormData()
              fd.set('presetId', preset.id)
              fd.set('categoryKey', categoryKey)
              fd.set('itemLabel', itemLabel)
              fd.set('defaultCost', defaultCost)
              await updateBudgetPreset(fd)
              setEditing(false)
            })
          }}
          className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 disabled:opacity-50"
        >
          Save
        </button>

        <button
          type="button"
          onClick={() => {
            setItemLabel(preset.item_label)
            setDefaultCost(String(preset.default_cost))
            setEditing(false)
          }}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}