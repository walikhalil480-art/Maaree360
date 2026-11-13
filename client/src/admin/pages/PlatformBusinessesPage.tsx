import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import {
  Building2,
  Search,
  Filter,
  Plus,
  CheckCircle2,
  XCircle,
  ShieldAlert,
  X,
  RefreshCw,
  ShoppingBag,
  Users,
  Store,
} from 'lucide-react'

interface BusinessItem {
  id: string
  name: string
  slug: string
  status: 'ACTIVE' | 'TRIAL' | 'SUSPENDED' | 'DEACTIVATED'
  suspensionReason?: string | null
  deactivationReason?: string | null
  currency: string
  timezone: string
  phone?: string | null
  email?: string | null
  createdAt: string
  owner: {
    id: string
    name: string
    email: string
    phone?: string | null
  } | null
  counts: {
    users: number
    products: number
    sales: number
    registers: number
  }
  subscription?: {
    id: string
    status: string
    planName: string
    planCode: string
    billingInterval: string
    currentPeriodEnd: string
  } | null
}

export default function PlatformBusinessesPage() {
  const [businesses, setBusinesses] = useState<BusinessItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedBusiness, setSelectedBusiness] = useState<BusinessItem | null>(null)
  const [statusModalBusiness, setStatusModalBusiness] = useState<BusinessItem | null>(null)
  const [newStatus, setNewStatus] = useState<'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED'>('SUSPENDED')
  const [statusReason, setStatusReason] = useState('')
  const [submittingStatus, setSubmittingStatus] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newBizData, setNewBizData] = useState({
    name: '',
    ownerEmail: '',
    ownerName: '',
    currency: 'KES',
    planCode: 'starter',
  })
  const [creatingBiz, setCreatingBiz] = useState(false)

  const fetchBusinesses = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const url = `/api/v1/platform/businesses${params.toString() ? `?${params.toString()}` : ''}`
      const res = await apiFetch<{ success: boolean; businesses: BusinessItem[] }>(url)
      if (res.success) {
        setBusinesses(res.businesses)
      }
    } catch (err: any) {
      console.error('Failed to load businesses:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBusinesses()
  }, [statusFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchBusinesses()
  }

  const handleStatusChangeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!statusModalBusiness) return
    if (!statusReason.trim()) {
      alert('A documented reason is mandatory to alter account status.')
      return
    }

    try {
      setSubmittingStatus(true)
      const res = await apiFetch<{ success: boolean; business: any }>(
        `/api/v1/platform/businesses/${statusModalBusiness.id}/status`,
        {
          method: 'POST',
          body: JSON.stringify({
            status: newStatus,
            reason: statusReason.trim(),
          }),
        }
      )

      if (res.success) {
        setStatusModalBusiness(null)
        setStatusReason('')
        fetchBusinesses()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update business status')
    } finally {
      setSubmittingStatus(false)
    }
  }

  const handleCreateBusinessSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newBizData.name.trim()) return

    try {
      setCreatingBiz(true)
      const res = await apiFetch<{ success: boolean; business: any }>('/api/v1/platform/businesses', {
        method: 'POST',
        body: JSON.stringify(newBizData),
      })
      if (res.success) {
        setShowCreateModal(false)
        setNewBizData({ name: '', ownerEmail: '', ownerName: '', currency: 'KES', planCode: 'starter' })
        fetchBusinesses()
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to create business')
    } finally {
      setCreatingBiz(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Business Directory & Accounts</h1>
          <p className="text-sm text-slate-500 mt-1">
            Tenant provisioning, status lifecycle management, and account governance.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#12A878] text-white text-xs font-semibold rounded-xl hover:bg-[#0E8A62] transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Provision Business
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by business name, slug, email, or phone..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#12A878]/30 focus:border-[#12A878]"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Status:</span>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="TRIAL">Trial</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <button
            onClick={fetchBusinesses}
            className="p-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors"
            title="Refresh Directory"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Directory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Business Name</th>
                <th className="px-5 py-3.5">Account Owner</th>
                <th className="px-5 py-3.5">Plan & Billing</th>
                <th className="px-5 py-3.5 text-center">Catalog & POS</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {businesses.map((biz) => (
                <tr key={biz.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-bold text-[#101C35] text-sm">{biz.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">/{biz.slug}</p>
                  </td>
                  <td className="px-5 py-4">
                    {biz.owner ? (
                      <div>
                        <p className="font-semibold text-slate-800">{biz.owner.name}</p>
                        <p className="text-[11px] text-slate-400">{biz.owner.email}</p>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">No Owner Assigned</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {biz.subscription ? (
                      <div>
                        <span className="font-semibold text-[#101C35]">{biz.subscription.planName}</span>
                        <p className="text-[11px] text-slate-400">
                          {biz.subscription.billingInterval} • Exp {new Date(biz.subscription.currentPeriodEnd).toLocaleDateString()}
                        </p>
                      </div>
                    ) : (
                      <span className="text-amber-600 font-medium">No Subscription</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-center">
                    <div className="inline-flex items-center gap-3 text-slate-500">
                      <span title="Total Registers / Branches" className="flex items-center gap-1">
                        <Store className="w-3.5 h-3.5 text-slate-400" />
                        {biz.counts.registers || 1}
                      </span>
                      <span title="Total Products" className="flex items-center gap-1">
                        <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                        {biz.counts.products}
                      </span>
                      <span title="Staff Members" className="flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        {biz.counts.users}
                      </span>
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        biz.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : biz.status === 'SUSPENDED'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {biz.status === 'ACTIVE' && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                      {biz.status === 'SUSPENDED' && <XCircle className="w-3 h-3 text-rose-500" />}
                      {biz.status}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedBusiness(biz)}
                        className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold transition-colors"
                      >
                        Profile
                      </button>
                      <button
                        onClick={() => {
                          setStatusModalBusiness(biz)
                          setNewStatus(biz.status === 'SUSPENDED' ? 'ACTIVE' : 'SUSPENDED')
                          setStatusReason('')
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          biz.status === 'SUSPENDED'
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
                        }`}
                      >
                        {biz.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {businesses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No businesses matching criteria found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Business Profile Detail */}
      {selectedBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#101C35]">{selectedBusiness.name}</h3>
                <p className="text-xs text-slate-400 font-mono">ID: {selectedBusiness.id}</p>
              </div>
              <button
                onClick={() => setSelectedBusiness(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Account Status</span>
                  <p className="font-bold text-[#101C35] mt-0.5">{selectedBusiness.status}</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Currency & TZ</span>
                  <p className="font-bold text-[#101C35] mt-0.5">{selectedBusiness.currency} ({selectedBusiness.timezone})</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Catalog Items</span>
                  <p className="font-bold text-[#101C35] mt-0.5">{selectedBusiness.counts.products} records</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Staff Members</span>
                  <p className="font-bold text-[#101C35] mt-0.5">{selectedBusiness.counts.users} members</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Registers / Terminals</span>
                  <p className="font-bold text-[#101C35] mt-0.5">{selectedBusiness.counts.registers || 1} units</p>
                </div>
                <div>
                  <span className="text-slate-400 uppercase text-[10px] font-bold">Sales Transactions</span>
                  <p className="font-bold text-[#101C35] mt-0.5">{selectedBusiness.counts.sales} recorded</p>
                </div>
              </div>

              {selectedBusiness.suspensionReason && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-800">
                  <p className="font-bold text-[11px]">Suspension Notice:</p>
                  <p className="mt-0.5">{selectedBusiness.suspensionReason}</p>
                </div>
              )}

              <div>
                <h4 className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-2">Assigned Owner</h4>
                <div className="p-3 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <p className="font-bold text-[#101C35]">{selectedBusiness.owner?.name || 'Unassigned'}</p>
                    <p className="text-slate-500">{selectedBusiness.owner?.email || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedBusiness(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Status Change (Suspension / Reactivation) */}
      {statusModalBusiness && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleStatusChangeSubmit}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-bold text-[#101C35]">Update Business Status</h3>
              </div>
              <button
                type="button"
                onClick={() => setStatusModalBusiness(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <p className="text-slate-600">
                Changing status for <strong className="text-[#101C35]">{statusModalBusiness.name}</strong>. Suspension
                immediately prohibits staff members from accessing POS, sales, and catalog write operations. All data
                is preserved safely.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Target Account Status</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800"
                >
                  <option value="ACTIVE">ACTIVE (Operational)</option>
                  <option value="SUSPENDED">SUSPENDED (Locked for Policy / Payment)</option>
                  <option value="DEACTIVATED">DEACTIVATED (Account Closed)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Documented Operational Reason <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={statusReason}
                  onChange={(e) => setStatusReason(e.target.value)}
                  placeholder="State the exact administrative reason for this status change (recorded in Platform Audit Log)..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-[#12A878]/30"
                />
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setStatusModalBusiness(null)}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingStatus}
                className="px-4 py-2 bg-[#101C35] text-white font-semibold rounded-xl text-xs hover:bg-[#1A2C50] transition-colors"
              >
                {submittingStatus ? 'Updating...' : 'Confirm Status Change'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Provision New Business */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateBusinessSubmit}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-[#12A878]" />
                <h3 className="text-base font-bold text-[#101C35]">Provision Tenant Business</h3>
              </div>
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
                <label className="block font-semibold text-slate-700 mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={newBizData.name}
                  onChange={(e) => setNewBizData({ ...newBizData, name: e.target.value })}
                  placeholder="e.g. Apex Supermarket"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Email</label>
                <input
                  type="email"
                  value={newBizData.ownerEmail}
                  onChange={(e) => setNewBizData({ ...newBizData, ownerEmail: e.target.value })}
                  placeholder="owner@company.com"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Owner Full Name</label>
                <input
                  type="text"
                  value={newBizData.ownerName}
                  onChange={(e) => setNewBizData({ ...newBizData, ownerName: e.target.value })}
                  placeholder="Jane Doe"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Currency</label>
                  <select
                    value={newBizData.currency}
                    onChange={(e) => setNewBizData({ ...newBizData, currency: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="KES">KES</option>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Subscription Plan</label>
                  <select
                    value={newBizData.planCode}
                    onChange={(e) => setNewBizData({ ...newBizData, planCode: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  >
                    <option value="trial">Free Trial</option>
                    <option value="starter">Starter</option>
                    <option value="professional">Professional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
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
                disabled={creatingBiz}
                className="px-4 py-2 bg-[#12A878] text-white font-semibold rounded-xl text-xs hover:bg-[#0E8A62]"
              >
                {creatingBiz ? 'Provisioning...' : 'Create Business'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
