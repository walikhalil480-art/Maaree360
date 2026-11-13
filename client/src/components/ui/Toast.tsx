import React, { useEffect } from 'react'
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react'

export interface ToastProps {
  id?: string
  message: string
  type?: 'success' | 'error' | 'info'
  duration?: number
  onClose: () => void
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 4000,
  onClose,
}) => {
  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(onClose, duration)
      return () => clearTimeout(timer)
    }
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle className="w-4 h-4 text-emerald-600" />,
    error: <AlertCircle className="w-4 h-4 text-red-600" />,
    info: <Info className="w-4 h-4 text-blue-600" />,
  }

  const borderStyles = {
    success: 'border-emerald-200 bg-white text-slate-800',
    error: 'border-red-200 bg-white text-slate-800',
    info: 'border-blue-200 bg-white text-slate-800',
  }[type]

  return (
    <div
      role="alert"
      className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-lg transition-all animate-in fade-in slide-in-from-bottom-2 duration-200 max-w-sm ${borderStyles}`}
    >
      {icons[type]}
      <span className="text-sm font-medium flex-1">{message}</span>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-slate-600 p-0.5 rounded focus:outline-none"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
