import * as React from 'react'

type EmptyStateProps = {
  title: string
  description: string
  action?: React.ReactNode
  className?: string
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'rounded-[24px] border border-dashed border-white/10 bg-white/[0.02] p-8 text-center',
        className
      )}
    >
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm text-slate-500">{description}</p>
      {action ? <div className="mt-4 flex justify-center">{action}</div> : null}
    </div>
  )
}
