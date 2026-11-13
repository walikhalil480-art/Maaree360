import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import { Database, ShieldCheck, HardDrive, RefreshCw, FileText, AlertCircle } from 'lucide-react'

interface BackupSnapshot {
  id: string
  filename: string
  sizeBytes: number
  sizeMb: number
  createdAt: string
  storageType: string
  cloudReplication: string
}

interface BackupData {
  snapshots: BackupSnapshot[]
  totalCount: number
  storageEngine: string
  backupDirectory: string
  cloudReplication: string
}

export default function PlatformBackupsPage() {
  const [data, setData] = useState<BackupData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchBackups = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch<{ success: boolean } & BackupData>('/api/v1/platform/backups')
      if (res.success) {
        setData(res)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to inspect local backup directory')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBackups()
  }, [])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Database Backups & Disaster Recovery</h1>
          <p className="text-sm text-slate-500 mt-1">
            PostgreSQL data durability, local snapshot directories, and disaster recovery commands.
          </p>
        </div>
        <button
          onClick={fetchBackups}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Scan Snapshot Directory
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
          <p>{error}</p>
          <button onClick={fetchBackups} className="text-xs text-rose-700 underline font-bold">
            Retry
          </button>
        </div>
      )}

      {/* Storage Architecture Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Database className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Target Engine</span>
          <p className="text-lg font-bold text-[#101C35] mt-1">{data?.storageEngine || 'PostgreSQL 16+'}</p>
          <p className="text-xs text-slate-500 mt-1">Relational multi-tenant isolation with foreign key cascades.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <HardDrive className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Local Storage Target</span>
          <p className="text-lg font-bold text-[#101C35] mt-1">Directory {data?.backupDirectory || './backups'}</p>
          <p className="text-xs text-slate-500 mt-1">Direct local disk persistence on host volume.</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-3">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <span className="text-xs font-semibold text-slate-400 uppercase">Off-Site Cloud Mirroring</span>
          <p className="text-lg font-bold text-[#101C35] mt-1">
            {data?.cloudReplication === 'CONFIGURED' ? 'Active S3 Archive' : 'Unconfigured (Local Only)'}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {data?.cloudReplication === 'CONFIGURED'
              ? 'Snapshots automatically replicated to Amazon S3.'
              : 'Requires AWS_S3_BUCKET credentials in server environment.'}
          </p>
        </div>
      </div>

      {/* Snapshot Inventory Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-bold text-[#101C35]">Local Snapshot Inventory</h3>
            <p className="text-xs text-slate-500">Live directory contents in {data?.backupDirectory || './backups'}</p>
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
            {data?.totalCount ?? 0} Snapshots
          </span>
        </div>

        {data && data.snapshots.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase">
                  <th className="pb-3">Filename</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Storage Type</th>
                  <th className="pb-3 text-right">Created Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.snapshots.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 font-semibold text-[#101C35] font-mono flex items-center gap-2">
                      <FileText className="w-4 h-4 text-slate-400" />
                      {s.filename}
                    </td>
                    <td className="py-3 text-slate-600 font-medium">{s.sizeMb} MB</td>
                    <td className="py-3 text-slate-600">{s.storageType}</td>
                    <td className="py-3 text-right text-slate-400">{new Date(s.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-slate-400 space-y-2">
            <AlertCircle className="w-6 h-6 mx-auto text-slate-300" />
            <p className="font-semibold text-slate-600">No snapshot dump files currently detected in ./backups</p>
            <p className="text-[11px] text-slate-400 max-w-md mx-auto">
              Automated pg_dump snapshots will populate this live inventory once executed or scheduled via cron.
            </p>
          </div>
        )}
      </div>

      {/* Recovery Instructions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-base font-bold text-[#101C35] mb-2">Manual Snapshot & Recovery CLI Commands</h3>
        <p className="text-xs text-slate-500 mb-4">
          Execute point-in-time snapshots or full schema restoration using PostgreSQL native utilities:
        </p>

        <div className="space-y-3 font-mono text-xs">
          <div className="p-3 bg-slate-900 text-emerald-400 rounded-xl overflow-x-auto">
            # Full database snapshot creation<br />
            pg_dump -U postgres -d smartstock_db -F c -b -v -f ./backups/smartstock_$(date +%Y%m%d_%H%M%S).dump
          </div>
          <div className="p-3 bg-slate-900 text-blue-300 rounded-xl overflow-x-auto">
            # Disaster restoration command<br />
            pg_restore -U postgres -d smartstock_db -v -c ./backups/smartstock_backup.dump
          </div>
        </div>
      </div>
    </div>
  )
}
