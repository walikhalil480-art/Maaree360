import { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import {
  Smartphone,
  MessageSquare,
  HardDrive,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
} from 'lucide-react'

interface IntegrationItem {
  id: string
  name: string
  category: string
  type: string
  status: 'CONFIGURED' | 'UNCONFIGURED'
  statusText: string
  description: string
  requiredKeys: string[]
  configuredKeys: string[]
}

const ICON_MAP: Record<string, any> = {
  mpesa: Smartphone,
  gemini: Sparkles,
  sms: MessageSquare,
  s3: HardDrive,
}

export default function PlatformIntegrationsPage() {
  const [integrations, setIntegrations] = useState<IntegrationItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchIntegrations = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiFetch<{ success: boolean; integrations: IntegrationItem[] }>(
        '/api/v1/platform/integrations'
      )
      if (res.success) {
        setIntegrations(res.integrations)
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to inspect server environment integrations')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchIntegrations()
  }, [])

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Platform Integrations & Subsystems</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time inspection of server environment credentials, mobile money APIs, AI keys, and storage rails.
          </p>
        </div>
        <button
          onClick={fetchIntegrations}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Verify Credentials
        </button>
      </div>

      {error && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center justify-between">
          <p>{error}</p>
          <button onClick={fetchIntegrations} className="text-xs text-rose-700 underline font-bold">
            Retry
          </button>
        </div>
      )}

      {loading && integrations.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 space-y-4">
          <div className="w-8 h-8 border-2 border-[#101C35] border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500 font-medium">Inspecting environment variables and gateways...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {integrations.map((item) => {
            const Icon = ICON_MAP[item.id] || Sparkles
            const isConfigured = item.status === 'CONFIGURED'

            return (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="w-10 h-10 rounded-xl bg-slate-50 text-[#101C35] border border-slate-100 flex items-center justify-center">
                      <Icon className="w-5 h-5 text-[#12A878]" />
                    </div>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        isConfigured
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {isConfigured ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                      ) : (
                        <AlertCircle className="w-3 h-3 text-amber-500" />
                      )}
                      {isConfigured ? 'Active & Ready' : 'Setup Required'}
                    </span>
                  </div>

                  <h3 className="font-bold text-[#101C35] text-base mt-4">{item.name}</h3>
                  <p className="text-xs text-slate-400 font-medium">{item.type}</p>
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed">{item.description}</p>

                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                      <Key className="w-3.5 h-3.5 text-slate-400" />
                      <span>Required Configuration:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {item.requiredKeys.map((k) => {
                        const hasKey = item.configuredKeys.includes(k)
                        return (
                          <span
                            key={k}
                            className={`text-[10px] font-mono px-2 py-0.5 rounded-md border ${
                              hasKey
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            {k}: {hasKey ? 'SET' : 'MISSING'}
                          </span>
                        )
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 text-[11px] font-medium">{item.statusText}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
