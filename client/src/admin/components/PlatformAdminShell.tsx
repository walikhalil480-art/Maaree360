import React, { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  LayoutDashboard,
  Building2,
  CreditCard,
  Users,
  Activity,
  ShieldCheck,
  FileText,
  Sliders,
  Bell,
  Cpu,
  Database,
  LifeBuoy,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ArrowUpRight,
  Shield,
  Layers,
} from 'lucide-react'
import { MaareeLogo } from '../../components/ui/MaareeLogo'

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Overview', href: '/admin', icon: LayoutDashboard },
  { name: 'Businesses', href: '/admin/businesses', icon: Building2 },
  { name: 'Subscriptions & Plans', href: '/admin/subscriptions', icon: CreditCard },
  { name: 'Platform Users', href: '/admin/users', icon: Users },
  { name: 'System Health', href: '/admin/health', icon: Activity },
  { name: 'Security Centre', href: '/admin/security', icon: ShieldCheck },
  { name: 'Audit Logs', href: '/admin/audit-logs', icon: FileText },
  { name: 'Feature Management', href: '/admin/features', icon: Sliders },
  { name: 'Notifications', href: '/admin/announcements', icon: Bell },
  { name: 'Integrations', href: '/admin/integrations', icon: Cpu },
  { name: 'Backups', href: '/admin/backups', icon: Database },
  { name: 'Support Centre', href: '/admin/support', icon: LifeBuoy },
  { name: 'Platform Settings', href: '/admin/settings', icon: Settings },
]

export function PlatformAdminShell({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, platformRole } = useAuth()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const isActive = (href: string) => {
    if (href === '/admin') {
      return location.pathname === '/admin' || location.pathname === '/admin/'
    }
    return location.pathname.startsWith(href)
  }

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex text-slate-800 antialiased font-sans">
      {/* Sidebar Navigation */}
      <aside
        className={`bg-[#101C35] text-white flex flex-col transition-all duration-300 z-30 fixed inset-y-0 left-0 ${
          collapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Brand Header */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-white/10">
          <div className="flex items-center gap-3 overflow-hidden">
            <MaareeLogo variant={collapsed ? 'symbol' : 'full'} theme="dark" size="sm" />
            {!collapsed && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#12A878]/20 text-[#12A878] border border-[#12A878]/30 shrink-0">
                Console
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>

        {/* Console Security Banner */}
        {!collapsed && (
          <div className="px-4 py-2.5 mx-3 mt-3 rounded-xl bg-white/[0.04] border border-white/5 flex items-center gap-2.5">
            <Shield className="w-4 h-4 text-[#12A878] shrink-0" />
            <div className="overflow-hidden">
              <p className="text-[11px] font-semibold text-slate-200 truncate">Platform Administrator</p>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider">{platformRole || 'ADMIN'}</p>
            </div>
          </div>
        )}

        {/* Navigation List */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto custom-scrollbar">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  active
                    ? 'bg-[#12A878] text-white shadow-sm font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
                } ${collapsed ? 'justify-center' : ''}`}
                title={collapsed ? item.name : undefined}
              >
                <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-white' : 'text-slate-400'}`} />
                {!collapsed && <span className="truncate">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Exit & Switch to Workspace Footer */}
        <div className="p-3 border-t border-white/10 space-y-2">
          <Link
            to="/dashboard"
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Switch to Customer Business Workspace"
          >
            <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
            {!collapsed && (
              <>
                <span className="truncate flex-1">Business App</span>
                <ArrowUpRight className="w-3.5 h-3.5 text-slate-400" />
              </>
            )}
          </Link>

          <button
            onClick={handleLogout}
            className={`flex items-center gap-2 w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-300 hover:text-rose-100 hover:bg-rose-500/10 transition-colors ${
              collapsed ? 'justify-center' : ''
            }`}
            title="Sign out of Platform Console"
          >
            <LogOut className="w-4 h-4 shrink-0" />
            {!collapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Workspace Area */}
      <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${collapsed ? 'ml-20' : 'ml-64'}`}>
        {/* Top Operational Bar */}
        <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Live Platform System
            </span>
            <span className="text-xs text-slate-400 hidden sm:inline">MAAREE 360 Core Engine v1.0</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-xs font-bold text-[#101C35]">{user?.name || 'Administrator'}</p>
              <p className="text-[11px] text-slate-500">{user?.email}</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-[#101C35] text-white flex items-center justify-center font-bold text-xs ring-2 ring-emerald-500/20">
              {user?.name?.slice(0, 2).toUpperCase() || 'AD'}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
      </div>
    </div>
  )
}
