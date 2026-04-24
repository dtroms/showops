import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function PlatformAdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('platform_role, full_name, email')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (profile?.platform_role !== 'platform_admin') {
    redirect('/dashboard')
  }

  const navLinkClass =
    'rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900'

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="min-w-0">
            <p className="text-lg font-semibold tracking-tight">ShowOps Platform Admin</p>
            <p className="truncate text-sm text-slate-500">
              {profile?.full_name || profile?.email || user.email || 'Platform Admin'}
            </p>
          </div>

          <nav className="flex items-center gap-1">
            <Link href="/admin" className={navLinkClass}>
              Dashboard
            </Link>

            <Link href="/admin/organizations" className={navLinkClass}>
              Organizations
            </Link>

            <Link href="/dashboard" className={navLinkClass}>
              Customer App
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">{children}</main>
    </div>
  )
}