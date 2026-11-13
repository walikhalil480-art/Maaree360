import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import {
  Database,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  HardDrive,
  Cpu,
  MessageSquare,
} from 'lucide-react'

interface HealthData {
  status: 'healthy' | 'warning' | 'critical'
  timestamp: string
  services: {
    apiServer: {
      status: string
      uptimeSeconds: number
      nodeVersion: string
      platform: string
    }
    database: {
      engine: string
      status: string
      latencyMs: number
      connected: boolean
    }
    backgroundQueue?: {
      status: string
      engine: string
      message: string
    }
    storage?: {
      status: string
      engine: string
      cloudMirroring: string
      message: string
    }
    messagingGateway?: {
      status: string
      provider: string
      message: string
    }
  }
  systemResources: {
    memory: {
      rssMb: number
      heapTotalMb: number
      heapUsedMb: number
    }
    processUptimeSeconds: number
  }
  databaseMetrics: {
    tables: {
      businesses: number
      users: number
      products: number
      sales: number
      memberships: number
      activeSessions: number
      platformAuditLogs: number
    }
  }
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / (3600 * 24))
  const h = Math.floor((seconds % (3600 * 24)) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  if (m > 0) parts.push(`${m}m`)
  parts.push(`${s}s`)
  return parts.join(' ')
}

export default function PlatformSystemHealthPage() {
  const [data, setData] = useState<HealthData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchHealth = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch<{ success: boolean; health: HealthData }>('/api/v1/platform/health')
      if (res.success) {
        setData(res.health)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to ping platform health systems')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHealth()
    const timer = setInterval(fetchHealth, 30000)
    return () => clearInterval(timer)
  }, [])

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-2 border-[#101C35] border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-500 font-medium">Querying PostgreSQL and system telemetry...</p>
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
          onClick={fetchHealth}
          className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-semibold hover:bg-rose-700"
        >
          Retry
        </button>
      </div>
    )
  }

  const { services, systemResources, databaseMetrics, timestamp } = data!

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">System Health & Live Telemetry</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time PostgreSQL engine connectivity, process memory, and table record counts.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400">
            Last ping: {new Date(timestamp).toLocaleTimeString()}
          </span>
          <button
            onClick={fetchHealth}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Ping Now
          </button>
        </div>
      </div>

      {/* Core Operational Service Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* PostgreSQL Database Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#101C35] text-sm">PostgreSQL Relational Engine</h3>
                <p className="text-xs text-slate-400">Primary ACID multi-tenant relational store</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              {services.database.status.toUpperCase()}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400">Query Ping Latency</span>
              <p className="font-extrabold text-[#101C35] text-lg mt-0.5">
                {services.database.latencyMs} ms
              </p>
            </div>
            <div>
              <span className="text-slate-400">Connection State</span>
              <p className="font-bold text-emerald-600 text-sm mt-1">Ready / Active Pool</p>
            </div>
          </div>
        </div>

        {/* API Server Node.js Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Server className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-[#101C35] text-sm">Node.js Express API Server</h3>
                <p className="text-xs text-slate-400">Application worker process</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              ONLINE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-slate-100 text-xs">
            <div>
              <span className="text-slate-400">Process Uptime</span>
              <p className="font-extrabold text-[#101C35] text-sm mt-1">
                {formatUptime(services.apiServer.uptimeSeconds)}
              </p>
            </div>
            <div>
              <span className="text-slate-400">Node Runtime</span>
              <p className="font-mono text-slate-700 font-semibold text-xs mt-1">
                {services.apiServer.nodeVersion} ({services.apiServer.platform})
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Subsystem & Infrastructure Verification Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Background Queue Worker */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center">
              <Cpu className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 uppercase">
              {services.backgroundQueue?.status || 'UNCONFIGURED'}
            </span>
          </div>
          <h4 className="text-xs font-bold text-[#101C35]">Background Queue Worker</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {services.backgroundQueue?.message || 'Processing tasks synchronously in-process.'}
          </p>
        </div>

        {/* Storage Persistence */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <HardDrive className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 uppercase">
              {services.storage?.status || 'LOCAL_ONLY'}
            </span>
          </div>
          <h4 className="text-xs font-bold text-[#101C35]">{services.storage?.engine || 'Local Storage'}</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {services.storage?.message || 'Host NVMe local filesystem active.'}
          </p>
        </div>

        {/* Messaging Gateway */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                services.messagingGateway?.status === 'CONFIGURED'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-amber-50 text-amber-700'
              }`}
            >
              {services.messagingGateway?.status || 'UNCONFIGURED'}
            </span>
          </div>
          <h4 className="text-xs font-bold text-[#101C35]">{services.messagingGateway?.provider || 'SMS Gateway'}</h4>
          <p className="text-[11px] text-slate-500 mt-1">
            {services.messagingGateway?.message || 'Pending SMS gateway configuration.'}
          </p>
        </div>
      </div>

      {/* Memory & System Resource Usage */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-base font-bold text-[#101C35] mb-4">Process Memory Footprint</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">RSS (Resident Set)</span>
            <p className="text-xl font-bold text-[#101C35] mt-1">{systemResources.memory.rssMb} MB</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Total allocated memory</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Heap Total</span>
            <p className="text-xl font-bold text-[#101C35] mt-1">{systemResources.memory.heapTotalMb} MB</p>
            <p className="text-[11px] text-slate-400 mt-0.5">V8 heap capacity</p>
          </div>
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
            <span className="text-xs font-bold text-slate-500 uppercase">Heap Used</span>
            <p className="text-xl font-bold text-emerald-700 mt-1">{systemResources.memory.heapUsedMb} MB</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Active memory consumption</p>
          </div>
        </div>
      </div>

      {/* Real Database Table Row Counters */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-base font-bold text-[#101C35] mb-1">Live Database Record Telemetry</h3>
        <p className="text-xs text-slate-500 mb-4">Actual row counts across core tenant and platform tables</p>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {Object.entries(databaseMetrics.tables).map(([table, count]) => (
            <div key={table} className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block truncate">
                {table}
              </span>
              <p className="text-lg font-extrabold text-[#101C35] mt-1">{count}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
