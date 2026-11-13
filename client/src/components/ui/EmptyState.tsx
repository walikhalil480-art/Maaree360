import { type ReactNode, type FC } from 'react'
import { Inbox } from 'lucide-react'

export interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description: string
  action?: ReactNode
  moduleScope?: string
  className?: string
}

export const EmptyState: FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  moduleScope,
  className = '',
}) => {
  return (
    <div
      className={`flex flex-col items-center justify-center text-center p-8 sm:p-12 border border-dashed border-slate-200/90 rounded-2xl bg-white/60 ${className}`}
    >
      <div className="w-12 h-12 rounded-xl bg-slate-50 border border-slate-200/80 shadow-2xs flex items-center justify-center text-slate-500 mb-3.5">
        {icon || <Inbox className="w-5 h-5 text-slate-400" />}
      </div>
      <h3 className="text-sm sm:text-base font-semibold text-[#0F172A] tracking-tight m-0">{title}</h3>
      <p className="text-xs sm:text-sm text-slate-500 max-w-sm mt-1.5 mb-0 leading-relaxed">
        {description}
      </p>

      {moduleScope && (
        <span className="mt-2.5 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-[#059669] border border-emerald-200">
          {moduleScope}
        </span>
      )}

      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
