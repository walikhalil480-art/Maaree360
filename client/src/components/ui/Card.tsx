import { type ReactNode, type HTMLAttributes, type FC } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
  interactive?: boolean
}

export const Card: FC<CardProps> = ({
  children,
  className = '',
  interactive = false,
  ...props
}) => {
  return (
    <div
      className={`bg-white border border-[#E8ECF1] rounded-xl shadow-[0_1px_2px_rgba(16,26,45,0.03)] overflow-hidden transition-all duration-150 ${
        interactive
          ? 'hover:border-slate-300 hover:shadow-xs cursor-pointer active:scale-[0.995]'
          : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  badge?: ReactNode
  className?: string
}

export const CardHeader: FC<CardHeaderProps> = ({
  title,
  subtitle,
  action,
  badge,
  className = '',
}) => {
  return (
    <div
      className={`px-4 sm:px-5 py-3.5 border-b border-[#F1F3F6] flex items-center justify-between gap-3 ${className}`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-[#172033] tracking-tight truncate">{title}</h3>
          {badge}
        </div>
        {subtitle && <p className="text-xs text-[#697586] mt-0.5 truncate">{subtitle}</p>}
      </div>
      {action && <div className="flex items-center gap-2 shrink-0">{action}</div>}
    </div>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  className?: string
}

export const CardContent: FC<CardContentProps> = ({
  children,
  className = '',
  ...props
}) => {
  return (
    <div className={`p-4 sm:p-5 ${className}`} {...props}>
      {children}
    </div>
  )
}

export interface CardFooterProps {
  children: ReactNode
  className?: string
}

export const CardFooter: FC<CardFooterProps> = ({ children, className = '' }) => {
  return (
    <div
      className={`px-4 sm:px-5 py-3 bg-[#FAFBFD] border-t border-[#F1F3F6] text-xs text-[#697586] flex items-center justify-between ${className}`}
    >
      {children}
    </div>
  )
}
