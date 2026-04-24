import * as React from 'react'

type MetricRowProps = {
  children: React.ReactNode
  columns?: 3 | 4 | 5 | 6
  className?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const columnClasses: Record<NonNullable<MetricRowProps['columns']>, string> = {
  3: 'md:grid-cols-2 xl:grid-cols-3',
  4: 'md:grid-cols-2 xl:grid-cols-4',
  5: 'md:grid-cols-2 xl:grid-cols-5',
  6: 'md:grid-cols-2 xl:grid-cols-6',
}

export function MetricRow({
  children,
  columns = 4,
  className,
}: MetricRowProps) {
  return (
    <div className={cn('grid gap-4', columnClasses[columns], className)}>
      {children}
    </div>
  )
}