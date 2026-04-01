import Link from 'next/link'
import { logOut } from '@/app/actions/auth'

export function AppShell({
  user,
  organization,
  children,
}: {
  user: {
    id: string
    fullName: string | null
    role: string
  }
  organization: {
    id: string
    name: string
    subscriptionStatus: string
    trialEndsAt: string | null
  }
  children: React.ReactNode
}) {
  const navLinkClass =
    'rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">ShowOps</p>
            <p className="truncate text-sm text-slate-500">{organization.name}</p>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/dashboard" className={navLinkClass}>
              Dashboard
            </Link>

            <Link href="/shows" className={navLinkClass}>
              Shows
            </Link>

            <div className="group relative">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
              >
                Vendors
              </button>

              <div className="invisible absolute left-0 top-full z-50 mt-2 w-52 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100">
                <Link
                  href="/vendors/freelance?new=1"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Add Vendor
                </Link>

                <Link
                  href="/vendors/freelance"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Freelance Partners
                </Link>

                <Link
                  href="/vendors/business"
                  className="block rounded-lg px-3 py-2 text-sm text-slate-700 transition hover:bg-slate-100"
                >
                  Vendor Partners
                </Link>
              </div>
            </div>

            <Link href="/supplies" className={navLinkClass}>
              Supplies
            </Link>

            <Link href="/gear" className={navLinkClass}>
              Gear
            </Link>

            <form action={logOut} className="ml-2">
              <button className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100">
                Log out
              </button>
            </form>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}