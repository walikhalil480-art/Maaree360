import { useState, useEffect } from 'react'
import { apiFetch } from '../../api/client'
import { Save, CheckCircle2 } from 'lucide-react'

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<any>({
    platformName: 'MAAREE 360',
    supportEmail: 'support@maaree360.com',
    maintenanceMode: false,
    allowSelfRegistration: true,
    defaultCurrency: 'KES',
    sessionTtlDays: 7,
  })
  const [saving, setSaving] = useState(false)
  const [savedSuccess, setSavedSuccess] = useState(false)

  const fetchSettings = async () => {
    try {
      const res = await apiFetch<{ success: boolean; settings: any }>('/api/v1/platform/settings')
      if (res.success && res.settings) {
        setSettings(res.settings)
      }
    } catch {
      // Ignore
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSaving(true)
      const res = await apiFetch<{ success: boolean; settings: any }>('/api/v1/platform/settings', {
        method: 'PATCH',
        body: JSON.stringify(settings),
      })
      if (res.success) {
        setSavedSuccess(true)
        setTimeout(() => setSavedSuccess(false), 3000)
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to update platform settings')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Platform Configuration & Branding</h1>
          <p className="text-sm text-slate-500 mt-1">
            Global system metadata, maintenance controls, and default regional preferences.
          </p>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Platform configuration successfully saved and written to the Platform Audit Log.
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        {/* Core Identity Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-[#101C35] border-b border-slate-100 pb-3">
            Platform Brand & Communication
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Platform Brand Name</label>
              <input
                type="text"
                value={settings.platformName || ''}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Global Support Email</label>
              <input
                type="email"
                value={settings.supportEmail || ''}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Global Operational Toggles */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <h3 className="text-base font-bold text-[#101C35] border-b border-slate-100 pb-3">
            System Operations & Security
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <h4 className="font-bold text-[#101C35] text-xs">Maintenance Mode</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Restricts customer business workspace access. Only platform administrators can log in.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSettings({ ...settings, maintenanceMode: !settings.maintenanceMode })}
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  settings.maintenanceMode ? 'bg-rose-600' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.maintenanceMode ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
              <div>
                <h4 className="font-bold text-[#101C35] text-xs">Public Self-Registration</h4>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Allows new retail customers to create businesses directly from the public registration portal.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({ ...settings, allowSelfRegistration: !settings.allowSelfRegistration })
                }
                className={`w-12 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-200 ${
                  settings.allowSelfRegistration ? 'bg-[#12A878]' : 'bg-slate-200'
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-200 ${
                    settings.allowSelfRegistration ? 'translate-x-6' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#12A878] text-white text-xs font-semibold rounded-xl hover:bg-[#0E8A62] transition-colors shadow-2xs"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving Platform Settings...' : 'Save Configuration'}
          </button>
        </div>
      </form>
    </div>
  )
}
