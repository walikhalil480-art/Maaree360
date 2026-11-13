import { useEffect, type ReactNode, type FC } from 'react'
import { X } from 'lucide-react'

export interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  description?: string
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  children: ReactNode
}

export const Modal: FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  size = 'md',
  children,
}) => {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    '2xl': 'max-w-5xl',
  }[size]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
        onClick={onClose}
      />

      {/* Center Dialog */}
      <div className="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div
          className={`relative w-full ${sizeClasses} transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-slate-200/90 animate-in fade-in zoom-in-95 duration-150`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 sm:px-6 py-4 bg-slate-50/60">
            <div className="min-w-0 pr-4">
              <h2 className="text-base sm:text-lg font-semibold text-slate-900 m-0 truncate">
                {title}
              </h2>
              {description && (
                <p className="text-xs text-slate-500 m-0 mt-0.5 truncate">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors shrink-0"
              title="Close modal (Esc)"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Body */}
          <div className="p-5 sm:p-6 max-h-[calc(90vh-8rem)] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default Modal
