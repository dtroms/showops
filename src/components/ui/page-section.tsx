import * as React from 'react'

type PageSectionProps = {
  title?: string
  description?: string
  actions?: React.ReactNode
  children: React.ReactNode
  className?: string
  contentClassName?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PageSectionProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-white/10 bg-white/[0.03] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)]',
        className
      )}
    >
      {title || description || actions ? (
        <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            {title ? (
              <h2 className="text-lg font-semibold tracking-tight text-white">
                {title}
              </h2>
            ) : null}
            {description ? <div className="sr-only">{description}</div> : null}
          </div>

          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}

      <div className={contentClassName}>{children}</div>
    </section>
  )
}