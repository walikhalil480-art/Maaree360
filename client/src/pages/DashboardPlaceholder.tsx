import { useAuth } from '../context/AuthContext'
import { ShieldCheck, UserCheck, Clock } from 'lucide-react'

export default function DashboardPlaceholder() {
  const { user, activeBusiness } = useAuth()

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-950/60 via-slate-900 to-slate-900 border border-emerald-900/40 p-6 sm:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-900/60 border border-emerald-700 text-emerald-300">
              Session Authenticated
            </span>
            <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2 mb-1">
              {activeBusiness?.name || 'Your Business'}
            </h1>
            <p className="text-sm text-slate-400">
              Logged in as <span className="text-slate-200 font-medium">{user?.name}</span> ({user?.email})
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-bold text-emerald-400">
              Role: {activeBusiness?.role}
            </span>
            <span className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-300">
              Currency: {activeBusiness?.currency || 'KES'}
            </span>
          </div>
        </div>
      </div>

      {/* Security & Context Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center space-x-3 text-emerald-400 mb-2">
            <ShieldCheck className="w-5 h-5" />
            <h3 className="font-semibold text-sm text-white m-0">Tenant Isolation Active</h3>
          </div>
          <p className="text-xs text-slate-400 m-0">
            All requests are validated against active business memberships with strict multi-tenant boundary checks.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center space-x-3 text-emerald-400 mb-2">
            <UserCheck className="w-5 h-5" />
            <h3 className="font-semibold text-sm text-white m-0">Role Permissions</h3>
          </div>
          <p className="text-xs text-slate-400 m-0">
            Operating as <span className="text-white font-medium">{activeBusiness?.role}</span>. Administrative settings are restricted to OWNER and MANAGER roles.
          </p>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800">
          <div className="flex items-center space-x-3 text-emerald-400 mb-2">
            <Clock className="w-5 h-5" />
            <h3 className="font-semibold text-sm text-white m-0">Regional Settings</h3>
          </div>
          <p className="text-xs text-slate-400 m-0">
            Timezone: <span className="text-white font-medium">{activeBusiness?.timezone}</span>. Default currency: <span className="text-white font-medium">{activeBusiness?.currency}</span>.
          </p>
        </div>
      </div>

      {/* Roadmap & Next Installments Overview */}
      <div className="p-6 rounded-xl bg-slate-900/60 border border-slate-800">
        <h2 className="text-base font-semibold text-white mb-2">Upcoming Modules (Subsequent Installments)</h2>
        <p className="text-xs text-slate-400 mb-4">
          Installment 3 establishes complete authentication, sessions, and business tenancy. The following modules will be introduced in subsequent installments:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400">
            <span className="block font-medium text-slate-300">○ Products & Categories</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Catalog management</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400">
            <span className="block font-medium text-slate-300">○ Barcode & QR</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Scanning & generation</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400">
            <span className="block font-medium text-slate-300">○ Stock Tracking</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Low-stock alerts</span>
          </div>
          <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800 text-slate-400">
            <span className="block font-medium text-slate-300">○ Point of Sale</span>
            <span className="text-[11px] text-slate-500 mt-0.5 block">Sales, payments, returns</span>
          </div>
        </div>
      </div>
    </div>
  )
}
