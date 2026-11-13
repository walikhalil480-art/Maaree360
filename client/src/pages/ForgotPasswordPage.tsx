import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthInput } from '../components/auth/AuthInput'
import { Mail, ArrowLeft, ArrowRight, CheckCircle2, Loader2, AlertCircle } from 'lucide-react'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(0)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!email.trim()) {
      setLocalError('Please enter your registered email address.')
      return
    }

    try {
      setIsSubmitting(true)
      // Simulate/trigger password recovery flow gracefully
      await new Promise((resolve) => setTimeout(resolve, 800))
      setIsSubmitted(true)
      setCooldown(60)

      // Countdown timer for resend
      const timer = setInterval(() => {
        setCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(timer)
            return 0
          }
          return prev - 1
        })
      }, 1000)
    } catch (err: any) {
      setLocalError(err.message || 'Unable to process recovery request. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = () => {
    if (cooldown > 0) return
    setIsSubmitted(false)
  }

  return (
    <AuthLayout
      heading={isSubmitted ? 'Check Your Inbox' : 'Reset Your Password'}
      subheading={
        isSubmitted
          ? `We've dispatched recovery instructions to ${email}`
          : 'Enter your business email and we will send you a secure link to reset your account password.'
      }
    >
      {isSubmitted ? (
        <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center space-y-5 shadow-xs animate-fadeIn">
          <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-[#12A878] flex items-center justify-center mx-auto shadow-2xs">
            <CheckCircle2 className="w-7 h-7 stroke-[2]" />
          </div>

          <div className="space-y-2">
            <h3 className="text-base font-bold text-[#172033] tracking-tight m-0">
              Recovery Link Dispatched
            </h3>
            <p className="text-xs text-slate-500 leading-relaxed max-w-sm mx-auto m-0">
              If an active workspace account exists for{' '}
              <strong className="text-slate-900 font-semibold">{email}</strong>, you will receive an email shortly with a secure password reset link.
            </p>
            <p className="text-[11px] text-slate-400 m-0 pt-1">
              Be sure to check your spam or junk folder if you don't see it within 3 minutes.
            </p>
          </div>

          <div className="pt-2 space-y-2.5">
            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#101C35] hover:bg-[#192C54] active:bg-[#0B1425] shadow-sm transition-all focus:outline-none"
            >
              <ArrowLeft className="w-4 h-4 text-emerald-400" />
              <span>Return to Sign In</span>
            </Link>

            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0}
              className="w-full py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {cooldown > 0
                ? `Resend available in ${cooldown}s`
                : "Didn't receive an email? Click to retry"}
            </button>
          </div>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit} noValidate>
          {localError && (
            <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span className="font-semibold block text-rose-900">Request Error</span>
                {localError}
              </div>
            </div>
          )}

          <AuthInput
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            label="Registered business email"
            placeholder="name@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={Mail}
            disabled={isSubmitting}
            hint="We will never share your email address with third parties."
          />

          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#101C35] hover:bg-[#192C54] active:bg-[#0B1425] focus:outline-none focus:ring-3 focus:ring-[#101C35]/25 shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Sending Reset Link...</span>
                </>
              ) : (
                <>
                  <span>Send Reset Link</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>

            <Link
              to="/login"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Sign In</span>
            </Link>
          </div>
        </form>
      )}
    </AuthLayout>
  )
}
