import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger' | 'subtle' | 'navy'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  isLoading?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
  shortcut?: string
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      leftIcon,
      rightIcon,
      shortcut,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#059669] focus-visible:ring-offset-1 disabled:opacity-50 disabled:pointer-events-none select-none active:scale-[0.98]'

    const variantStyles = {
      primary:
        'bg-[#059669] hover:bg-[#047857] text-white shadow-xs border border-[#047857] active:bg-[#065F46]',
      secondary:
        'bg-slate-100 hover:bg-slate-200 text-[#0F172A] border border-[#E2E8F0] active:bg-slate-200/80',
      outline:
        'bg-white hover:bg-slate-50 text-[#0F172A] border border-[#E2E8F0] shadow-2xs hover:border-slate-300 active:bg-slate-100',
      ghost:
        'bg-transparent hover:bg-slate-100 text-[#64748B] hover:text-[#0F172A] active:bg-slate-200/60',
      danger:
        'bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-xs border border-[#B91C1C] active:bg-[#991B1B]',
      subtle:
        'bg-emerald-50 hover:bg-emerald-100 text-[#059669] border border-emerald-200/70 active:bg-emerald-200/60 font-semibold',
      navy:
        'bg-[#0F172A] hover:bg-[#1E293B] text-white shadow-xs border border-[#0F172A] active:bg-[#090E17]',
    }[variant]

    const sizeStyles = {
      xs: 'px-2 py-1 text-[11px] gap-1 font-medium rounded-md',
      sm: 'px-2.5 py-1.5 text-xs gap-1.5 rounded-lg',
      md: 'px-3.5 py-2 text-xs sm:text-sm gap-2 rounded-lg',
      lg: 'px-4 py-2.5 text-sm sm:text-base gap-2.5 rounded-xl',
    }[size]

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading && (
          <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin shrink-0" />
        )}
        {!isLoading && leftIcon && <span className="shrink-0">{leftIcon}</span>}
        {children && <span>{children}</span>}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
        {shortcut && (
          <kbd className="ml-1 px-1.5 py-0.5 text-[10px] font-mono rounded bg-black/10 border border-black/10 text-current opacity-80">
            {shortcut}
          </kbd>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'
