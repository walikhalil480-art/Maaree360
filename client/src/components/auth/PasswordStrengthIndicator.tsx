import React from 'react'

interface PasswordStrengthIndicatorProps {
  password: string
}

export const PasswordStrengthIndicator: React.FC<PasswordStrengthIndicatorProps> = ({ password }) => {
  if (!password) return null

  // Calculate score (0 to 4)
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^a-zA-Z0-9]/.test(password)

  let score = 0
  if (hasMinLength) score += 1
  if (hasLetter) score += 1
  if (hasNumber) score += 1
  if (hasSpecial) score += 1

  const getLabelAndColor = () => {
    switch (score) {
      case 1:
        return { label: 'Weak', barColor: 'bg-rose-500', textColor: 'text-rose-600' }
      case 2:
        return { label: 'Fair', barColor: 'bg-amber-500', textColor: 'text-amber-600' }
      case 3:
        return { label: 'Good', barColor: 'bg-emerald-500', textColor: 'text-emerald-600' }
      case 4:
        return { label: 'Strong', barColor: 'bg-[#12A878]', textColor: 'text-[#12A878]' }
      default:
        return { label: 'Too short', barColor: 'bg-slate-200', textColor: 'text-slate-400' }
    }
  }

  const { label, barColor, textColor } = getLabelAndColor()

  return (
    <div className="space-y-1.5 pt-0.5 animate-fadeIn">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-slate-500 font-medium">Password strength</span>
        <span className={`font-semibold ${textColor}`}>{label}</span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 h-1.5 w-full">
        {[1, 2, 3, 4].map((step) => (
          <div
            key={step}
            className={`h-full rounded-full transition-all duration-200 ${
              score >= step ? barColor : 'bg-slate-200'
            }`}
          />
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-500 pt-0.5">
        <span className={hasMinLength ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
          {hasMinLength ? '✓' : '•'} 8+ characters
        </span>
        <span className={hasLetter ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
          {hasLetter ? '✓' : '•'} Letters
        </span>
        <span className={hasNumber ? 'text-emerald-700 font-medium' : 'text-slate-400'}>
          {hasNumber ? '✓' : '•'} Numbers
        </span>
      </div>
    </div>
  )
}
export default PasswordStrengthIndicator
