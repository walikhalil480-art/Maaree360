import React, { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../api/client'
import { PageHeader } from '../components/ui/PageHeader'
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/Card'
import { Input } from '../components/ui/Input'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Toast } from '../components/ui/Toast'
import { ShieldCheck, Check } from 'lucide-react'

export default function SettingsPage() {
  const { activeBusiness, user } = useAuth()

  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('KES')
  const [timezone, setTimezone] = useState('Africa/Nairobi')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const isAuthorizedAdmin =
    activeBusiness?.role === 'OWNER' || activeBusiness?.role === 'MANAGER'

  useEffect(() => {
    if (activeBusiness) {
      setName(activeBusiness.name)
      setCurrency(activeBusiness.currency)
      setTimezone(activeBusiness.timezone)
      setErrorMessage(null)
    }
  }, [activeBusiness])

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeBusiness || !isAuthorizedAdmin) return

    setErrorMessage(null)
    setIsSubmitting(true)

    try {
      const data = await apiFetch<{ success: boolean; business: any }>(
        `/api/v1/businesses/${activeBusiness.id}`,
        {
          method: 'PATCH',
          body: JSON.stringify({
            name: name.trim(),
            currency: currency.trim(),
            timezone: timezone.trim(),
          }),
        }
      )

      if (data.success && data.business) {
        // Update local active business state
        activeBusiness.name = data.business.name
        activeBusiness.currency = data.business.currency
        activeBusiness.timezone = data.business.timezone
        setToastMessage('Business settings updated successfully.')
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to update business settings.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings' }]}
        badge={
          <Badge variant={isAuthorizedAdmin ? 'success' : 'neutral'} size="md">
            Role: {activeBusiness?.role}
          </Badge>
        }
      />

      {toastMessage && (
        <Toast
          message={toastMessage}
          type="success"
          onClose={() => setToastMessage(null)}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form Settings (2 cols) */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader
              title="Store Identity & Regional Format"
              subtitle="Configure shop name, base transaction currency, and time standard"
            />
            <form onSubmit={handleUpdate}>
              <CardContent className="space-y-4">
                {errorMessage && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                    {errorMessage}
                  </div>
                )}

                <Input
                  label="Business Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={!isAuthorizedAdmin || isSubmitting}
                  placeholder="e.g. Nairobi Mart"
                  required
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Base Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      disabled={!isAuthorizedAdmin || isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-50"
                    >
                      <option value="KES">KES - Kenyan Shilling</option>
                      <option value="USD">USD - US Dollar</option>
                      <option value="EUR">EUR - Euro</option>
                      <option value="UGX">UGX - Ugandan Shilling</option>
                      <option value="TZS">TZS - Tanzanian Shilling</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                      Timezone
                    </label>
                    <select
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={!isAuthorizedAdmin || isSubmitting}
                      className="w-full rounded-lg border border-slate-300 bg-white text-slate-900 text-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 disabled:bg-slate-50"
                    >
                      <option value="Africa/Nairobi">Africa/Nairobi (EAT)</option>
                      <option value="Africa/Kampala">Africa/Kampala</option>
                      <option value="Africa/Dar_es_Salaam">Africa/Dar es Salaam</option>
                      <option value="UTC">UTC (Universal Time)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <Input
                    label="Business Slug (System Identifier)"
                    value={activeBusiness?.slug || ''}
                    disabled
                    helperText="Generated URL-safe unique identifier assigned to this business."
                  />
                </div>
              </CardContent>

              <CardFooter className="flex justify-between items-center">
                <span className="text-xs text-slate-500">
                  {isAuthorizedAdmin
                    ? 'Only Owners and Managers may update settings.'
                    : 'Read-only: Your role does not have settings edit permissions.'}
                </span>

                {isAuthorizedAdmin && (
                  <Button
                    type="submit"
                    size="sm"
                    variant="primary"
                    isLoading={isSubmitting}
                    leftIcon={<Check className="w-3.5 h-3.5" />}
                  >
                    Save Changes
                  </Button>
                )}
              </CardFooter>
            </form>
          </Card>
        </div>

        {/* Right Column: Account & Tenancy Info (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader
              title="Security & Tenancy"
              subtitle="Tenant isolation details"
            />
            <CardContent className="space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block">Signed In User</span>
                <span className="font-semibold text-slate-800 block mt-0.5">{user?.name}</span>
                <span className="text-slate-500 block text-[11px]">{user?.email}</span>
              </div>

              <div className="p-3 rounded-lg bg-slate-50 border border-slate-200/80">
                <span className="text-slate-500 block">Active Membership</span>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-semibold text-slate-800">{activeBusiness?.role}</span>
                  <Badge variant={isAuthorizedAdmin ? 'success' : 'neutral'} size="sm">
                    {isAuthorizedAdmin ? 'Admin Access' : 'Staff Access'}
                  </Badge>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800">
                <div className="flex items-center gap-1.5 font-semibold mb-1">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Role-Based Access</span>
                </div>
                <span>
                  Permissions are strictly verified on the backend database layer for every API request.
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
