import type { ReactNode } from 'react'
import Link from 'next/link'
import { requireMembershipContext } from '@/lib/auth-context'
import { canManageUsers, isLeadershipRole } from '@/lib/permissions'

type SettingsLayoutProps = {
  children: ReactNode
}

export default async function SettingsLayout({ children }: SettingsLayoutProps) {
  const ctx = await requireMembershipContext()
  const isLeadership = isLeadershipRole(ctx.orgRole)
  const canManageUsersHere = canManageUsers(ctx.orgRole)

  const navSections = [
    {
      title: 'Personal',
      items: [{ label: 'Profile', href: '/settings/profile' }],
    },
    {
      title: 'Financial',
      items: [
        { label: 'Budget Targets', href: '/settings/budget-targets' },
        ...(isLeadership
          ? [
              { label: 'Supply Pricing', href: '/settings/budget-presets/supply' },
              { label: 'Shipping Pricing', href: '/settings/budget-presets/shipping' },
              { label: 'Expedited Pricing', href: '/settings/budget-presets/expedited' },
            ]
          : []),
      ],
    },
    {
      title: 'Organization',
      items: [
        { label: 'Overview', href: '/settings' },
        ...(canManageUsersHere
          ? [
              { label: 'Users & Roles', href: '/settings/users' },
              { label: 'Issues Inbox', href: '/settings/issues' },
            ]
          : []),
      ],
    },
  ]

  return (
    <div className="grid gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="rounded-[28px] border border-white/10 bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
        <div className="border-b border-white/10 pb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
            Settings
          </p>
          <h1 className="mt-2 text-xl font-semibold tracking-tight text-white">
            Workspace Settings
          </h1>
        </div>

        <nav className="mt-4 space-y-6">
          {navSections.map((section) => (
            <div key={section.title}>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                {section.title}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="block rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">{children}</div>
    </div>
  )
}