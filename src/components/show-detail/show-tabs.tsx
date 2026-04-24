'use client'

import Link from 'next/link'
import { useSelectedLayoutSegment } from 'next/navigation'

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const TAB_ITEMS = [
  { label: 'Overview', href: 'show-details', segment: 'show-details' },
  { label: 'Budget', href: 'budget-sheet', segment: 'budget-sheet' },
  { label: 'Summary', href: 'budget-summary', segment: 'budget-summary' },
  { label: 'Team', href: 'team', segment: 'team' },
  { label: 'Vendors', href: 'vendors', segment: 'vendors' },
  { label: 'Travel', href: 'travel', segment: 'travel' },
  { label: 'Notes', href: 'notes', segment: 'notes' },
]

export function ShowTabs({ showId }: { showId: string }) {
  const segment = useSelectedLayoutSegment()

  return (
    <div className="overflow-x-auto rounded-[24px] border border-white/10 bg-white/[0.03] shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]">
      <div className="flex min-w-max items-center gap-2 p-2">
        {TAB_ITEMS.map((item) => {
          const active =
            segment === item.segment || (!segment && item.segment === 'show-details')

          return (
            <Link
              key={item.segment}
              href={`/shows/${showId}/${item.href}`}
              className={cn(
                'rounded-2xl px-4 py-2 text-sm font-medium transition',
                active
                  ? 'bg-white text-slate-950'
                  : 'border border-transparent bg-transparent text-slate-300 hover:bg-white/5 hover:text-white'
              )}
            >
              {item.label}
            </Link>
          )
        })}
      </div>
    </div>
  )
}