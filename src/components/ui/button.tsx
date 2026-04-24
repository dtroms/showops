import * as React from 'react'

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive'
type ButtonSize = 'sm' | 'md' | 'lg'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant
  size?: ButtonSize
  asChild?: boolean
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ')
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-white text-slate-950 hover:bg-slate-100 border border-white',
  secondary:
    'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border border-white/10',
  ghost:
    'bg-transparent text-slate-300 hover:bg-white/5 hover:text-white border border-transparent',
  destructive:
    'bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-500/20',
}

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-xl px-3 text-sm',
  md: 'h-10 rounded-2xl px-4 text-sm',
  lg: 'h-11 rounded-2xl px-5 text-sm',
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = 'primary',
      size = 'md',
      type = 'button',
      disabled,
      ...props
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled}
        className={cn(
          'inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium transition outline-none',
          'focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-0',
          'disabled:cursor-not-allowed disabled:opacity-50',
          variantClasses[variant],
          sizeClasses[size],
          className
        )}
        {...props}
      />
    )
  }
)