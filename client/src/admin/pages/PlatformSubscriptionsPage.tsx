import React, { useEffect, useState } from 'react'
import { apiFetch } from '../../api/client'
import {
  Plus,
  Edit2,
  Users,
  Store,
  Calendar,
  X,
} from 'lucide-react'

interface Plan {
  id: string
  code: string
  name: string
  description?: string | null
  priceMonthly: number
  priceAnnual: number
  currency: string
  trialDays: number
  maxUsers: number
  maxBranches: number
  features: Record<string, boolean>
  isActive: boolean
  subscriberCount: number
}

export default function PlatformSubscriptionsPage() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [planForm, setPlanForm] = useState({
    code: '',
    name: '',
    description: '',
    priceMonthly: 0,
    priceAnnual: 0,
    maxUsers: 5,
    maxBranches: 1,
    trialDays: 14,
  })
  const [submitting, setSubmitting] = useState(false)

  const fetchPlans = async () => {
    try {
      const res = await apiFetch<{ success: boolean; plans: Plan[] }>('/api/v1/platform/plans')
      if (res.success) {
        setPlans(res.plans)
      }
    } catch (err: any) {
      console.error('Failed to load subscription plans:', err)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const handleCreateOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      setSubmitting(true)
      if (editingPlan) {
        const res = await apiFetch<{ success: boolean; plan: Plan }>(
          `/api/v1/platform/plans/${editingPlan.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(planForm),
          }
        )
        if (res.success) {
          setEditingPlan(null)
          fetchPlans()
        }
      } else {
        const res = await apiFetch<{ success: boolean; plan: Plan }>('/api/v1/platform/plans', {
          method: 'POST',
          body: JSON.stringify(planForm),
        })
        if (res.success) {
          setShowCreateModal(false)
          fetchPlans()
        }
      }
    } catch (err: any) {
      alert(err?.message || 'Failed to save subscription plan')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[#101C35] tracking-tight">Subscriptions & Pricing Plans</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure commercial tiers, feature entitlements, pricing, and subscriber distribution.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setEditingPlan(null)
              setPlanForm({
                code: '',
                name: '',
                description: '',
                priceMonthly: 0,
                priceAnnual: 0,
                maxUsers: 5,
                maxBranches: 1,
                trialDays: 14,
              })
              setShowCreateModal(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#12A878] text-white text-xs font-semibold rounded-xl hover:bg-[#0E8A62] transition-colors shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            Create Custom Plan
          </button>
        </div>
      </div>

      {/* Plan Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs flex flex-col justify-between hover:border-slate-300 transition-colors"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{plan.code}</span>
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {plan.subscriberCount} Active
                </span>
              </div>
              <h2 className="text-lg font-bold text-[#101C35] mt-2">{plan.name}</h2>
              <p className="text-xs text-slate-500 mt-1 line-clamp-2 min-h-8">
                {plan.description || 'Standard plan tier for business operations.'}
              </p>

              <div className="mt-4 pt-4 border-t border-slate-100 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-[#101C35]">
                  {plan.currency} {plan.priceMonthly.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">/ month</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Annual: {plan.currency} {plan.priceAnnual.toLocaleString()}
              </p>

              {/* Tier Limits */}
              <div className="mt-4 space-y-2 bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs text-slate-600">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    Max Users
                  </span>
                  <span className="font-bold text-[#101C35]">{plan.maxUsers} seats</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Store className="w-3.5 h-3.5 text-slate-400" />
                    Max Branches
                  </span>
                  <span className="font-bold text-[#101C35]">{plan.maxBranches} branch</span>
                </div>
                {plan.trialDays > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      Trial Duration
                    </span>
                    <span className="font-bold text-[#101C35]">{plan.trialDays} days</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setEditingPlan(plan)
                  setPlanForm({
                    code: plan.code,
                    name: plan.name,
                    description: plan.description || '',
                    priceMonthly: plan.priceMonthly,
                    priceAnnual: plan.priceAnnual,
                    maxUsers: plan.maxUsers,
                    maxBranches: plan.maxBranches,
                    trialDays: plan.trialDays,
                  })
                }}
                className="w-full flex items-center justify-center gap-2 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition-colors"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit Plan Settings
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Plan Edit / Create Modal */}
      {(showCreateModal || editingPlan) && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateOrUpdate}
            className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-xl overflow-hidden"
          >
            <div className="p-5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-[#101C35]">
                {editingPlan ? `Edit ${editingPlan.name}` : 'Create Subscription Plan'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingPlan(null)
                }}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4 text-xs">
              {!editingPlan && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Plan Code (Unique) *</label>
                  <input
                    type="text"
                    required
                    value={planForm.code}
                    onChange={(e) => setPlanForm({ ...planForm, code: e.target.value })}
                    placeholder="e.g. enterprise-plus"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Plan Display Name *</label>
                <input
                  type="text"
                  required
                  value={planForm.name}
                  onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                  placeholder="e.g. Enterprise Plus"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={planForm.description}
                  onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                  placeholder="Summary of target audience and included services..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Monthly Price (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.priceMonthly}
                    onChange={(e) => setPlanForm({ ...planForm, priceMonthly: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Annual Price (KES)</label>
                  <input
                    type="number"
                    min="0"
                    value={planForm.priceAnnual}
                    onChange={(e) => setPlanForm({ ...planForm, priceAnnual: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">User Limit (Seats)</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.maxUsers}
                    onChange={(e) => setPlanForm({ ...planForm, maxUsers: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Branch Limit</label>
                  <input
                    type="number"
                    min="1"
                    value={planForm.maxBranches}
                    onChange={(e) => setPlanForm({ ...planForm, maxBranches: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                </div>
              </div>
            </div>
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setShowCreateModal(false)
                  setEditingPlan(null)
                }}
                className="px-4 py-2 border border-slate-200 bg-white text-slate-700 font-semibold rounded-xl text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 bg-[#12A878] text-white font-semibold rounded-xl text-xs hover:bg-[#0E8A62]"
              >
                {submitting ? 'Saving...' : 'Save Plan'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
