import React from 'react'

export interface TabItem {
  id: string
  label: string
  badge?: string | number
  icon?: React.ComponentType<{ className?: string }>
}

export interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  variant?: 'pills' | 'underline'
  className?: string
}

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onChange,
  variant = 'pills',
  className = '',
}) => {
  if (variant === 'underline') {
    return (
      <div className={`border-b border-slate-200 ${className}`}>
        <nav className="flex space-x-6 overflow-x-auto scrollbar-none" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = tab.id === activeTab

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChange(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-colors flex items-center gap-2 select-none ${
                  isActive
                    ? 'border-[#059669] text-[#059669] font-semibold'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                {Icon && <Icon className={`w-4 h-4 ${isActive ? 'text-[#059669]' : 'text-slate-400'}`} />}
                <span>{tab.label}</span>
                {tab.badge !== undefined && (
                  <span
                    className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>
    )
  }

  return (
    <div className={`inline-flex p-1 bg-slate-100 border border-slate-200/80 rounded-xl ${className}`}>
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = tab.id === activeTab

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 select-none ${
              isActive
                ? 'bg-white text-[#0F172A] font-semibold shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
            }`}
          >
            {Icon && <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#059669]' : 'text-slate-400'}`} />}
            <span>{tab.label}</span>
            {tab.badge !== undefined && (
              <span
                className={`ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                  isActive ? 'bg-emerald-50 text-[#059669] border border-emerald-200' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {tab.badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
