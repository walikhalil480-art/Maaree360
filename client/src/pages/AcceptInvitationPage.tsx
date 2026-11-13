import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { apiFetch, ApiError } from '../api/client'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { MaareeLogo } from '../components/ui/MaareeLogo'
import {
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  LogOut,
  UserCheck,
  Lock,
  Mail,
  User,
  Phone,
  Eye,
  EyeOff,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react'

interface InvitationPreview {
  id: string
  businessName: string
  businessSlug?: string
  business: {
    id: string
    name: string
    slug: string
  }
  invitation: {
    id: string
    name: string | null
    role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOCK_CLERK'
    email: string | null
    phone: string | null
    message: string | null
    status: string
    expiresAt: string
    invitedBy: {
      name: string
      email: string
    }
  }
  role: 'OWNER' | 'MANAGER' | 'CASHIER' | 'STOCK_CLERK'
  email: string | null
  phone: string | null
  expiresAt: string
  invitedBy: string
  isExistingUser: boolean
  requiresRegistration: boolean
}

export default function AcceptInvitationPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const navigate = useNavigate()
  const { user, login, logout } = useAuth()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [preview, setPreview] = useState<InvitationPreview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Registration Form State (for Path A: Brand new user)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Sign In Form State (for Path B: Existing unauthenticated user)
  const [signInPassword, setSignInPassword] = useState('')
  const [showSignInPassword, setShowSignInPassword] = useState(false)
  const [signInError, setSignInError] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setError('No invitation token was provided in the link.')
      setErrorCode('NO_TOKEN')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)
    setErrorCode(null)

    apiFetch<{ success: boolean; data: InvitationPreview }>(`/api/v1/invitations/${encodeURIComponent(token)}`)
      .then((res) => {
        if (res.success && res.data) {
          setPreview(res.data)
          if (res.data.invitation?.name) {
            setFullName(res.data.invitation.name)
          }
          if (res.data.invitation?.phone) {
            setPhoneNumber(res.data.invitation.phone)
          }
        }
      })
      .catch((err) => {
        if (err instanceof ApiError) {
          setError(err.message)
          setErrorCode(err.code || 'UNKNOWN_ERROR')
        } else {
          setError('Invalid or expired invitation link. Please request a new one.')
          setErrorCode('UNKNOWN_ERROR')
        }
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  // Helper to remove token from browser address bar on success
  const cleanupUrl = () => {
    try {
      const cleanUrl = window.location.origin + window.location.pathname
      window.history.replaceState({}, document.title, cleanUrl)
    } catch {}
  }

  // 1. One-click Accept for logged-in user with matching email
  const handleLoggedInAccept = async () => {
    if (!token) return
    setError(null)
    setSubmitting(true)

    try {
      const res = await apiFetch<{
        success: boolean
        message: string
        data: { membership: any; business: any }
      }>('/api/v1/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })

      if (res.success) {
        setSuccess(true)
        cleanupUrl()
        const targetBizId = res.data?.business?.id || preview?.business?.id
        if (targetBizId) {
          localStorage.setItem('smartstock_active_business_id', targetBizId)
        }
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1200)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to accept invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  // 2. Accept & Register for brand new user
  const handleRegisterAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    if (!fullName.trim()) {
      setFormError('Please enter your full name.')
      return
    }

    if (!password) {
      setFormError('Please create a password for your account.')
      return
    }

    if (password.length < 8) {
      setFormError('Password must be at least 8 characters long.')
      return
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match. Please re-enter.')
      return
    }

    setSubmitting(true)

    try {
      const res = await apiFetch<{
        success: boolean
        message: string
        data: {
          user: { id: string; name: string; email: string }
          business: { id: string; name: string }
          role: string
        }
      }>('/api/v1/invitations/accept-and-register', {
        method: 'POST',
        body: JSON.stringify({
          token,
          name: fullName.trim(),
          password,
          phone: phoneNumber.trim() || undefined,
        }),
      })

      if (res.success) {
        setSuccess(true)
        cleanupUrl()
        const targetBizId = res.data?.business?.id || preview?.business?.id
        if (targetBizId) {
          localStorage.setItem('smartstock_active_business_id', targetBizId)
        }
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1200)
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to create account and accept invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  // 3. Inline Sign-In & Accept for existing user who isn't logged in
  const handleSignInAndAccept = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignInError(null)

    const targetEmail = preview?.invitation?.email || preview?.email
    if (!targetEmail) {
      setSignInError('Invitation does not contain an email address.')
      return
    }

    if (!signInPassword) {
      setSignInError('Please enter your password.')
      return
    }

    setSubmitting(true)

    try {
      // Step A: Login
      await login(targetEmail, signInPassword)

      // Step B: Accept Invitation
      const res = await apiFetch<{
        success: boolean
        message: string
        data: { membership: any; business: any }
      }>('/api/v1/invitations/accept', {
        method: 'POST',
        body: JSON.stringify({ token }),
      })

      if (res.success) {
        setSuccess(true)
        cleanupUrl()
        const targetBizId = res.data?.business?.id || preview?.business?.id
        if (targetBizId) {
          localStorage.setItem('smartstock_active_business_id', targetBizId)
        }
        setTimeout(() => {
          window.location.href = '/dashboard'
        }, 1200)
      }
    } catch (err: any) {
      setSignInError(err?.message || 'Invalid password or failed to accept invitation.')
    } finally {
      setSubmitting(false)
    }
  }

  const roleLabels: Record<string, string> = {
    OWNER: 'Business Co-Owner',
    MANAGER: 'Shop Manager',
    CASHIER: 'Cashier & POS Operator',
    STOCK_CLERK: 'Stock & Inventory Clerk',
  }

  const roleDescriptions: Record<string, string> = {
    OWNER: 'Full ownership and administrative control across all shop operations.',
    MANAGER: 'Manage daily operations, inventory catalog, staff shifts, and branch reports.',
    CASHIER: 'Point of sale operations, sales transactions, shift drawers, and receipts.',
    STOCK_CLERK: 'Stock adjustments, receiving purchases, low stock alerts, and count audits.',
  }

  const invitationEmail = preview?.invitation?.email || preview?.email || ''
  const isEmailMismatch = user && invitationEmail && user.email.toLowerCase() !== invitationEmail.toLowerCase()
  const roleName = preview?.invitation?.role || preview?.role || 'CASHIER'
  const businessName = preview?.business?.name || preview?.businessName || 'Business Shop'
  const inviterName = preview?.invitation?.invitedBy?.name || preview?.invitedBy || 'The Business Administrator'
  const customMessage = preview?.invitation?.message

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <MaareeLogo variant="stacked" size="lg" theme="light" showSubtitle={true} subtitle="Retail Management System" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-[#101C35] m-0">Team Invitation</h1>
          <p className="mt-1 text-xs text-[#64748B]">Sell Smarter. Manage Better. • MAAREE 360 Platform</p>
        </div>

        {/* Main Card Container */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl shadow-slate-900/5 overflow-hidden">
          {/* 1. Loading State */}
          {loading ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-9 h-9 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <h3 className="text-sm font-semibold text-slate-800">Verifying Invitation</h3>
              <p className="text-xs text-slate-500">Checking invitation token and permissions...</p>
            </div>
          ) : error ? (
            /* 2. Error States (Invalid, Expired, Revoked, Already Accepted) */
            <div className="p-8 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-100">
                {errorCode === 'INVITATION_ALREADY_ACCEPTED' ? (
                  <CheckCircle2 className="w-7 h-7 text-emerald-600" />
                ) : (
                  <ShieldAlert className="w-7 h-7 text-rose-600" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {errorCode === 'INVITATION_EXPIRED'
                    ? 'Invitation Expired'
                    : errorCode === 'INVITATION_REVOKED'
                    ? 'Invitation Cancelled'
                    : errorCode === 'INVITATION_ALREADY_ACCEPTED'
                    ? 'Already Accepted'
                    : 'Invitation Unavailable'}
                </h3>
                <p className="text-xs text-slate-600 mt-2 leading-relaxed max-w-sm mx-auto">{error}</p>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <Button
                  variant="primary"
                  onClick={() => navigate('/login')}
                  className="w-full bg-[#101C35] hover:bg-[#1A2E56] text-white"
                >
                  Sign In to MAAREE 360
                </Button>
                {errorCode === 'INVITATION_EXPIRED' && (
                  <p className="text-[11px] text-slate-400">
                    Contact your store manager or business administrator to receive a refreshed link.
                  </p>
                )}
              </div>
            </div>
          ) : success ? (
            /* 3. Success State */
            <div className="p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto animate-bounce border border-emerald-200">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900">Welcome to the Team!</h3>
                <p className="text-xs text-slate-600 mt-2">
                  You have successfully joined <strong className="text-slate-900">{businessName}</strong> as{' '}
                  <span className="font-semibold text-emerald-700">{roleLabels[roleName] || roleName}</span>.
                </p>
                <div className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-200">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Redirecting to your shop workspace...
                </div>
              </div>
            </div>
          ) : preview ? (
            /* 4. Active Pending Invitation Preview */
            <div>
              {/* Business & Role Header Banner */}
              <div className="bg-gradient-to-b from-slate-50 to-white px-6 pt-6 pb-5 border-b border-slate-100 text-center">
                <div className="w-14 h-14 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm border border-emerald-100/80">
                  <Building2 className="w-7 h-7" />
                </div>
                <h2 className="text-xl font-bold text-slate-900">{businessName}</h2>
                <div className="mt-2 flex items-center justify-center gap-1.5">
                  <span className="text-xs text-slate-500">Role:</span>
                  <Badge variant="success" className="bg-emerald-50 text-emerald-800 border-emerald-200 font-semibold">
                    {roleLabels[roleName] || roleName}
                  </Badge>
                </div>
                <p className="text-[11px] text-slate-500 mt-1 max-w-xs mx-auto">
                  {roleDescriptions[roleName] || 'Access and contribute to this business workspace.'}
                </p>
              </div>

              <div className="p-6 space-y-5">
                {/* Meta details list */}
                <div className="space-y-2.5 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Invited By</span>
                    <span className="font-semibold text-slate-900">{inviterName}</span>
                  </div>
                  {invitationEmail && (
                    <div className="flex justify-between items-center">
                      <span className="text-slate-500">Invited Email</span>
                      <span className="font-mono font-medium text-slate-800">{invitationEmail}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center">
                    <span className="text-slate-500">Link Validity</span>
                    <span className="font-medium text-slate-700 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {new Date(preview.invitation?.expiresAt || preview.expiresAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>
                </div>

                {/* Optional Custom Message from Inviter */}
                {customMessage && (
                  <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold block text-blue-950">Note from {inviterName}:</span>
                      <p className="italic text-slate-700 mt-0.5">&ldquo;{customMessage}&rdquo;</p>
                    </div>
                  </div>
                )}

                {/* ========================================================
                    SCENARIO 1: User is Logged In
                   ======================================================== */}
                {user ? (
                  isEmailMismatch ? (
                    /* 1B. Logged in with MISMATCHED email */
                    <div className="space-y-3 pt-2">
                      <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                        <div className="flex items-center gap-1.5 font-bold text-amber-950">
                          <AlertCircle className="w-4 h-4 text-amber-600" />
                          Account Mismatch
                        </div>
                        <p className="leading-relaxed">
                          You are currently signed in as <strong>{user.email}</strong>, but this invitation was sent specifically to <strong>{invitationEmail}</strong>.
                        </p>
                      </div>

                      <Button
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-[#101C35] hover:bg-[#1A2E56]"
                        onClick={async () => {
                          await logout()
                          navigate(
                            `/login?returnTo=${encodeURIComponent(`/accept-invitation?token=${token}`)}&email=${encodeURIComponent(invitationEmail)}`
                          )
                        }}
                      >
                        <LogOut className="w-4 h-4" />
                        Sign Out & Sign In with {invitationEmail}
                      </Button>

                      <Button
                        variant="outline"
                        className="w-full text-xs"
                        onClick={async () => {
                          await logout()
                          window.location.reload()
                        }}
                      >
                        Sign Out & Register New Account
                      </Button>
                    </div>
                  ) : (
                    /* 1A. Logged in with MATCHING email -> One-click accept */
                    <div className="space-y-3 pt-2">
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                        <UserCheck className="w-4 h-4 shrink-0 text-emerald-600" />
                        <span>
                          Verified account: <strong>{user.email}</strong>
                        </span>
                      </div>
                      <Button
                        variant="primary"
                        className="w-full flex items-center justify-center gap-2 py-3 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm"
                        onClick={handleLoggedInAccept}
                        isLoading={submitting}
                      >
                        Accept Invitation & Join {businessName}
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>
                  )
                ) : /* ========================================================
                    SCENARIO 2: User is NOT Logged In
                   ======================================================== */
                preview.requiresRegistration ? (
                  /* 2A. Recipient DOES NOT have an account -> Complete Account Form */
                  <form onSubmit={handleRegisterAndAccept} className="space-y-3.5 pt-1" noValidate>
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                        Create Your Employee Account
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Set up your login password to access {businessName}.
                      </p>
                    </div>

                    {formError && (
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">{formError}</div>
                      </div>
                    )}

                    {/* Full Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Full Name</label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="Jane Doe"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Locked Email */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-slate-700">Email Address</label>
                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Lock className="w-3 h-3 text-slate-400" /> Locked to invitation
                        </span>
                      </div>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="email"
                          readOnly
                          disabled
                          value={invitationEmail}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Optional Phone */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Phone Number <span className="text-slate-400 font-normal">(optional)</span>
                      </label>
                      <div className="relative">
                        <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="tel"
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="+254 700 000 000"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Create Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Minimum 8 characters"
                          className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Confirm Password</label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter your password"
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                        />
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mt-2"
                      isLoading={submitting}
                    >
                      Create Account & Join {businessName}
                      <ArrowRight className="w-4 h-4" />
                    </Button>

                    <div className="text-center pt-2">
                      <Link
                        to={`/login?returnTo=${encodeURIComponent(`/accept-invitation?token=${token}`)}&email=${encodeURIComponent(invitationEmail)}`}
                        className="text-xs text-emerald-600 hover:text-emerald-700 hover:underline"
                      >
                        Already have an account? Sign in instead
                      </Link>
                    </div>
                  </form>
                ) : (
                  /* 2B. Recipient ALREADY HAS an account -> Inline Sign-In */
                  <form onSubmit={handleSignInAndAccept} className="space-y-3.5 pt-1" noValidate>
                    <div className="border-t border-slate-100 pt-3">
                      <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-1">
                        Sign In to Join Team
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        An existing MAAREE 360 account was found for <strong>{invitationEmail}</strong>. Enter your password to accept this invitation.
                      </p>
                    </div>

                    {signInError && (
                      <div className="rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs text-rose-800 flex items-start gap-2 animate-fadeIn">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div className="flex-1">{signInError}</div>
                      </div>
                    )}

                    {/* Locked Email */}
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Email Address</label>
                      <div className="relative">
                        <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type="email"
                          readOnly
                          disabled
                          value={invitationEmail}
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono cursor-not-allowed"
                        />
                      </div>
                    </div>

                    {/* Password */}
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-slate-700">Account Password</label>
                        <Link to="/forgot-password" className="text-[11px] text-emerald-600 hover:underline">
                          Forgot password?
                        </Link>
                      </div>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                        <input
                          type={showSignInPassword ? 'text' : 'password'}
                          required
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="Your account password"
                          className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600"
                        >
                          {showSignInPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      className="w-full flex items-center justify-center gap-2 py-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm mt-2"
                      isLoading={submitting}
                    >
                      Sign In & Join {businessName}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
