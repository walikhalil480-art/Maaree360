import { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import { CheckCircle2, Save } from 'lucide-react'

export default function PlatformFeaturesPage() {
  const [settings, setSettings] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const fetchFeatures = async () => {
    try {
      const res = await apiFetch<{ success: boolean; settings: any }>('/api/v1/platform/settings')
      if (res.success) {
        setSettings(res.settings)
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchFeatures()
  }, [])

  const handleToggle = (key: string) => {
    if (!settings?.features) return
    setSettings({
      ...settings,
      features: {
        ...settings.features,
        [key]: !settings.features[key],
      },
    })
    setSavedSuccess(false)
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      const res = await apiFetch<{ success: boolean; settings: any }>('/api/v1/platform/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          features: settings.features,
        }),
      })
      if (res.success) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update feature flags')
    } finally {
      setSaving(false)
    }
  }

  const features = settings?.features || {}

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Feature Management & Capabilities</h1>
          <p className="text-sm text-slate-500 mt-1">
            Control global feature availability and subsystem toggles across the MAAREE 360 platform.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 px-4 py-2 bg-[#12A878] text-white text-xs font-semibold rounded-xl hover:bg-[#0E8A62] transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Changes...' : 'Save Feature Matrix'}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Feature flags successfully updated and synchronized across all business tiers.
        </div>
      )}

      {/* Feature Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          {
            key: 'mpesaIntegration',
            title: 'M-Pesa Express & Split Payments',
            desc: 'Allows cashiers to initiate STK pushes and record split mobile money tenders.',
          },
          {
            key: 'hardwareIntegration',
            title: 'Thermal Printers & Barcode Scanners',
            desc: 'WebUSB/serial receipt printing and hardware scanner event listening.',
          },
          {
            key: 'aiAssistant',
            title: 'AI Business Advisor & Stock Insights',
            desc: 'Natural language inventory forecasting and catalog insights powered by Gemini.',
          },
          {
            key: 'smsAlerts',
            title: 'SMS Stock Alert Notifications',
            desc: 'Automated SMS dispatches to store owners on critical low-stock threshold triggers.',
          },
          {
            key: 'multiBranch',
            title: 'Multi-Branch & Warehouse Routing',
            desc: 'Enables retail chains to manage stock transfers across branch locations.',
          },
          {
            key: 'offlinePos',
            title: 'Offline POS Resiliency',
            desc: 'Local browser caching of products and queues for offline network drops.',
          },
        ].map((feat) => {
          const enabled = Boolean(features[feat.key])
          return (
            <div
              key={feat.key}
              className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex items-center justify-between"
            >
              <div className="pr-4">
                <h3 className="text-sm font-bold text-[#101C35]">{feat.title}</h3>
                <p className="text-xs text-slate-500 mt-1">{feat.desc}</p>
              </div>
              <button
                type="button"
                onClick={() => handleToggle(feat.key)}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ease-in-out shrink-0 ${
                  enabled ? 'bg-[#12A878]' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ease-in-out ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
