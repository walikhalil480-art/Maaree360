import { type ReactNode, type FC, Fragment } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'

export interface PageHeaderProps {
  title: string
  description?: string
  badge?: ReactNode
  actions?: ReactNode
  breadcrumbs?: Array<{ label: string; href?: string }>
  className?: string
}

export const PageHeader: FC<PageHeaderProps> = ({
  title,
  description,
  badge,
  actions,
  breadcrumbs,
  className = '',
}) => {
  return (
    <div className={`mb-6 ${className}`}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav className="flex items-center space-x-1.5 text-xs text-slate-400 mb-2">
          {breadcrumbs.map((item, index) => (
            <Fragment key={index}>
              {index > 0 && <ChevronRight className="w-3 h-3 text-slate-300 shrink-0" />}
              {item.href ? (
                <Link to={item.href} className="hover:text-slate-800 transition font-medium">
                  {item.label}
                </Link>
              ) : (
                <span className="text-slate-600 font-medium">{item.label}</span>
              )}
            </Fragment>
          ))}
        </nav>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#0F172A] m-0">
              {title}
            </h1>
            {badge}
          </div>
          {description && (
            <p className="text-xs sm:text-sm text-slate-500 mt-1 m-0 max-w-3xl leading-relaxed">
              {description}
            </p>
          )}
        </div>

        {actions && <div className="flex items-center gap-2.5 flex-wrap shrink-0">{actions}</div>}
      </div>
    </div>
  )
}
