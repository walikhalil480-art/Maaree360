import React, { type ReactNode } from 'react'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardContent } from '../components/ui/Card'
import { EmptyState } from '../components/ui/EmptyState'

export interface ModulePlaceholderProps {
  title: string
  description: string
  icon: ReactNode
  scopeTitle: string
  features: string[]
  upcomingInstallment: string
}

export const ModulePlaceholder: React.FC<ModulePlaceholderProps> = ({
  title,
  description,
  icon,
  scopeTitle,
  features,
  upcomingInstallment,
}) => {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: title }]}
      />

      <Card>
        <CardContent className="p-8 sm:p-12">
          <EmptyState
            icon={icon}
            title={`${title} Module`}
            description={description}
            moduleScope={upcomingInstallment}
            className="border-0 bg-transparent p-0"
          />

          <div className="mt-8 max-w-lg mx-auto bg-slate-50 border border-slate-200/80 rounded-xl p-5 text-left">
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Planned Scope ({scopeTitle})
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 m-0 pl-4 list-disc">
              {features.map((feature, i) => (
                <li key={i}>{feature}</li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
