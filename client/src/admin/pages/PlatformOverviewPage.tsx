import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiFetch } from '../../api/client'
import {
  Building2,
  Users,
  CreditCard,
  ArrowUpRight,
  TrendingUp,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react'

interface OverviewData {
  metrics: {
    businesses: {
      total: number
      active: number
      trial: number
      suspended: number
      deactivated?: number
    }
    users: {
      total: number
      platformAdmins: number
      owners?: number
      managers?: number
      cashiers?: number
      activeSessionUsers?: number
    }
    subscriptions: {
      active: number
      trial?: number
      expired: number
      cancelled?: number
      pastDue?: number
      upcomingRenewals?: number
      mrr: number
      currency?: string
    }
  }
  planDistribution: Array<{
    id: string
    code: string
    name: string
    subscriberCount: number
    priceMonthly: number
  }>
  recentBusinesses: Array<{
    id: string
    name: string
    slug: string
    status: string
    createdAt: string
    userCount: number
    productCount: number
    salesCount: number
    branchCount?: number
    ownerName?: string
    planName: string
  }>
  recentAuditLogs: Array<{
    id: string
    action: string
    actorEmail: string
    actorRole: string
    resourceType: string
    createdAt: string
  }>
}

export default function PlatformOverviewPage() {
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchOverview = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch<{ success: boolean; data: OverviewData }>('/api/v1/platform/overview')
      if (res.success) {
        setData(res.data)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load platform overview metrics')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOverview()
  }, [])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-2 border-[#101C35] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Loading platform telemetry and metrics...</p>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
          <p className="text-sm font-semibold">{error}</p>
        </div>
        <button
          onClick={fetchOverview}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700 transition-colors"
        >
          Retry
        </button>
      </div>
    )
  }

  const { metrics, planDistribution, recentBusinesses, recentAuditLogs } = data!

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Platform Command Centre</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global governance, business telemetry, and operational health for MAAREE 360.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchOverview}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <Link
            to="/admin/businesses"
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#101C35] text-white text-xs font-semibold rounded-xl hover:bg-[#1A2C50] transition-colors shadow-2xs"
          >
            <Building2 className="w-3.5 h-3.5" />
            Manage Businesses
          </Link>
        </div>
      </div>

      {/* Top Telemetry KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Businesses */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Registered Businesses</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101C35]">{metrics.businesses.total}</span>
            <span className="text-xs text-emerald-600 font-semibold">{metrics.businesses.active} Active</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>{metrics.businesses.trial} Trial</span>
            <span className="text-rose-600 font-medium">{metrics.businesses.suspended} Suspended</span>
            <span className="text-slate-400 font-medium">{metrics.businesses.deactivated || 0} Closed</span>
          </div>
        </div>

        {/* Registered Users */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Users</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101C35]">{metrics.users.total}</span>
            <span className="text-xs text-emerald-600 font-semibold">
              {metrics.users.activeSessionUsers ?? 0} Live Sessions
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span title="Business Owners">{metrics.users.owners ?? 0} Owners</span>
            <span title="Managers">{metrics.users.managers ?? 0} Mgr</span>
            <span title="Cashiers">{metrics.users.cashiers ?? 0} Cashiers</span>
            <span title="Platform Administrators" className="font-semibold text-[#101C35]">
              {metrics.users.platformAdmins} Admins
            </span>
          </div>
        </div>

        {/* Active Subscriptions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Subscriptions</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101C35]">{metrics.subscriptions.active}</span>
            <span className="text-xs text-slate-500">Active Paid Plans</span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Renewals (30d): <strong className="text-slate-700">{metrics.subscriptions.upcomingRenewals || 0}</strong></span>
            <span className="text-amber-600 font-medium">Expired: {metrics.subscriptions.expired}</span>
          </div>
        </div>

        {/* Real Monthly Recurring Revenue */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated MRR</span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#101C35]">
              {metrics.subscriptions.currency || 'KES'} {metrics.subscriptions.mrr.toLocaleString()}
            </span>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
            <span>Active Paid Plans Only</span>
            <span className="text-emerald-600 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized
            </span>
          </div>
        </div>
      </div>

      {/* Subscription Tier Distribution */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-[#101C35]">Subscription Tier Breakdown</h2>
            <p className="text-xs text-slate-500">Distribution of customer businesses across active plans</p>
          </div>
          <Link
            to="/admin/subscriptions"
            className="text-xs font-semibold text-[#12A878] hover:underline flex items-center gap-1"
          >
            Manage Plans <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          {planDistribution.map((plan) => (
            <div key={plan.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#101C35]">{plan.name}</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase">
                  {plan.code}
                </span>
              </div>
              <p className="text-xl font-bold text-[#101C35] mt-2">{plan.subscriberCount}</p>
              <p className="text-[11px] text-slate-500 mt-0.5">
                KES {plan.priceMonthly.toLocaleString()}/month
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Two Column Layout: Recent Businesses & Recent Audit Log */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Businesses Table */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#101C35]">Recent Businesses</h2>
                <p className="text-xs text-slate-500">Newly registered retail stores and companies</p>
              </div>
              <Link
                to="/admin/businesses"
                className="text-xs font-semibold text-[#12A878] hover:underline flex items-center gap-1"
              >
                View All <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                    <th className="pb-3">Business</th>
                    <th className="pb-3">Owner</th>
                    <th className="pb-3">Plan</th>
                    <th className="pb-3">Inventory</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 text-right">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentBusinesses.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 font-semibold text-[#101C35]">
                        <Link
                          to={`/admin/businesses?search=${encodeURIComponent(b.name)}`}
                          className="hover:text-[#12A878] transition-colors"
                        >
                          {b.name}
                        </Link>
                      </td>
                      <td className="py-3 text-slate-600 font-medium">{b.ownerName || 'Unassigned'}</td>
                      <td className="py-3 text-slate-600">{b.planName}</td>
                      <td className="py-3 text-slate-600">
                        {b.productCount} items • {b.branchCount || 1} reg
                      </td>
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            b.status === 'ACTIVE'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : b.status === 'SUSPENDED'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                      <td className="py-3 text-right text-slate-400">
                        {new Date(b.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                  {recentBusinesses.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No registered businesses yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Platform Audit Feed */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-[#101C35]">Platform Audit Feed</h2>
                <p className="text-xs text-slate-500">Immutable record of administrative actions</p>
              </div>
              <Link
                to="/admin/audit-logs"
                className="text-xs font-semibold text-[#12A878] hover:underline flex items-center gap-1"
              >
                Logs <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="space-y-3.5 mt-2">
              {recentAuditLogs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 text-xs pb-3 border-b border-slate-100 last:border-0 last:pb-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-[#101C35] flex items-center justify-center shrink-0 mt-0.5">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#101C35] truncate">{log.action}</p>
                    <p className="text-[11px] text-slate-500 truncate">{log.actorEmail}</p>
                    <span className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(log.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
              {recentAuditLogs.length === 0 && (
                <p className="py-6 text-center text-slate-400 text-xs">No platform audit records yet.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
