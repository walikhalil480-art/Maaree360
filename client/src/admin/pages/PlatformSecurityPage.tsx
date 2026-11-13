import { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import {
  ShieldCheck,
  Lock,
  Key,
  ShieldAlert,
  RefreshCw,
  Clock,
  CheckCircle2,
} from 'lucide-react'

export default function PlatformSecurityPage() {
  const [loading, setLoading] = useState(false)
  const [securityEvents, setSecurityEvents] = useState<any[]>([])

  const fetchSecurityData = async () => {
    try {
      setLoading(true)
      const res = await apiFetch<{ success: boolean; logs: any[] }>('/api/v1/platform/audit-logs?limit=10')
      if (res.success) {
        setSecurityEvents(res.logs)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSecurityData()
  }, [])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Security Centre & Threat Mitigation</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global access controls, session revocation policies, MFA enforcement, and authentication event logs.
          </p>
        </div>
        <button
          onClick={fetchSecurityData}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Security Stream
        </button>
      </div>

      {/* Security Policies Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-[#101C35] text-sm">Session Protection</h3>
          <p className="text-xs text-slate-500 mt-1">
            Strict HTTP-only, secure, SameSite=Lax cookie tokens with 7-day TTL and automatic revocation on password change.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>Enforced Globally</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Key className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-[#101C35] text-sm">Argon2id Hashing</h3>
          <p className="text-xs text-slate-500 mt-1">
            Cryptographic Argon2id password hashing prevents rainbow-table and GPU brute-force attacks across all user tiers.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>Enforced Globally</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <h3 className="font-bold text-[#101C35] text-sm">Platform Owner Lockout Guard</h3>
          <p className="text-xs text-slate-500 mt-1">
            Immutability constraints prevent accidental deletion, suspension, or role demotion of the root Platform Owner.
          </p>
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs font-semibold text-emerald-600">
            <span>Active Constraint</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
      </div>

      {/* Security Audit Stream */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-base font-bold text-[#101C35] mb-1">Recent Privileged Security Events</h3>
        <p className="text-xs text-slate-500 mb-4">Real-time authentication and permission event stream</p>

        <div className="space-y-3">
          {securityEvents.map((evt) => (
            <div key={evt.id} className="p-3.5 bg-slate-50/80 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200/80 text-slate-700 flex items-center justify-center shrink-0">
                  <ShieldAlert className="w-4 h-4" />
                </div>
                <div>
                  <p className="font-bold text-[#101C35]">{evt.action}</p>
                  <p className="text-[11px] text-slate-500">
                    Actor: {evt.actorEmail} ({evt.actorRole}) • IP: {evt.ipAddress || '127.0.0.1'}
                  </p>
                </div>
              </div>
              <div className="text-right text-[11px] text-slate-400">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {new Date(evt.createdAt).toLocaleString()}
                </span>
              </div>
            </div>
          ))}
          {securityEvents.length === 0 && (
            <p className="text-center py-8 text-slate-400 text-xs">No recent security events recorded.</p>
          )}
        </div>
      </div>
    </div>
  )
}
