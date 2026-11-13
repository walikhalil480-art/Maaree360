import { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import {
  Search,
  Filter,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'

interface AuditLog {
  id: string
  actorId: string
  actorEmail: string
  actorRole: string
  action: string
  resourceType: string
  resourceId?: string | null
  businessId?: string | null
  ipAddress?: string | null
  userAgent?: string | null
  metadata?: any
  createdAt: string
}

export default function PlatformAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const fetchLogs = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '20')
      if (search) params.set('search', search)
      if (actionFilter) params.set('action', actionFilter)

      const res = await apiFetch<{
        success: boolean
        logs: AuditLog[]
        pagination: { totalPages: number }
      }>(`/api/v1/platform/audit-logs?${params.toString()}`)

      if (res.success) {
        setLogs(res.logs)
        setTotalPages(res.pagination.totalPages)
      }
    } catch (err: any) {
      console.error('Failed to fetch platform audit records:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLogs()
  }, [page, actionFilter])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Platform Audit Trail</h1>
          <p className="text-sm text-slate-500 mt-1">
            Immutable, tamper-evident historical ledger of all privileged administrative events.
          </p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Audit Trail
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search audit trail by actor, action name, or resource..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-[#12A878]/30"
          />
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs text-slate-500 shrink-0">
            <Filter className="w-3.5 h-3.5" />
            <span>Action Type:</span>
          </div>
          <select
            value={actionFilter}
            onChange={(e) => {
              setActionFilter(e.target.value)
              setPage(1)
            }}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-hidden"
          >
            <option value="">All Actions</option>
            <option value="business">Business Actions</option>
            <option value="plan">Plan Actions</option>
            <option value="admin">Admin Actions</option>
            <option value="support">Support Sessions</option>
            <option value="setting">Setting Changes</option>
          </select>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Role</th>
                <th className="px-5 py-3.5">Action Executed</th>
                <th className="px-5 py-3.5">Resource</th>
                <th className="px-5 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5 text-slate-500 whitespace-nowrap font-mono text-[11px]">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3.5 font-bold text-[#101C35]">
                    {log.actorEmail}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 uppercase">
                      {log.actorRole}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-[#101C35]">
                    <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {log.resourceType} {log.resourceId ? `(${log.resourceId.slice(0, 8)}...)` : ''}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      Inspect
                    </button>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No platform audit events matching criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>
            Page {page} of {Math.max(1, totalPages)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Modal: JSON Metadata Inspector */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-xl overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-[#101C35]">{selectedLog.action}</h3>
                <p className="text-xs text-slate-400">Audit ID: {selectedLog.id}</p>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Actor</span>
                  <p className="font-semibold text-slate-800">{selectedLog.actorEmail}</p>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] font-bold uppercase">IP Address</span>
                  <p className="font-mono text-slate-800">{selectedLog.ipAddress || '127.0.0.1'}</p>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                  Event Metadata Payload & Diffs
                </label>
                <pre className="p-3 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto max-h-60">
                  {JSON.stringify(selectedLog.metadata || {}, null, 2)}
                </pre>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs hover:bg-slate-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
