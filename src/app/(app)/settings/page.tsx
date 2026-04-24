import Link from 'next/link'
import { requireMembershipContext } from '@/lib/auth-context'
import { isLeadershipRole } from '@/lib/permissions'

type SettingsCard = {
  title: string
  description: string
  href: string
}

export default async function SettingsHomePage() {
  const ctx = await requireMembershipContext()
  const isLeadership = isLeadershipRole(ctx.orgRole)

  const cards: SettingsCard[] = [
    {
      title: 'Profile',
      description: 'Manage your personal account details and preferences.',
      href: '/settings/profile',
    },
    {
      title: 'Budget Targets',
      description: 'Set KPI targets and company-owned gear allocation settings.',
      href: '/settings/budget-targets',
    },
  ]

  if (isLeadership) {
    cards.push(
      {
        title: 'Supply Default Pricing',
        description: 'Set org-wide suggested supply pricing used in budget sheets.',
        href: '/settings/budget-presets/supply',
      },
      {
        title: 'Shipping Default Pricing',
        description: 'Set org-wide suggested shipping pricing used in budget sheets.',
        href: '/settings/budget-presets/shipping',
      },
      {
        title: 'Expedited Default Pricing',
        description: 'Set org-wide suggested expedited pricing used in budget sheets.',
        href: '/settings/budget-presets/expedited',
      }
    )
  }

  return (
    <div className="space-y-6">
      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
          Settings
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">
          Workspace Settings
        </h1>
        <p className="mt-2 text-sm text-slate-400">
          Manage profile, financial defaults, and system-wide configuration.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition hover:bg-white/[0.05]"
          >
            <h2 className="text-lg font-semibold text-white">{card.title}</h2>
            <p className="mt-2 text-sm text-slate-400">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  )
}