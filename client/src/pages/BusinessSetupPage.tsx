import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { MaareeLogo } from '../components/ui/MaareeLogo'

export default function BusinessSetupPage() {
  const [businessName, setBusinessName] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const { createBusiness, user } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLocalError(null)

    if (!businessName.trim()) {
      setLocalError('Please provide a business name.')
      return
    }

    try {
      setIsSubmitting(true)
      await createBusiness(businessName.trim(), currency, timezone)
      navigate('/dashboard')
    } catch (err: any) {
      setLocalError(err.message || 'Failed to create business.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col justify-center py-12 sm:px-6 lg:px-8 text-slate-900 relative">
      {/* Subtle ambient background glow */}
      <div className="absolute inset-0 bg-radial-[at_50%_0%] from-emerald-500/5 via-transparent to-transparent pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center relative z-10">
        {/* MAAREE 360 Brand Logo */}
        <div className="mb-4 flex justify-center">
          <MaareeLogo variant="stacked" size="lg" theme="light" showSubtitle={true} subtitle="Retail Management System" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-slate-900 m-0">Set up your business</h2>
        <p className="mt-1 text-xs text-slate-500">
          Welcome, {user?.name || 'Trader'}! Configure your retail shop in MAAREE 360 to start managing inventory and sales.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 relative z-10">
        <div className="bg-white border border-slate-200/90 py-8 px-6 shadow-[0_4px_24px_rgba(15,23,42,0.04)] rounded-2xl sm:px-10">
          {localError && (
            <div className="mb-5 rounded-lg bg-rose-50 border border-rose-200 p-3.5 text-xs text-rose-700 font-medium">
              {localError}
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="businessName" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Business / Store Name
              </label>
              <input
                id="businessName"
                name="businessName"
                type="text"
                required
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                placeholder="e.g. Nairobi Super Hardware"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 text-xs shadow-2xs transition"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="currency" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Currency
                </label>
                <select
                  id="currency"
                  name="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition"
                >
                  <option value="KES">KES (Kenyan Shilling)</option>
                  <option value="USD">USD (US Dollar)</option>
                  <option value="EUR">EUR (Euro)</option>
                  <option value="UGX">UGX (Ugandan Shilling)</option>
                  <option value="TZS">TZS (Tanzanian Shilling)</option>
                </select>
              </div>

              <div>
                <label htmlFor="timezone" className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                  Timezone
                </label>
                <select
                  id="timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 shadow-2xs transition"
                >
                  <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                  <option value="Africa/Kampala">Africa/Kampala</option>
                  <option value="Africa/Dar_es_Salaam">Africa/Dar es Salaam</option>
                  <option value="UTC">UTC</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200/70 text-xs text-emerald-900">
              <span className="font-semibold">Note:</span> You will be automatically assigned as the{' '}
              <span className="font-bold underline">OWNER</span> of this business with full operational privileges.
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-3 flex justify-center py-2.5 px-4 rounded-lg shadow-sm text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {isSubmitting ? 'Creating business...' : 'Complete Setup & Launch'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
