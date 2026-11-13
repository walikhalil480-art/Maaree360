import React from 'react'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

export interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  className?: string
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Unable to load data',
  message,
  onRetry,
  className = '',
}) => {
  return (
    <div
      className={`p-6 sm:p-8 rounded-xl border border-red-200 bg-red-50/50 flex flex-col items-center justify-center text-center ${className}`}
    >
      <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
        <AlertCircle className="w-5 h-5" />
      </div>
      <h3 className="text-sm font-semibold text-red-900 m-0">{title}</h3>
      <p className="text-xs sm:text-sm text-red-700 max-w-md mt-1 mb-0">{message}</p>
      {onRetry && (
        <Button
          variant="outline"
          size="sm"
          onClick={onRetry}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="mt-4 border-red-300 text-red-800 hover:bg-red-100"
        >
          Try Again
        </Button>
      )}
    </div>
  )
}
