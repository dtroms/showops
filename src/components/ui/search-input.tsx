'use client'

import * as React from 'react'

type SearchInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'type'
> & {
  value: string
  onChange: (value: string) => void
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

export function SearchInput({
  value,
  onChange,
  className,
  placeholder = 'Search...',
  ...props
}: SearchInputProps) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white',
        'placeholder:text-slate-500',
        'focus:border-white/20 focus:outline-none focus:ring-2 focus:ring-white/10',
        className
      )}
      {...props}
    />
  )
}