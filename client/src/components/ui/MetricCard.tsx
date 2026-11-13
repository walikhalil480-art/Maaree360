import { type ReactNode, type FC } from 'react'
import { Card } from './Card'
import { Badge } from './Badge'
import { ArrowUpRight, ArrowDownRight } from 'lucide-react'

export interface MetricCardProps {
  title: string
  value: string | number
  icon: ReactNode
  subtitle?: string
  trend?: {
    value: string | number
    isPositive?: boolean
    label?: string
  }
  statusBadge?: {
    text: string
    variant?: 'success' | 'warning' | 'danger' | 'neutral' | 'info' | 'purple' | 'navy'
  }
  className?: string
  onClick?: () => void
}

export const MetricCard: FC<MetricCardProps> = ({
  title,
  value,
  icon,
  subtitle,
  trend,
  statusBadge,
  className = '',
  onClick,
}) => {
  const valueStr = String(value)
  // Dynamic font sizing to ensure long financial figures (e.g. KES 1,035,400.00) never truncate
  const valueSizeClass =
    valueStr.length > 17
      ? 'text-lg sm:text-xl'
      : valueStr.length > 12
      ? 'text-xl sm:text-[22px]'
      : 'text-2xl sm:text-[25px]'

  return (
    <Card
      onClick={onClick}
      className={`p-4 sm:p-5 flex flex-col justify-between border-[#E8ECF1] hover:border-slate-300 hover:shadow-xs transition-all duration-150 ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium text-[#697586] block">
            {title}
          </span>
          <div className="w-7 h-7 rounded-lg bg-[#F7F8FA] border border-[#E8ECF1] flex items-center justify-center text-[#697586] shrink-0 [&>svg]:w-3.5 [&>svg]:h-3.5">
            {icon}
          </div>
        </div>

        <div className="mt-0.5 flex items-baseline">
          <span
            className={`${valueSizeClass} font-semibold font-tabular text-[#172033] tracking-tight leading-none whitespace-nowrap`}
            title={valueStr}
          >
            {value}
          </span>
        </div>
      </div>

      {(subtitle || statusBadge || trend) && (
        <div className="mt-3.5 pt-2.5 border-t border-[#F1F3F6] flex items-center justify-between text-xs gap-2">
          {subtitle && <span className="text-[#697586] text-[11px] truncate">{subtitle}</span>}
          {trend && (
            <span
              className={`text-[11px] font-medium inline-flex items-center gap-0.5 ${
                trend.isPositive ? 'text-[#059669]' : 'text-[#DC2626]'
              }`}
            >
              {trend.isPositive ? (
                <ArrowUpRight className="w-3.5 h-3.5" />
              ) : (
                <ArrowDownRight className="w-3.5 h-3.5" />
              )}
              <span className="font-semibold">{trend.value}</span>
              {trend.label && <span className="text-slate-400 font-normal ml-0.5">{trend.label}</span>}
            </span>
          )}
          {statusBadge && (
            <Badge variant={statusBadge.variant || 'neutral'} size="xs">
              {statusBadge.text}
            </Badge>
          )}
        </div>
      )}
    </Card>
  )
}
