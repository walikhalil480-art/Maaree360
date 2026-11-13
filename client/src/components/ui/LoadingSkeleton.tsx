import React from 'react'

export interface SkeletonProps {
  className?: string
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => {
  return <div className={`animate-pulse bg-slate-200 rounded ${className}`} />
}

export const MetricCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <Skeleton className="w-24 h-3.5" />
          <Skeleton className="w-32 h-7" />
        </div>
        <Skeleton className="w-10 h-10 rounded-xl" />
      </div>
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
        <Skeleton className="w-28 h-3" />
        <Skeleton className="w-16 h-4 rounded-full" />
      </div>
    </div>
  )
}

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 4 }) => {
  return (
    <tr className="border-b border-slate-100 animate-pulse">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </tr>
  )
}
