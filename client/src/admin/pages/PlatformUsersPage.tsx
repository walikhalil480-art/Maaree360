import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import {
  Plus,
  Shield,
  KeyRound,
  CheckCircle2,
  XCircle,
  X,
  Search,
  Filter,
  RefreshCw,
  Users,
  Building2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface AdminUser {
  id: string
  userId: string
  name: string
  email: string
  phone?: string | null
  role: string
  customPermissions: string[]
  isActive: boolean
  mfaEnabled: boolean
  lastLoginAt?: string | null
  createdAt: string
}

interface TenantUser {
  id: string
  name: string
  email: string
  phone?: string | null
  createdAt: string
  isPlatformAdmin: boolean
  platformRole?: string | null
  hasActiveSession: boolean
  memberships: Array<{
    businessId: string
    businessName: string
    businessSlug: string
    role: string
    isActive: boolean
  }>
}

export default function PlatformUsersPage() {
  const [activeTab, setActiveTab] = useState<'ADMINS' | 'TENANTS'>('ADMINS')

  // Admins state
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loadingAdmins, setLoadingAdmins] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'SUPER_ADMIN',
    password: '',
  })
  const [submitting, setSubmitting] = useState(false)

  // Tenant users state
  const [tenantUsers, setTenantUsers] = useState<TenantUser[]>([])
  const [loadingTenants, setLoadingTenants] = useState(false)
  const [tenantSearch, setTenantSearch] = useState('')
  const [tenantRole, setTenantRole] = useState('')
  const [tenantPage, setTenantPage] = useState(1)
  const [totalTenantPages, setTotalTenantPages] = useState(1)
  const [totalTenantCount, setTotalTenantCount] = useState(0)

  const fetchAdmins = async () => {
    try {
      setLoadingAdmins(true)
      const res = await apiFetch<{ success: boolean; admins: AdminUser[] }>('/api/v1/platform/users')
      if (res.success) {
        setAdmins(res.admins)
      }
    } catch (err: any) {
      console.error('Failed to load platform administrators:', err)
    } finally {
      setLoadingAdmins(false)
    }
  }

  const fetchTenantUsers = async () => {
    try {
      setLoadingTenants(true)
      const params = new URLSearchParams()
      params.set('page', String(tenantPage))
      params.set('limit', '20')
      if (tenantSearch) params.set('search', tenantSearch)
      if (tenantRole) params.set('role', tenantRole)

      const res = await apiFetch<{
        success: boolean
        users: TenantUser[]
        pagination: { total: number; totalPages: number }
      }>(`/api/v1/platform/tenant-users?${params.toString()}`)

      if (res.success) {
        setTenantUsers(res.users)
        setTotalTenantPages(res.pagination.totalPages)
        setTotalTenantCount(res.pagination.total)
      }
    } catch (err: any) {
      console.error('Failed to load tenant users:', err)
    } finally {
      setLoadingTenants(false)
    }
  }

  useEffect(() => {
    fetchAdmins()
  }, [])

  useEffect(() => {
    if (activeTab === 'TENANTS') {
      fetchTenantUsers()
    }
  }, [activeTab, tenantPage, tenantRole])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setTenantPage(1)
    fetchTenantUsers()
  }

  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      const res = await apiFetch<{ success: boolean; admin: AdminUser }>('/api/v1/platform/users', {
        method: 'POST',
        body: JSON.stringify(formData),
      })
      if (res.success) {
        setShowCreateModal(false)
        setFormData({ name: '', email: '', role: 'SUPER_ADMIN', password: '' })
        fetchAdmins()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to create platform administrator')
    } finally {
      setSubmitting(false)
    }
  }

  const handleRevokeSessions = async (adminId: string, email: string) => {
    if (!confirm(`Are you sure you want to revoke all active sessions for ${email}?`)) return
    try {
      const res = await apiFetch<{ success: boolean; revokedCount: number }>(
        `/api/v1/platform/users/${adminId}/revoke-sessions`,
        { method: 'POST' }
      )
      if (res.success) {
        alert(`Successfully terminated ${res.revokedCount} active sessions.`)
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to revoke sessions')
    }
  }

  const handleToggleActive = async (admin: AdminUser) => {
    const actionName = admin.isActive ? 'deactivate' : 'reactivate'
    if (!confirm(`Are you sure you want to ${actionName} administrator ${admin.email}?`)) return

    try {
      const res = await apiFetch<{ success: boolean; admin: AdminUser }>(
        `/api/v1/platform/users/${admin.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({ isActive: !admin.isActive }),
        }
      )
      if (res.success) {
        fetchAdmins()
      }
    } catch (err: any) {
      alert(err?.message || `Failed to ${actionName} administrator`)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Platform Users & Directory</h1>
          <p className="text-sm text-slate-500 mt-1">
            Privileged platform administrators and multi-tenant business staff accounts across all registered stores.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeTab === 'ADMINS' && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#12A878] text-white text-xs font-semibold rounded-xl hover:bg-[#0E8A62] transition-colors shadow-2xs"
            >
              <Plus className="w-4 h-4" />
              Add Administrator
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('ADMINS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'ADMINS'
              ? 'border-[#12A878] text-[#101C35]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Shield className="w-4 h-4" />
          Platform Administrators ({admins.length})
        </button>
        <button
          onClick={() => setActiveTab('TENANTS')}
          className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
            activeTab === 'TENANTS'
              ? 'border-[#12A878] text-[#101C35]'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Tenant Business Accounts {totalTenantCount > 0 ? `(${totalTenantCount})` : ''}
        </button>
      </div>

      {/* TAB 1: Platform Administrators */}
      {activeTab === 'ADMINS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                  <th className="px-5 py-3.5">Administrator</th>
                  <th className="px-5 py-3.5">Platform Role</th>
                  <th className="px-5 py-3.5">MFA Status</th>
                  <th className="px-5 py-3.5">Account State</th>
                  <th className="px-5 py-3.5">Created Date</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {admins.map((adm) => (
                  <tr key={adm.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-bold text-[#101C35]">{adm.name}</p>
                      <p className="text-[11px] text-slate-400 font-mono">{adm.email}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          adm.role === 'PLATFORM_OWNER'
                            ? 'bg-amber-50 text-amber-800 border border-amber-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        <Shield className="w-3 h-3" />
                        {adm.role.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          adm.mfaEnabled
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {adm.mfaEnabled ? 'Enforced' : 'Optional'}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                          adm.isActive
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {adm.isActive ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <XCircle className="w-3 h-3 text-rose-500" />}
                        {adm.isActive ? 'Active' : 'Suspended'}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      {new Date(adm.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleRevokeSessions(adm.id, adm.email)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          title="Revoke all active sessions"
                        >
                          <KeyRound className="w-3 h-3 text-slate-500" />
                          Revoke Sessions
                        </button>
                        {adm.role !== 'PLATFORM_OWNER' && (
                          <button
                            onClick={() => handleToggleActive(adm)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                              adm.isActive
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                          >
                            {adm.isActive ? 'Suspend' : 'Reactivate'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {admins.length === 0 && !loadingAdmins && (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No platform administrators found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Tenant Business Users */}
      {activeTab === 'TENANTS' && (
        <div className="space-y-4">
          {/* Search and Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
            <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                placeholder="Search tenant users by name, email, or phone..."
                className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#12A878]/30"
              />
            </form>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
                <Filter className="w-3.5 h-3.5" />
                <span>Role:</span>
              </div>
              <select
                value={tenantRole}
                onChange={(e) => {
                  setTenantRole(e.target.value)
                  setTenantPage(1)
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
              >
                <option value="">All Roles</option>
                <option value="OWNER">Owner</option>
                <option value="MANAGER">Manager</option>
                <option value="CASHIER">Cashier</option>
              </select>
              <button
                onClick={fetchTenantUsers}
                className="p-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
                title="Refresh Tenant Users"
              >
                <RefreshCw className={`w-4 h-4 ${loadingTenants ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Directory Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                    <th className="px-5 py-3.5">User</th>
                    <th className="px-5 py-3.5">Assigned Businesses & Roles</th>
                    <th className="px-5 py-3.5 text-center">Session State</th>
                    <th className="px-5 py-3.5 text-right">Registered</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {tenantUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-[#101C35]">{u.name}</p>
                        <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                        {u.phone && <p className="text-[10px] text-slate-400">{u.phone}</p>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {u.memberships.map((m) => (
                            <span
                              key={m.businessId}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200"
                            >
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <strong className="text-[#101C35]">{m.businessName}</strong>
                              <span className="text-[10px] uppercase font-bold text-emerald-700 ml-0.5">
                                ({m.role})
                              </span>
                            </span>
                          ))}
                          {u.isPlatformAdmin && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                              <Shield className="w-3 h-3" />
                              {u.platformRole || 'ADMIN'}
                            </span>
                          )}
                          {u.memberships.length === 0 && !u.isPlatformAdmin && (
                            <span className="text-slate-400 italic">No business memberships</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            u.hasActiveSession
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          {u.hasActiveSession ? 'Active Session' : 'Offline'}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-400">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {tenantUsers.length === 0 && !loadingTenants && (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-slate-400">
                        No tenant users matching criteria found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span>
                Page {tenantPage} of {Math.max(1, totalTenantPages)} ({totalTenantCount} total users)
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTenantPage((p) => Math.max(1, p - 1))}
                  disabled={tenantPage <= 1}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setTenantPage((p) => Math.min(totalTenantPages, p + 1))}
                  disabled={tenantPage >= totalTenantPages}
                  className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Administrator */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateAdmin}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101C35]">Add Platform Administrator</h3>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. John Kamau"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Admin Email *</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="admin@maaree360.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Platform Role</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                >
                  <option value="SUPER_ADMIN">SUPER_ADMIN (Full Platform Operations)</option>
                  <option value="TECHNICAL_ADMIN">TECHNICAL_ADMIN (Diagnostics & Health)</option>
                  <option value="SUPPORT_ADMIN">SUPPORT_ADMIN (Customer Diagnostics)</option>
                  <option value="BILLING_ADMIN">BILLING_ADMIN (Subscription Tiers)</option>
                  <option value="SECURITY_AUDITOR">SECURITY_AUDITOR (Read-Only Audit Trail)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Temporary Initial Password</label>
                <input
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Leave blank for auto-generated secure token"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#12A878] text-white font-semibold rounded-xl text-xs hover:bg-[#0E8A62]"
              >
                {submitting ? 'Creating...' : 'Grant Admin Privileges'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
