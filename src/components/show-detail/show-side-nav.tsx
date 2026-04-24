'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function ShowSideNav({ showId }: { showId: string }) {
  const pathname = usePathname()

  const links = [
    { href: `/shows/${showId}/show-details`, label: 'Overview' },
    { href: `/shows/${showId}/budget-summary`, label: 'Budget Summary' },
    { href: `/shows/${showId}/budget-sheet`, label: 'Budget Sheet' },
    { href: `/shows/${showId}/budget-comparison`, label: 'Budget Comparison' },
    { href: `/shows/${showId}/team`, label: 'Team' },
    { href: `/shows/${showId}/vendors`, label: 'Vendors' },
    { href: `/shows/${showId}/supplies`, label: 'Supplies' },
    { href: `/shows/${showId}/travel`, label: 'Travel' },
    { href: `/shows/${showId}/notes`, label: 'Notes' },
  ]

  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-3">
      <p className="mb-3 px-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        Show Navigation
      </p>

      <div className="grid gap-1.5 sm:grid-cols-2 xl:grid-cols-1">
        {links.map((link) => {
          const active = pathname === link.href

          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-2xl px-3 py-2.5 text-sm font-medium transition ${
                active
                  ? 'bg-white text-slate-950'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {link.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}