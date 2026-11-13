import React, { type ReactNode } from 'react'
import { Button } from './Button'
import { AlertTriangle } from 'lucide-react'

export interface ConfirmationDialogProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'primary'
  icon?: ReactNode
  isLoading?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export const ConfirmationDialog: React.FC<ConfirmationDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  variant = 'primary',
  icon,
  isLoading = false,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={onCancel}
      />

      <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
        <div className="relative transform overflow-hidden rounded-2xl bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md border border-slate-200 p-6">
          <div className="sm:flex sm:items-start gap-4">
            <div
              className={`mx-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full sm:mx-0 ${
                variant === 'danger' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'
              }`}
            >
              {icon || <AlertTriangle className="w-5 h-5" />}
            </div>
            <div className="mt-3 text-center sm:mt-0 sm:text-left">
              <h3 className="text-base font-semibold leading-6 text-slate-900 m-0">{title}</h3>
              <p className="mt-2 text-sm text-slate-500 m-0 leading-relaxed">{message}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3">
            <Button variant="outline" size="sm" onClick={onCancel} disabled={isLoading}>
              {cancelText}
            </Button>
            <Button
              variant={variant === 'danger' ? 'danger' : 'primary'}
              size="sm"
              isLoading={isLoading}
              onClick={onConfirm}
            >
              {confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
