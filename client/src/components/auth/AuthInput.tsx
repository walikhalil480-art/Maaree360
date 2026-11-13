import React, { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

export interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  error?: string | null
  icon?: React.ComponentType<{ className?: string }>
  isPassword?: boolean
  hint?: string
  actionLink?: React.ReactNode
}

export const AuthInput: React.FC<AuthInputProps> = ({
  id,
  label,
  error,
  icon: Icon,
  isPassword = false,
  hint,
  actionLink,
  type = 'text',
  className = '',
  disabled,
  ...props
}) => {
  const [showPassword, setShowPassword] = useState(false)
  const inputType = isPassword ? (showPassword ? 'text' : 'password') : type

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className="block text-xs font-semibold text-[#172033] tracking-tight"
        >
          {label}
        </label>
        {actionLink && <div className="text-xs">{actionLink}</div>}
      </div>

      <div className="relative rounded-xl shadow-2xs group">
        {Icon && (
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-[#12A878] transition-colors">
            <Icon className="w-4 h-4" />
          </div>
        )}

        <input
          id={id}
          type={inputType}
          disabled={disabled}
          className={`w-full block bg-white text-sm text-[#172033] placeholder:text-slate-400 rounded-xl border transition-all duration-150 outline-none ${
            Icon ? 'pl-10' : 'pl-3.5'
          } ${
            isPassword ? 'pr-11' : 'pr-3.5'
          } py-2.5 ${
            error
              ? 'border-rose-300 focus:border-rose-500 focus:ring-3 focus:ring-rose-500/15'
              : 'border-[#E2E8F0] hover:border-slate-300 focus:border-[#12A878] focus:ring-3 focus:ring-[#12A878]/15'
          } ${disabled ? 'opacity-60 bg-slate-50 cursor-not-allowed' : ''} ${className}`}
          {...props}
        />

        {isPassword && (
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            disabled={disabled}
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-[#172033] transition-colors focus:outline-none"
          >
            {showPassword ? (
              <EyeOff className="w-4 h-4 stroke-[1.8]" />
            ) : (
              <Eye className="w-4 h-4 stroke-[1.8]" />
            )}
          </button>
        )}
      </div>

      {hint && !error && (
        <p className="text-[11px] text-slate-500 m-0">{hint}</p>
      )}

      {error && (
        <p className="text-[11px] font-medium text-rose-600 flex items-center gap-1 m-0 animate-fadeIn">
          <span>&bull;</span>
          <span>{error}</span>
        </p>
      )}
    </div>
  )
}
export default AuthInput
