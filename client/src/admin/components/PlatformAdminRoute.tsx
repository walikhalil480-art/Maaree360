import React from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { ShieldAlert, ArrowLeft } from 'lucide-react'
import { MaareeLogo } from '../../components/ui/MaareeLogo'

export function PlatformAdminRoute({ children }: { children: React.ReactNode }) {
  const { user, isPlatformAdmin, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <MaareeLogo variant="stacked" theme="light" size="md" />
          <div className="w-6 h-6 border-2 border-[#101C35] border-t-transparent rounded-full animate-spin mt-2" />
          <span className="text-xs font-semibold text-[#64748B]">Verifying platform authorization...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!isPlatformAdmin) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-8 shadow-sm text-center">
          <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-rose-100">
            <ShieldAlert className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-[#101C35]">Platform Access Restricted</h2>
          <p className="text-sm text-slate-500 mt-2 mb-6">
            Your account ({user.email}) does not hold platform administrator privileges for MAAREE 360.
          </p>
          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="inline-flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-[#101C35] text-white text-sm font-semibold rounded-xl hover:bg-[#1A2C50] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Return to Business Workspace
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
