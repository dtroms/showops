import Link from 'next/link'

export function ShowSideNav({
  showId,
  compact = false,
}: {
  showId: string
  compact?: boolean
}) {
  const links = [
    { href: `/shows/${showId}/budget-summary`, label: 'Show Summary' },
    { href: `/shows/${showId}/budget-sheet`, label: 'Budget Sheet' },
    { href: `/shows/${showId}/show-details`, label: 'Show Details' },
    { href: `/shows/${showId}/vendors`, label: 'Freelance Labor' },
    { href: `/shows/${showId}/supplies`, label: 'Supplies' },
    { href: `/shows/${showId}/travel`, label: 'Travel' },
    { href: `/shows/${showId}/notes`, label: 'Notes' },
  ]

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm ${
        compact ? 'p-3' : 'p-4'
      }`}
    >
      <p
        className={`mb-3 font-semibold uppercase tracking-wide text-slate-500 ${
          compact ? 'text-[11px]' : 'text-xs'
        }`}
      >
        Show Navigation
      </p>

      <div className={compact ? 'space-y-1.5' : 'space-y-2'}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`block rounded-lg text-sm font-medium text-slate-700 transition hover:bg-slate-100 ${
              compact ? 'px-2.5 py-2' : 'px-3 py-2'
            }`}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  )
}