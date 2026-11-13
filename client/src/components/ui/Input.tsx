import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes, type TextareaHTMLAttributes, type ReactNode } from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  helperText?: string
  error?: string
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, helperText, error, leftIcon, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-medium text-slate-700 mb-1.5 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-slate-400 pointer-events-none flex items-center justify-center">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`w-full rounded-lg border bg-white text-[#0F172A] placeholder:text-slate-400 text-xs sm:text-sm py-2 shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#059669]/15 focus:border-[#059669] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
              leftIcon ? 'pl-9' : 'pl-3'
            } ${rightIcon ? 'pr-9' : 'pr-3'} ${
              error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300'
            } ${props.type === 'number' ? 'font-tabular' : ''} ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute right-3 text-slate-400 flex items-center justify-center">
              {rightIcon}
            </div>
          )}
        </div>
        {error ? (
          <p className="mt-1 text-[11px] text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Input.displayName = 'Input'

export interface SearchInputProps extends Omit<InputProps, 'leftIcon' | 'rightIcon'> {
  onClear?: () => void
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, className = '', placeholder = 'Search...', ...props }, ref) => {
    return (
      <Input
        ref={ref}
        value={value}
        placeholder={placeholder}
        leftIcon={<Search className="w-4 h-4 text-slate-400" />}
        rightIcon={
          value && onClear ? (
            <button
              type="button"
              onClick={onClear}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded focus:outline-none"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          ) : undefined
        }
        className={className}
        {...props}
      />
    )
  }
)

SearchInput.displayName = 'SearchInput'

export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  helperText?: string
  error?: string
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, helperText, error, children, className = '', id, ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-slate-700 mb-1.5 select-none">
            {label}
          </label>
        )}
        <div className="relative flex items-center">
          <select
            ref={ref}
            id={selectId}
            className={`w-full rounded-lg border bg-white text-[#0F172A] text-xs sm:text-sm py-2 pl-3 pr-8 shadow-2xs appearance-none transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#059669]/15 focus:border-[#059669] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
              error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300'
            } ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-2.5 pointer-events-none text-slate-400">
            <ChevronDown className="w-4 h-4" />
          </div>
        </div>
        {error ? (
          <p className="mt-1 text-[11px] text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Select.displayName = 'Select'

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  helperText?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, helperText, error, className = '', id, ...props }, ref) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={textareaId} className="block text-xs font-medium text-slate-700 mb-1.5 select-none">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`w-full rounded-lg border bg-white text-[#0F172A] placeholder:text-slate-400 text-xs sm:text-sm p-3 shadow-2xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-[#059669]/15 focus:border-[#059669] disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed ${
            error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-500/20' : 'border-slate-200 hover:border-slate-300'
          } ${className}`}
          {...props}
        />
        {error ? (
          <p className="mt-1 text-[11px] text-rose-600 font-medium">{error}</p>
        ) : helperText ? (
          <p className="mt-1 text-[11px] text-slate-500">{helperText}</p>
        ) : null}
      </div>
    )
  }
)

Textarea.displayName = 'Textarea'
