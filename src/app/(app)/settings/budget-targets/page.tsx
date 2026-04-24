import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { updateBudgetTargets } from '@/app/actions/budget-targets'
import { updateOrganizationFinancialSettings } from '@/app/actions/organization-financial-settings'

type BudgetTargetRow = {
  category_key: 'gear' | 'w2_labor' | 'freelance_labor' | 'supply' | 'travel'
  target_percent: number
  warning_percent: number | null
}

type OrganizationFinancialSettingsRow = {
  company_owned_gear_percent: number
}

const CATEGORY_CONFIG: Array<{
  key: BudgetTargetRow['category_key']
  label: string
  description: string
}> = [
  {
    key: 'gear',
    label: 'Gear',
    description: 'Equipment and sub-rented gear costs as a percentage of total show revenue.',
  },
  {
    key: 'w2_labor',
    label: 'W2 Labor',
    description: 'Internal labor cost target as a percentage of total show revenue.',
  },
  {
    key: 'freelance_labor',
    label: 'Freelance Labor',
    description: 'Freelance labor target as a percentage of total show revenue.',
  },
  {
    key: 'supply',
    label: 'Supplies',
    description: 'Supplies and consumables target as a percentage of total show revenue.',
  },
  {
    key: 'travel',
    label: 'Travel',
    description: 'Travel-related costs target as a percentage of total show revenue.',
  },
]

function getDefaultTarget(key: BudgetTargetRow['category_key']) {
  switch (key) {
    case 'gear':
      return { target_percent: 35, warning_percent: 40 }
    case 'w2_labor':
      return { target_percent: 30, warning_percent: 35 }
    case 'freelance_labor':
      return { target_percent: 18, warning_percent: 20 }
    case 'supply':
      return { target_percent: 5, warning_percent: 7.5 }
    case 'travel':
      return { target_percent: 15, warning_percent: 18 }
    default:
      return { target_percent: 0, warning_percent: null }
  }
}

function fieldClass() {
  return 'mt-1 w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white'
}

function saveButtonClass() {
  return 'rounded-2xl bg-white px-5 py-2.5 text-sm font-medium text-slate-950 transition hover:bg-slate-100'
}

export default async function BudgetTargetsSettingsPage() {
  const supabase = await createClient()

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    notFound()
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single()

  if (profileError || !profile?.organization_id) {
    notFound()
  }

  const organizationId = profile.organization_id as string

  const [{ data: targets, error: targetsError }, { data: financialSettings, error: financialSettingsError }] =
    await Promise.all([
      supabase
        .from('organization_budget_targets')
        .select('category_key, target_percent, warning_percent')
        .eq('organization_id', organizationId),

      supabase
        .from('organization_financial_settings')
        .select('company_owned_gear_percent')
        .eq('organization_id', organizationId)
        .maybeSingle(),
    ])

  if (targetsError) {
    throw new Error(targetsError.message)
  }

  if (financialSettingsError) {
    throw new Error(financialSettingsError.message)
  }

  const targetMap = new Map<string, BudgetTargetRow>(
    ((targets ?? []) as BudgetTargetRow[]).map((row) => [row.category_key, row])
  )

  const financialRow = financialSettings as OrganizationFinancialSettingsRow | null
  const companyOwnedGearPercent = financialRow?.company_owned_gear_percent ?? 2.5

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Budget Targets</h1>
        <p className="mt-2 max-w-3xl text-sm text-slate-400">
          Set KPI targets by category as a percentage of total show revenue. Leave a target blank
          if you do not want KPI tracking for that category.
        </p>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-white">Financial Settings</h2>
          <p className="mt-1 text-sm text-slate-400">
            Set the company-owned gear allocation rate used on the budget sheet. This displays
            above the Gear category and does not affect the Gear subtotal.
          </p>
        </div>

        <form action={updateOrganizationFinancialSettings} className="space-y-4">
          <div className="max-w-sm">
            <label
              htmlFor="company_owned_gear_percent"
              className="block text-sm font-medium text-slate-300"
            >
              Company-Owned Gear Allocation %
            </label>
            <input
              id="company_owned_gear_percent"
              name="company_owned_gear_percent"
              type="number"
              step="0.1"
              min="0"
              defaultValue={companyOwnedGearPercent}
              className={fieldClass()}
            />
          </div>

          <div className="flex items-center justify-end">
            <button type="submit" className={saveButtonClass()}>
              Save Financial Settings
            </button>
          </div>
        </form>
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white">Category KPI Targets</h2>
          <p className="mt-1 text-sm text-slate-400">
            KPI thresholds are measured as a percentage of total show revenue.
          </p>
        </div>

        <form action={updateBudgetTargets} className="space-y-6">
          <div className="space-y-4">
            {CATEGORY_CONFIG.map((category) => {
              const existing = targetMap.get(category.key)
              const fallback = getDefaultTarget(category.key)

              const targetPercent =
                existing?.target_percent !== undefined
                  ? existing.target_percent
                  : fallback.target_percent

              const warningPercent =
                existing?.warning_percent !== undefined
                  ? existing.warning_percent ?? ''
                  : fallback.warning_percent ?? ''

              return (
                <div
                  key={category.key}
                  className="rounded-[24px] border border-white/10 bg-white/[0.02] p-5"
                >
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-white">{category.label}</h3>
                    <p className="mt-1 text-sm text-slate-400">{category.description}</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <label
                        htmlFor={`${category.key}_target_percent`}
                        className="block text-sm font-medium text-slate-300"
                      >
                        Target %
                      </label>
                      <input
                        id={`${category.key}_target_percent`}
                        name={`${category.key}_target_percent`}
                        type="number"
                        step="0.1"
                        min="0"
                        defaultValue={targetPercent}
                        className={fieldClass()}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor={`${category.key}_warning_percent`}
                        className="block text-sm font-medium text-slate-300"
                      >
                        Warning %
                      </label>
                      <input
                        id={`${category.key}_warning_percent`}
                        name={`${category.key}_warning_percent`}
                        type="number"
                        step="0.1"
                        min="0"
                        defaultValue={warningPercent}
                        className={fieldClass()}
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="flex items-center justify-end">
            <button type="submit" className={saveButtonClass()}>
              Save Budget Targets
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}