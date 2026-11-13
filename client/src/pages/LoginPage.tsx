import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { AuthLayout } from '../components/auth/AuthLayout'
import { AuthInput } from '../components/auth/AuthInput'
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  // Retrieve saved remember-me email on mount
  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location.search)
      const emailParam = searchParams.get('email')
      if (emailParam) {
        setEmail(emailParam)
      } else {
        const savedEmail = localStorage.getItem('maaree360_remember_email')
        if (savedEmail) {
          setEmail(savedEmail)
          setRememberMe(true)
        }
      }
    } catch (e) {
      // Ignore localStorage exceptions in private browsing
    }
  }, [location.search])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!email.trim() || !password) {
      setLocalError('Please enter both your email and password.')
      return
    }

    try {
      setIsSubmitting(true)

      // Handle remember me preference
      try {
        if (rememberMe) {
          localStorage.setItem('maaree360_remember_email', email.trim())
        } else {
          localStorage.removeItem('maaree360_remember_email')
        }
      } catch (e) {}

      await login(email.trim(), password)

      // Redirect to the originally requested route, returnTo param, or fallback to dashboard
      const searchParams = new URLSearchParams(location.search)
      const returnTo = searchParams.get('returnTo')
      const fromState = (location.state as any)?.from?.pathname
      const destination = returnTo || fromState || '/dashboard'
      navigate(destination, { replace: true })
    } catch (err: any) {
      setLocalError(err.message || 'Invalid email or password. Please verify your credentials.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AuthLayout
      heading="Welcome Back"
      subheading="Sign in to access your business workspace."
    >
      <form className="space-y-4" onSubmit={handleSubmit} noValidate>
        {/* Backend Error Banner */}
        {localError && (
          <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-800 flex items-start gap-2.5 animate-fadeIn">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span className="font-semibold block text-rose-900">Authentication Error</span>
              {localError}
            </div>
          </div>
        )}

        {/* Email Address */}
        <AuthInput
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          autoFocus={!email}
          label="Email address"
          placeholder="name@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          icon={Mail}
          disabled={isSubmitting}
        />

        {/* Password with Forgot Password link */}
        <AuthInput
          id="password"
          name="password"
          required
          autoComplete="current-password"
          label="Password"
          placeholder="••••••••"
          isPassword
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          icon={Lock}
          disabled={isSubmitting}
          actionLink={
            <Link
              to="/forgot-password"
              className="font-medium text-[#12A878] hover:text-[#0e8760] transition-colors focus:outline-none"
            >
              Forgot password?
            </Link>
          }
        />

        {/* Remember Me Checkbox */}
        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2.5 text-xs text-slate-600 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              disabled={isSubmitting}
              className="w-4 h-4 rounded text-[#12A878] border-[#CBD5E1] focus:ring-[#12A878] focus:ring-offset-0 transition cursor-pointer"
            />
            <span className="font-medium text-slate-700">Remember my email</span>
          </label>
        </div>

        {/* Primary Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-[#101C35] hover:bg-[#192C54] active:bg-[#0B1425] focus:outline-none focus:ring-3 focus:ring-[#101C35]/25 shadow-sm transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In to Your Workspace</span>
                <ArrowRight className="w-4 h-4 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
              </>
            )}
          </button>
        </div>

        {/* Register Account Switcher */}
        <div className="text-center pt-3 border-t border-[#E8ECF1]">
          <p className="text-xs text-[#64748B] m-0">
            New to MAAREE 360?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#12A878] hover:text-[#0e8760] transition-colors focus:outline-none underline-offset-2 hover:underline"
            >
              Create an account
            </Link>
          </p>
        </div>
      </form>
    </AuthLayout>
  )
}
