import React, { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import {
  Plus,
  ShieldAlert,
  CheckCircle2,
  XCircle,
  X,
  RefreshCw,
  Lock,
} from 'lucide-react'

interface SupportSessionItem {
  id: string
  adminId: string
  businessId: string
  businessName: string
  businessSlug: string
  adminName: string
  adminEmail: string
  reason: string
  expiresAt: string
  revokedAt?: string | null
  isActive: boolean
  isExpired: boolean
  isRevoked: boolean
  createdAt: string
}

export default function PlatformSupportPage() {
  const [sessions, setSessions] = useState<SupportSessionItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([])
  const [formData, setFormData] = useState({
    businessId: '',
    reason: '',
    durationMinutes: 60,
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchSessions = async () => {
    try {
      setLoading(true)
      const res = await apiFetch<{ success: boolean; sessions: SupportSessionItem[] }>(
        '/api/v1/platform/support/sessions'
      )
      if (res.success) {
        setSessions(res.sessions)
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false)
    }
  }

  const fetchBusinesses = async () => {
    try {
      const res = await apiFetch<{ success: boolean; businesses: any[] }>(
        '/api/v1/platform/businesses?limit=100'
      )
      if (res.success) {
        setBusinesses(res.businesses)
        if (res.businesses.length > 0 && !formData.businessId) {
          setFormData((prev) => ({ ...prev, businessId: res.businesses[0].id }))
        }
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchSessions()
    fetchBusinesses()
  }, [])

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.reason.trim() || formData.reason.trim().length < 5) {
      alert('A valid operational reason (min 5 characters) is required.')
      return
    }

    try {
      setSubmitting(true)
      const res = await apiFetch<{ success: boolean; session: any }>(
        '/api/v1/platform/support/sessions',
        {
          method: 'POST',
          body: JSON.stringify(formData),
        }
      )
      if (res.success) {
        setShowModal(false)
        setFormData({ businessId: businesses[0]?.id || '', reason: '', durationMinutes: 60 })
        fetchSessions()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to initiate support session')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevoke = async (id: string, bizName: string) => {
    if (!confirm(`Are you sure you want to immediately revoke support access to ${bizName}?`)) return
    try {
      const res = await apiFetch<{ success: boolean }>(`/api/v1/platform/support/sessions/${id}`, {
        method: 'DELETE',
      })
      if (res.success) {
        fetchSessions()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke support session')
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Support Centre & Customer Diagnostics</h1>
          <p className="text-sm text-slate-500 mt-1">
            Controlled, time-limited, and audited diagnostic sessions. Unrestricted customer impersonation is strictly prohibited.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#101C35] text-white text-xs font-semibold rounded-xl hover:bg-[#1A2C50] transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          Request Diagnostic Access
        </button>
      </div>

      {/* Security Governance Alert */}
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900 text-xs">
        <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-bold">Zero-Impersonation Security Governance</h4>
          <p className="mt-0.5 leading-relaxed">
            Platform administrators never possess permanent backdoor access to customer business records. Every diagnostic
            access session requires documented justification, has a mandatory auto-expiry timer, and writes an entry into the
            immutable platform audit trail.
          </p>
        </div>
      </div>

      {/* Active & Recent Sessions Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-[#101C35] text-sm">Diagnostic Access Sessions</h3>
            <p className="text-xs text-slate-500">Live and historical platform diagnostic tokens</p>
          </div>
          <button
            onClick={fetchSessions}
            className="p-1.5 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Customer Business</th>
                <th className="px-5 py-3.5">Platform Staff</th>
                <th className="px-5 py-3.5">Documented Reason</th>
                <th className="px-5 py-3.5">Session Status</th>
                <th className="px-5 py-3.5">Expires At</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sessions.map((sess) => (
                <tr key={sess.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4 font-bold text-[#101C35]">{sess.businessName}</td>
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-800">{sess.adminName}</p>
                    <p className="text-[11px] text-slate-400 font-mono">{sess.adminEmail}</p>
                  </td>
                  <td className="px-5 py-4 text-slate-600 max-w-xs truncate">{sess.reason}</td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        sess.isActive
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : sess.isRevoked
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {sess.isActive && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {sess.isRevoked && <XCircle className="w-3 h-3 text-rose-500" />}
                      {sess.isActive ? 'Active (Live)' : sess.isRevoked ? 'Revoked' : 'Expired'}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                    {new Date(sess.expiresAt).toLocaleTimeString()} ({new Date(sess.expiresAt).toLocaleDateString()})
                  </td>
                  <td className="px-5 py-4 text-right">
                    {sess.isActive && (
                      <button
                        onClick={() => handleRevoke(sess.id, sess.businessName)}
                        className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-lg text-xs transition-colors"
                      >
                        Revoke Now
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No active or historical support sessions on record.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Initiate Diagnostic Access */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSession}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5 text-[#101C35]" />
                <h3 className="text-base font-bold text-[#101C35]">Request Diagnostic Access</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Customer Business *</label>
                <select
                  value={formData.businessId}
                  onChange={(e) => setFormData({ ...formData, businessId: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  {businesses.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Documented Operational Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  placeholder="e.g. Investigating stock ledger discrepancy reported in Support Ticket #401..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Session Duration</label>
                <select
                  value={formData.durationMinutes}
                  onChange={(e) => setFormData({ ...formData, durationMinutes: Number(e.target.value) })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value={30}>30 Minutes</option>
                  <option value={60}>60 Minutes (Standard)</option>
                  <option value={120}>2 Hours</option>
                  <option value={240}>4 Hours (Maximum)</option>
                </select>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#101C35] text-white font-semibold rounded-xl text-xs hover:bg-[#1A2C50]"
              >
                {submitting ? 'Authorizing...' : 'Authorize Diagnostic Session'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
