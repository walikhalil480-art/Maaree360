import { useState } from 'react'
import { Modal } from '../ui/Modal'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import type { StaffRole } from '../../types/team'
import type { AppRole } from '../../types/rbac'
import {
  Mail,
  Phone,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Info,
  UserPlus,
  Sparkles,
  User,
  MessageSquare,
  Send,
  Clock,
} from 'lucide-react'

export interface InviteResult {
  token: string
  invitationUrl: string
  recipient: string
  name?: string
  role: StaffRole
  emailDelivery?: {
    status: 'SENT' | 'FAILED' | 'PENDING'
    error?: string
  }
}

interface InviteStaffModalProps {
  isOpen: boolean
  onClose: () => void
  roles?: AppRole[]
  currentRole?: string
  onInvite: (data: {
    name?: string
    email?: string
    phone?: string
    role: StaffRole
    message?: string
  }) => Promise<InviteResult | null>
  onSuccessDone?: () => void
}

export const InviteStaffModal: React.FC<InviteStaffModalProps> = ({
  isOpen,
  onClose,
  roles = [],
  currentRole,
  onInvite,
  onSuccessDone,
}) => {
  const [name, setName] = useState('')
  const [inviteType, setInviteType] = useState<'email' | 'phone'>('email')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [message, setMessage] = useState('')
  const [role, setRole] = useState<StaffRole>('CASHIER')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdInvite, setCreatedInvite] = useState<InviteResult | null>(null)
  const [copied, setCopied] = useState(false)

  const handleClose = () => {
    setCreatedInvite(null)
    setName('')
    setEmail('')
    setPhone('')
    setMessage('')
    setError(null)
    setCopied(false)
    onClose()
  }

  const handleDone = () => {
    handleClose()
    if (onSuccessDone) {
      onSuccessDone()
    }
  }

  const handleCopy = (link: string) => {
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please provide the employee full name.')
      return
    }

    if (inviteType === 'email' && !email.trim()) {
      setError('Please provide a valid email address.')
      return
    }
    if (inviteType === 'phone' && !phone.trim()) {
      setError('Please provide a valid phone number (e.g. 0712345678 or +254712345678).')
      return
    }

    try {
      setLoading(true)
      const res = await onInvite({
        name: name.trim(),
        email: inviteType === 'email' ? email.trim() : undefined,
        phone: inviteType === 'phone' ? phone.trim() : undefined,
        role,
        message: message.trim() || undefined,
      })

      if (res && res.token) {
        setCreatedInvite(res)
      } else {
        handleClose()
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to send invitation')
    } finally {
      setLoading(false)
    }
  }

  const roleDescriptions: Record<string, { title: string; desc: string }> = {
    OWNER: {
      title: 'Owner',
      desc: 'Full control over business settings, team management, finances, and reports.',
    },
    STORE_MANAGER: {
      title: 'Store Manager',
      desc: 'Supervises store operations, reports, staff shifts, purchasing, and expense approvals.',
    },
    MANAGER: {
      title: 'Manager',
      desc: 'Manage day-to-day operations, inventory, expenses, reports, and staff shifts.',
    },
    SUPERVISOR: {
      title: 'Supervisor',
      desc: 'Shift oversight, register reconciliation, returns management, and operational approvals.',
    },
    CASHIER: {
      title: 'Cashier',
      desc: 'Access Point of Sale, handle sales, process customer returns, and manage cash shifts.',
    },
    STOCK_CLERK: {
      title: 'Stock Clerk',
      desc: 'Receive stock shipments, perform inventory audits, and record stock adjustments.',
    },
    ACCOUNTANT: {
      title: 'Accountant',
      desc: 'Inspect financial statements, cash flow, operating expenses, and export fiscal tax reports.',
    },
  }

  const isActorManager = currentRole === 'MANAGER'

  const availableRoles = (roles.length > 0
    ? roles.map((r) => ({
        key: r.name,
        title: r.displayName || roleDescriptions[r.name]?.title || r.name,
        desc: r.description || roleDescriptions[r.name]?.desc || 'Operational role',
        isCustom: r.isCustom,
        permsCount: r.permissions?.length || 0,
      }))
    : (['CASHIER', 'STOCK_CLERK', 'MANAGER', 'OWNER'] as StaffRole[]).map((r) => ({
        key: r,
        title: roleDescriptions[r]?.title || r,
        desc: roleDescriptions[r]?.desc || '',
        isCustom: false,
        permsCount: 0,
      }))
  ).filter((r) => {
    // If actor is manager, prevent assigning Owner or Manager
    if (isActorManager && (r.key === 'OWNER' || r.key === 'MANAGER')) {
      return false
    }
    return true
  })

  const fullInviteUrl = createdInvite
    ? `${window.location.origin}/accept-invitation?token=${createdInvite.token}`
    : ''

  const isEmailSent = createdInvite?.emailDelivery?.status === 'SENT'

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={createdInvite ? 'Invitation Link Generated' : 'Invite Team Member'}
      description={
        createdInvite
          ? 'Share this direct onboarding link with your employee.'
          : 'Invite an employee to join your shop with a specific role and access level.'
      }
      size="md"
    >
      {createdInvite ? (
        <div className="p-6 space-y-5">
          {/* Success Banner */}
          <div className="flex items-start gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-emerald-950">
                Invitation Created for {createdInvite.name ? `${createdInvite.name} (${createdInvite.recipient})` : createdInvite.recipient}
              </h4>
              <p className="text-xs text-emerald-800">
                Assigned Role: <span className="font-semibold">{createdInvite.role.replace(/_/g, ' ')}</span>.
              </p>
            </div>
          </div>

          {/* Delivery Status Indicator */}
          {isEmailSent ? (
            <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-start gap-2.5">
              <Send className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900">
                <span className="font-bold block text-emerald-950">Invitation Email Delivered</span>
                An invitation email with access instructions was sent directly to{' '}
                <strong>{createdInvite.recipient}</strong>.
              </div>
            </div>
          ) : (
            <div className="p-3.5 bg-amber-50/80 border border-amber-200 rounded-xl flex items-start gap-2.5">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-900 space-y-1">
                <p className="font-semibold">Direct Link Ready to Share</p>
                <p className="text-amber-800 leading-relaxed">
                  {createdInvite.emailDelivery?.error
                    ? `Email Gateway Notice: ${createdInvite.emailDelivery.error}`
                    : 'SMTP email gateway is not configured. Copy and share the onboarding link below via WhatsApp, SMS, or email:'}
                </p>
              </div>
            </div>
          )}

          {/* Link Box */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Secure Onboarding Link
              </label>
              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" /> Expires in 72 hours
              </span>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={fullInviteUrl}
                className="w-full text-xs font-mono bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                onClick={(e) => (e.target as HTMLInputElement).select()}
              />
              <Button
                type="button"
                variant={copied ? 'primary' : 'outline'}
                onClick={() => handleCopy(fullInviteUrl)}
                className="shrink-0 flex items-center gap-1.5"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => window.open(fullInviteUrl, '_blank')}
              className="w-full sm:w-auto flex items-center justify-center gap-1.5"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-600" />
              Open Link (Test Onboarding)
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setCreatedInvite(null)
                setName('')
                setEmail('')
                setPhone('')
                setMessage('')
                setError(null)
              }}
              className="w-full sm:w-auto text-slate-600 hover:text-slate-900 text-xs flex items-center justify-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              Invite Another
            </Button>
          </div>

          {/* Modal Footer */}
          <div className="pt-4 border-t border-slate-100 flex justify-end">
            <Button type="button" variant="primary" onClick={handleDone}>
              Done & View Invitations
            </Button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="flex items-center gap-2 p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Employee Full Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Employee Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                type="text"
                placeholder="e.g. Jane Mwangi"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="pl-9"
                required
              />
            </div>
          </div>

          {/* Tab switch: Email vs Phone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Invite Destination
            </label>
            <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => {
                  setInviteType('email')
                  setError(null)
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                  inviteType === 'email'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                Email Address
              </button>
              <button
                type="button"
                onClick={() => {
                  setInviteType('phone')
                  setError(null)
                }}
                className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded-lg transition-all ${
                  inviteType === 'phone'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                Phone (SMS / WhatsApp)
              </button>
            </div>
          </div>

          {inviteType === 'email' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email Address <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  type="email"
                  placeholder="e.g. employee@store.co.ke"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                The employee will receive an invitation email and use this address to log in.
              </p>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Phone Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  type="tel"
                  placeholder="e.g. 0712 345 678 or +254 700 000 000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="pl-9"
                  required
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Safaricom, Airtel, or Telkom phone format accepted.
              </p>
            </div>
          )}

          {/* Personal Welcome Message */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Personal Message <span className="text-slate-400 font-normal">(optional)</span>
            </label>
            <div className="relative">
              <MessageSquare className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="e.g. Welcome to the team! Please accept this invitation to set up your account."
                rows={2}
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-slate-900 resize-none"
              />
            </div>
          </div>

          {/* Role selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Assign Role <span className="text-red-500">*</span>
            </label>
            <div className="space-y-2 max-h-[30vh] overflow-y-auto pr-1">
              {availableRoles.map((item) => (
                <label
                  key={item.key}
                  className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    role === item.key
                      ? 'border-emerald-600 bg-emerald-50/40 text-slate-900 ring-1 ring-emerald-600'
                      : 'border-slate-200 hover:border-slate-300 text-slate-700 bg-white'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={item.key}
                    checked={role === item.key}
                    onChange={() => setRole(item.key as StaffRole)}
                    className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-slate-900">
                        {item.title}
                      </span>
                      {item.key === 'OWNER' && (
                        <span className="text-[10px] uppercase font-bold bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          Full Admin
                        </span>
                      )}
                      {item.isCustom && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                          <Sparkles className="w-2.5 h-2.5" /> Custom
                        </span>
                      )}
                      {item.permsCount > 0 && (
                        <span className="text-[11px] font-medium text-slate-500">
                          • {item.permsCount} perms
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={loading}>
              Send Invitation
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
