import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthInput } from '../components/auth/AuthInput'
import { PasswordStrengthIndicator } from '../components/auth/PasswordStrengthIndicator'
import {
  User,
  Building2,
  Mail,
  Lock,
  Phone,
  ArrowRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
} from 'lucide-react'

export default function RegisterPage() {
  const [name, setName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  const { register, createBusiness } = useAuth()
  const navigate = useNavigate()

  // Password requirement validation checks
  const hasMinLength = password.length >= 8
  const hasLetter = /[a-zA-Z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const passwordsMatch = password && confirmPassword ? password === confirmPassword : true

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!name.trim()) {
      setLocalError('Please enter your full name.')
      return
    }

    if (!email.trim()) {
      setLocalError('Please enter your business email.')
      return
    }

    if (!hasMinLength || !hasLetter || !hasNumber) {
      setLocalError('Password must be at least 8 characters and contain at least one letter and one number.')
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please verify your confirmation password.')
      return
    }

    if (!agreeTerms) {
      setLocalError('Please accept the Terms of Service to create your business account.')
      return
    }

    try {
      setIsSubmitting(true)

      // 1. Register user and establish session
      await register(name.trim(), email.trim(), password)

      // 2. If business name is provided, automatically initialize the merchant store
      if (businessName.trim()) {
        try {
          await createBusiness(businessName.trim(), 'KES', 'Africa/Nairobi')
        } catch (bizErr) {
          // If business creation fails or requires manual step, redirect to setup
          console.warn('Auto business setup deferred to /business-setup', bizErr)
          navigate('/business-setup')
          return
        }
      }

      setIsSuccess(true)
      // Smooth brief success notification before landing in dashboard
      setTimeout(() => {
        navigate('/dashboard', { replace: true })
      }, 700)
    } catch (err: any) {
      setLocalError(err.message || 'Registration could not be completed. Please check your information.')
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heading="Create Your Business Account"
      subheading="Get started with MAAREE 360 and bring your business operations together in one place."
      badgeText="Free 14-Day Enterprise Trial"
    >
      {isSuccess ? (
        <div className="bg-white rounded-2xl border border-emerald-200 p-8 text-center space-y-4 shadow-sm animate-fadeIn">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#172033] tracking-tight">Account Created!</h3>
            <p className="text-xs text-slate-500 mt-1">
              Preparing your business workspace and initializing inventory...
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-emerald-700 pt-2">
            <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
            <span>Redirecting to Dashboard...</span>
          </div>
        </div>
      ) : (
        <form className="space-y-3.5" onSubmit={handleSubmit} noValidate>
          {/* Error Banner */}
          {localError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-rose-900">Registration Error</span>
                {localError}
              </div>
            </div>
          )}

          {/* Full Name & Business Name Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AuthInput
              id="name"
              name="name"
              type="text"
              required
              autoFocus
              label="Full Name"
              placeholder="e.g. Grace Wanjiku"
              value={name}
              onChange={(e) => setName(e.target.value)}
              icon={User}
              disabled={isSubmitting}
            />

            <AuthInput
              id="businessName"
              name="businessName"
              type="text"
              label="Business Name"
              placeholder="e.g. Nairobi Retail Hub"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              icon={Building2}
              disabled={isSubmitting}
              hint="You can edit this later"
            />
          </div>

          {/* Business Email & Optional Phone Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <AuthInput
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              label="Business Email"
              placeholder="owner@business.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              disabled={isSubmitting}
            />

            <AuthInput
              id="phone"
              name="phone"
              type="tel"
              label="Phone Number (Optional)"
              placeholder="+254 700 000 000"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              icon={Phone}
              disabled={isSubmitting}
            />
          </div>

          {/* Password & Confirm Password Grid */}
          <div className="space-y-3">
            <AuthInput
              id="password"
              name="password"
              required
              autoComplete="new-password"
              label="Password"
              placeholder="Min. 8 characters"
              isPassword
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              disabled={isSubmitting}
            />

            {/* Password Strength Indicator */}
            {password && <PasswordStrengthIndicator password={password} />}

            <AuthInput
              id="confirmPassword"
              name="confirmPassword"
              required
              autoComplete="new-password"
              label="Confirm Password"
              placeholder="Re-enter password"
              isPassword
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              icon={Lock}
              disabled={isSubmitting}
              error={!passwordsMatch ? 'Passwords do not match' : null}
            />
          </div>

          {/* Terms & Conditions Acceptance */}
          <div className="pt-1">
            <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
              <input
                type="checkbox"
                required
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                disabled={isSubmitting}
                className="w-4 h-4 mt-0.5 rounded text-[#12A878] border-[#CBD5E1] focus:ring-[#12A878] focus:ring-offset-0 transition cursor-pointer shrink-0"
              />
              <span className="leading-snug text-slate-600">
                I agree to the{' '}
                <a
                  href="#terms"
                  onClick={(e) => e.preventDefault()}
                  className="font-medium text-[#12A878] hover:underline"
                >
                  Terms of Service
                </a>{' '}
                and{' '}
                <a
                  href="#privacy"
                  onClick={(e) => e.preventDefault()}
                  className="font-medium text-[#12A878] hover:underline"
                >
                  Privacy Policy
                </a>
                .
              </span>
            </label>
          </div>

          {/* Primary Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting || !passwordsMatch}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#101C35] hover:bg-[#192C54] active:bg-[#0B1425] focus:outline-none focus:ring-3 focus:ring-[#101C35]/25 shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create Business Account</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </div>

          {/* Existing Account Link */}
          <div className="text-center pt-3 border-t border-[#E8ECF1]">
            <p className="text-xs text-[#64748B] m-0">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-semibold text-[#12A878] hover:text-[#0e8760] transition-colors focus:outline-none underline-offset-2 hover:underline"
              >
                Sign in
              </Link>
            </p>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
