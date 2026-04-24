'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { ReactNode } from 'react'
import { logOut } from '@/app/actions/auth'
import { IssueReportButton } from '@/components/issue-report-button'
import {
  canManageUsers,
  canViewOrgAudit,
  canViewOrgFinancials,
} from '@/lib/permissions'

type AppShellProps = {
  children: ReactNode
  user: {
    id: string
    role: string
    fullName?: string | null
    full_name?: string | null
    email?: string | null
  }
  organization?: {
    id: string
    name: string
    subscriptionStatus?: string | null
    trialEndsAt?: string | null
  }
  canViewAuditLog?: boolean
  supportMode?: {
    active: boolean
    organizationName: string
  }
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function AppShell({
  children,
  user,
  organization,
  canViewAuditLog,
  supportMode,
}: AppShellProps) {
  const pathname = usePathname()

  const resolvedName = user.fullName ?? user.full_name ?? user.email ?? 'User'
  const canManageUsersHere = canManageUsers(user.role as any)
  const canViewAuditHere =
    typeof canViewAuditLog === 'boolean'
      ? canViewAuditLog
      : canViewOrgAudit(user.role as any)
  const canViewFinancialsHere = canViewOrgFinancials(user.role as any)

  const navLinkClass = (href: string) =>
    cn(
      'rounded-xl px-3 py-2 text-sm font-medium transition',
      pathname === href || pathname.startsWith(`${href}/`)
        ? 'bg-white text-slate-950'
        : 'text-slate-300 hover:bg-white/5 hover:text-white'
    )

  const dropdownButtonClass =
    'rounded-xl px-3 py-2 text-sm font-medium text-slate-300 transition hover:bg-white/5 hover:text-white'

  const dropdownLinkClass =
    'block rounded-lg px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white'

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="sticky top-0 z-40 border-b border-white/10 bg-slate-950/85 backdrop-blur-xl">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <Link
                href="/dashboard"
                className="text-lg font-semibold tracking-tight text-white"
              >
                ShowOps
              </Link>
              {organization?.name ? (
                <span className="text-xs text-slate-500">{organization.name}</span>
              ) : null}
            </div>

            <nav className="flex items-center gap-2">
              <Link href="/dashboard" className={navLinkClass('/dashboard')}>
                Dashboard
              </Link>

              <Link href="/shows" className={navLinkClass('/shows')}>
                Shows
              </Link>

              <Link href="/venues" className={navLinkClass('/venues')}>
                Venues
              </Link>

              <Link href="/gear" className={navLinkClass('/gear')}>
                Gear
              </Link>

              <Link href="/vendors" className={navLinkClass('/vendors')}>
                Vendors
              </Link>

              {canViewFinancialsHere ? (
                <div className="group relative">
                  <button type="button" className={dropdownButtonClass}>
                    Reports
                  </button>

                  <div className="invisible absolute left-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                    <Link href="/reports" className={dropdownLinkClass}>
                      Reports
                    </Link>

                    {canViewAuditHere ? (
                      <>
                        <div className="my-2 h-px bg-white/10" />
                        <Link href="/audit" className={dropdownLinkClass}>
                          Audit Log
                        </Link>
                      </>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <div className="group relative">
                <button type="button" className={dropdownButtonClass}>
                  Settings
                </button>

                <div className="invisible absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl border border-white/10 bg-slate-900 p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                  <Link href="/settings" className={dropdownLinkClass}>
                    Settings Home
                  </Link>

                  <div className="my-2 h-px bg-white/10" />

                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Personal
                  </div>

                  <Link href="/settings/profile" className={dropdownLinkClass}>
                    Profile
                  </Link>

                  <div className="my-2 h-px bg-white/10" />

                  <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Financial
                  </div>

                  <Link href="/settings/budget-targets" className={dropdownLinkClass}>
                    Budget Targets
                  </Link>

                  {canManageUsersHere ? (
                    <>
                      <Link
                        href="/settings/budget-presets/supply"
                        className={dropdownLinkClass}
                      >
                        Supply Pricing
                      </Link>

                      <Link
                        href="/settings/budget-presets/shipping"
                        className={dropdownLinkClass}
                      >
                        Shipping Pricing
                      </Link>

                      <Link
                        href="/settings/budget-presets/expedited"
                        className={dropdownLinkClass}
                      >
                        Expedited Pricing
                      </Link>
                    </>
                  ) : null}

                  {canManageUsersHere ? (
                    <>
                      <div className="my-2 h-px bg-white/10" />

                      <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
                        Organization
                      </div>

                      <Link href="/settings/users" className={dropdownLinkClass}>
                        Users & Roles
                      </Link>

                      <Link href="/settings/issues" className={dropdownLinkClass}>
                        Issues Inbox
                      </Link>
                    </>
                  ) : null}
                </div>
              </div>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {supportMode?.active ? (
              <div className="rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-300">
                Support Mode · {supportMode.organizationName}
              </div>
            ) : null}

            <div className="group relative">
              <button
                type="button"
                className="rounded-xl px-3 py-2 text-sm text-slate-300 transition hover:bg-white/5 hover:text-white"
              >
                {resolvedName}
              </button>

              <div className="invisible absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-slate-900 p-2 opacity-0 shadow-2xl transition-all group-hover:visible group-hover:opacity-100">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium text-white">{resolvedName}</p>
                  <p className="mt-1 text-xs text-slate-500">{user.email ?? ''}</p>
                </div>

                <div className="my-2 h-px bg-white/10" />

                <Link href="/settings/profile" className={dropdownLinkClass}>
                  My Profile
                </Link>

                <form action={logOut}>
                  <button
                    type="submit"
                    className="block w-full rounded-lg px-3 py-2 text-left text-sm text-rose-300 transition hover:bg-rose-500/10"
                  >
                    Log Out
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1600px] px-6 py-6">{children}</main>

      <IssueReportButton />
    </div>
  )
}