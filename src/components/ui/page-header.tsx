import * as React from 'react'

type PageHeaderProps = {
  title: string
  description?: string
  badges?: React.ReactNode
  actions?: React.ReactNode
  className?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PageHeader({
  title,
  description,
  badges,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        className
      )}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          {badges ? <div className="mb-3 flex flex-wrap gap-2">{badges}</div> : null}

          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h1>

          {description ? <div className="sr-only">{description}</div> : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </div>
  )
}