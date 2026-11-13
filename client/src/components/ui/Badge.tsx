import { type ReactNode, type FC } from 'react'

export interface BadgeProps {
  children: ReactNode
  variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'navy'
  size?: 'xs' | 'sm' | 'md'
  shape?: 'pill' | 'rounded'
  dot?: boolean
  pulse?: boolean
  className?: string
}

export const Badge: FC<BadgeProps> = ({
  children,
  variant = 'neutral',
  size = 'md',
  shape = 'pill',
  dot = false,
  pulse = false,
  className = '',
}) => {
  const variantStyles = {
    success: 'bg-emerald-50 text-[#047857] border-emerald-200/80 font-medium',
    warning: 'bg-amber-50 text-[#B45309] border-amber-200/80 font-medium',
    danger: 'bg-rose-50 text-[#BE123C] border-rose-200/80 font-medium',
    neutral: 'bg-slate-100 text-slate-700 border-slate-200/90 font-medium',
    info: 'bg-sky-50 text-[#0369A1] border-sky-200/80 font-medium',
    purple: 'bg-indigo-50 text-indigo-700 border-indigo-200/80 font-medium',
    navy: 'bg-[#0F172A]/5 text-[#0F172A] border-[#0F172A]/15 font-semibold',
  }[variant]

  const dotStyles = {
    success: 'bg-[#059669]',
    warning: 'bg-[#D97706]',
    danger: 'bg-[#E11D48]',
    neutral: 'bg-[#64748B]',
    info: 'bg-[#0284C7]',
    purple: 'bg-[#6366F1]',
    navy: 'bg-[#0F172A]',
  }[variant]

  const sizeStyles = {
    xs: 'text-[10px] px-1.5 py-0.5 leading-none font-medium',
    sm: 'text-[11px] px-2 py-0.5 leading-tight font-medium',
    md: 'text-xs px-2.5 py-0.5 leading-normal font-medium',
  }[size]

  const shapeStyles = shape === 'pill' ? 'rounded-full' : 'rounded-md'

  return (
    <span
      className={`inline-flex items-center gap-1.5 border ${shapeStyles} ${variantStyles} ${sizeStyles} ${className} whitespace-nowrap select-none`}
    >
      {dot && (
        <span className="relative flex h-1.5 w-1.5 shrink-0">
          {pulse && (
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotStyles}`}
            />
          )}
          <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${dotStyles}`} />
        </span>
      )}
      {children}
    </span>
  )
}
