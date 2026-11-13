import React, { useState, useEffect, useRef } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import {
  LayoutDashboard,
  Package,
  Boxes,
  QrCode,
  ShoppingCart,
  Truck,
  Users2,
  BarChart3,
  Users,
  UserCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Bell,
  Check,
  Plus,
  LogOut,
  ChevronDown,
  Receipt,
  Sparkles,
  DollarSign,
  Tag,
  Search,
  Shield,
  Store,
} from 'lucide-react'
import NotificationBellDropdown from './notifications/NotificationBellDropdown.js'
import { MaareeLogo } from './ui/MaareeLogo'
import { GlobalSearchModal } from './ui/GlobalSearchModal'

export interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  badge?: string
  allowedRoles?: Array<'OWNER' | 'MANAGER' | 'CASHIER' | 'STOCK_CLERK' | string>
  requiredPermission?: string
  requiredAnyPermissions?: string[]
}

export interface NavGroup {
  groupTitle?: string
  items: NavItem[]
}

const navigationGroups: NavGroup[] = [
  {
    groupTitle: 'Overview',
    items: [
      { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ],
  },
  {
    groupTitle: 'Sales & Checkout',
    items: [
      {
        name: 'Point of Sale',
        href: '/sales',
        icon: ShoppingCart,
        requiredPermission: 'pos.sell',
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Sales History',
        href: '/sales/history',
        icon: Receipt,
        requiredAnyPermissions: ['pos.sell', 'reports.sales.view'],
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Customers',
        href: '/customers',
        icon: UserCheck,
        requiredAnyPermissions: ['pos.sell', 'reports.sales.view'],
        allowedRoles: ['OWNER', 'MANAGER', 'CASHIER'],
      },
      {
        name: 'Price Checker',
        href: '/price-checker',
        icon: Tag,
      },
    ],
  },
  {
    groupTitle: 'Inventory & Supply',
    items: [
      {
        name: 'Products',
        href: '/products',
        icon: Package,
        requiredPermission: 'products.view',
        allowedRoles: ['OWNER', 'MANAGER', 'STOCK_CLERK'],
      },
      {
        name: 'Inventory',
        href: '/inventory',
        icon: Boxes,
        requiredPermission: 'inventory.view',
        allowedRoles: ['OWNER', 'MANAGER', 'STOCK_CLERK'],
      },
      {
        name: 'Barcode Scanner',
        href: '/barcodes',
        icon: QrCode,
      },
      {
        name: 'Purchase Orders',
        href: '/purchases',
        icon: Truck,
        requiredPermission: 'purchases.view',
        allowedRoles: ['OWNER', 'MANAGER', 'STOCK_CLERK'],
      },
      {
        name: 'Suppliers',
        href: '/suppliers',
        icon: Users2,
        requiredPermission: 'suppliers.view',
        allowedRoles: ['OWNER', 'MANAGER', 'STOCK_CLERK'],
      },
    ],
  },
  {
    groupTitle: 'Finance & Analytics',
    items: [
      {
        name: 'Reports',
        href: '/reports',
        icon: BarChart3,
        requiredAnyPermissions: ['reports.sales.view', 'reports.inventory.view', 'finance.profit.view'],
        allowedRoles: ['OWNER', 'MANAGER'],
      },
      {
        name: 'Expenses',
        href: '/expenses',
        icon: DollarSign,
        requiredPermission: 'finance.expenses.view',
        allowedRoles: ['OWNER', 'MANAGER'],
      },
      {
        name: 'Business Insights',
        href: '/assistant',
        icon: Sparkles,
        requiredAnyPermissions: ['reports.sales.view', 'finance.profit.view'],
        allowedRoles: ['OWNER', 'MANAGER'],
      },
    ],
  },
  {
    groupTitle: 'Administration',
    items: [
      {
        name: 'Team',
        href: '/team',
        icon: Users,
        requiredPermission: 'team.view',
        allowedRoles: ['OWNER', 'MANAGER'],
      },
      {
        name: 'Notifications',
        href: '/notifications',
        icon: Bell,
      },
      {
        name: 'Settings',
        href: '/settings',
        icon: Settings,
        requiredPermission: 'settings.edit',
        allowedRoles: ['OWNER', 'MANAGER'],
      },
    ],
  },
]

export default function AppShell({ children }: { children: React.ReactNode }) {
  const {
    user,
    businesses,
    activeBusiness,
    switchBusiness,
    logout,
    hasPermission,
    hasAnyPermission,
    isPlatformAdmin,
  } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  const [isCollapsed, setIsCollapsed] = useState(false)
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false)
  const [businessMenuOpen, setBusinessMenuOpen] = useState(false)
  const [profileMenuOpen, setProfileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const businessMenuRef = useRef<HTMLDivElement>(null)
  const profileMenuRef = useRef<HTMLDivElement>(null)

  // Global shortcut (Cmd+K / Ctrl+K) to open Command Palette / Search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileDrawerOpen(false)
  }, [location.pathname])

  // Click outside listener for dropdown menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (businessMenuRef.current && !businessMenuRef.current.contains(event.target as Node)) {
        setBusinessMenuOpen(false)
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const userRole = activeBusiness?.role || 'CASHIER'

  // Flatten nav items to find current page label
  const allNavItems = navigationGroups.flatMap((g) => g.items)
  const currentNav = allNavItems.find(
    (item) => item.href === location.pathname || (item.href !== '/dashboard' && location.pathname.startsWith(item.href))
  )
  const currentPageTitle = currentNav?.name || 'Dashboard'

  // Initials for avatar
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U'

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row text-[#0F172A] selection:bg-emerald-100 selection:text-emerald-900">
      {/* Mobile Drawer Backdrop */}
      {mobileDrawerOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/60 backdrop-blur-xs md:hidden animate-in fade-in duration-150"
          onClick={() => setMobileDrawerOpen(false)}
        />
      )}

      {/* Main SaaS Sidebar - Midnight Navy Architecture */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 bg-[#101A2D] border-r border-[#19243B] transition-all duration-200 ease-in-out flex flex-col md:static ${
          mobileDrawerOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'
        } ${isCollapsed ? 'md:w-[72px]' : 'md:w-64'}`}
      >
        {/* Brand Header */}
        <div className="h-14 px-4 border-b border-white/[0.07] flex items-center justify-between bg-[#0B1425]">
          <Link
            to="/dashboard"
            className="flex items-center gap-2 text-white no-underline overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#059669]/50 rounded-lg p-0.5"
          >
            {isCollapsed ? (
              <MaareeLogo variant="icon" theme="dark" size="sm" />
            ) : (
              <MaareeLogo variant="full" theme="dark" size="sm" />
            )}
          </Link>

          {/* Close button on mobile */}
          <button
            onClick={() => setMobileDrawerOpen(false)}
            className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden focus:outline-none"
            aria-label="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Grouped Navigation List */}
        <nav className="flex-1 px-3 py-3 space-y-4 overflow-y-auto scrollbar-none">
          {navigationGroups.map((group, gIdx) => {
            // Filter items by granular RBAC permission or fallback role
            const visibleItems = group.items.filter((it) => {
              if (activeBusiness?.role === 'OWNER') return true
              if (it.requiredPermission) {
                return hasPermission(it.requiredPermission)
              }
              if (it.requiredAnyPermissions && it.requiredAnyPermissions.length > 0) {
                return hasAnyPermission(it.requiredAnyPermissions)
              }
              if (it.allowedRoles && it.allowedRoles.length > 0) {
                return it.allowedRoles.includes(userRole)
              }
              return true
            })

            if (visibleItems.length === 0) return null

            return (
              <div key={gIdx} className="space-y-0.5">
                {!isCollapsed && group.groupTitle && (
                  <div className="px-2.5 py-1 text-[11px] font-medium text-[#9AA4B2] select-none">
                    {group.groupTitle}
                  </div>
                )}
                {isCollapsed && gIdx > 0 && (
                  <div className="my-2 border-t border-white/[0.07]" />
                )}

                {visibleItems.map((item) => {
                  const Icon = item.icon
                  const isActive =
                    location.pathname === item.href ||
                    (item.href !== '/dashboard' && location.pathname.startsWith(item.href))

                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      title={isCollapsed ? item.name : undefined}
                      className={`group relative flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors duration-150 select-none ${
                        isActive
                          ? 'bg-white/[0.08] text-white font-semibold before:absolute before:left-0 before:top-2 before:bottom-2 before:w-1 before:rounded-r-full before:bg-[#059669]'
                          : 'text-[#9AA4B2] hover:bg-white/[0.04] hover:text-white'
                      } ${isCollapsed ? 'justify-center px-0 py-2.5 before:hidden' : ''}`}
                    >
                      <Icon
                        className={`w-4 h-4 shrink-0 transition-colors ${
                          isActive ? 'text-[#059669]' : 'text-slate-400 group-hover:text-slate-200'
                        }`}
                      />
                      {!isCollapsed && <span className="truncate flex-1">{item.name}</span>}
                      {!isCollapsed && item.badge && (
                        <span className="text-[10px] font-semibold px-1.5 py-0.2 rounded-full bg-[#059669]/20 text-emerald-300 border border-[#059669]/30">
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            )
          })}
        </nav>

        {/* User Account & Collapse Footer */}
        <div className="border-t border-white/[0.07] p-2.5 bg-[#0B1425] space-y-2">
          {/* User Profile Mini Card */}
          {!isCollapsed ? (
            <div className="flex items-center justify-between px-2 py-1.5 rounded-lg hover:bg-white/[0.04] transition">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-7 h-7 rounded-full bg-[#059669] text-white font-semibold text-xs flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate leading-tight">
                    {user?.name || 'Staff User'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate leading-tight mt-0.5">
                    {activeBusiness?.role || 'Cashier'}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="text-slate-400 hover:text-rose-400 p-1 rounded-md transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={handleLogout}
                title="Sign out"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-white/[0.04] transition"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Desktop Sidebar Collapse Toggle */}
          <div className="hidden md:flex pt-1 border-t border-white/[0.07]">
            <button
              type="button"
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="w-full flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:bg-white/[0.04] hover:text-white transition text-xs font-medium"
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <div className="flex items-center gap-2 w-full px-1 text-slate-400 hover:text-white">
                  <ChevronLeft className="w-4 h-4" />
                  <span className="text-[11px]">Collapse menu</span>
                </div>
              )}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Workspace Layout */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#F7F8FA]">
        {/* Top Header Bar */}
        <header className="h-14 bg-white border-b border-[#E8ECF1] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
          {/* Left section: mobile hamburger + prominent Business Identity & Quick Switcher */}
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="p-1.5 -ml-1.5 rounded-lg text-slate-600 hover:bg-slate-100 md:hidden focus:outline-none shrink-0"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Prominent Active Business Identity */}
            {activeBusiness ? (
              <div className="relative flex items-center min-w-0" ref={businessMenuRef}>
                <button
                  type="button"
                  onClick={() => businesses.length > 1 && setBusinessMenuOpen(!businessMenuOpen)}
                  className={`flex items-center gap-2 py-1 px-1.5 sm:px-2 rounded-lg transition text-left group ${
                    businesses.length > 1
                      ? 'hover:bg-slate-100/90 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#12A878]/20'
                      : 'cursor-default'
                  }`}
                  title={
                    businesses.length > 1
                      ? `Active Store: ${activeBusiness.name} • Click to switch branch (${businesses.length} available)`
                      : `Active Store: ${activeBusiness.name}`
                  }
                >
                  <div className="w-7 h-7 rounded-lg bg-[#101C35] text-[#12A878] flex items-center justify-center font-bold text-xs shadow-2xs shrink-0 border border-[#12A878]/30 group-hover:scale-105 transition-transform">
                    <Store className="w-3.5 h-3.5 text-[#12A878]" />
                  </div>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="font-bold text-[#101C35] text-xs sm:text-sm tracking-tight truncate max-w-[120px] sm:max-w-[180px] md:max-w-[200px] lg:max-w-[260px]">
                      {activeBusiness.name}
                    </span>
                    {businesses.length > 1 && (
                      <ChevronDown
                        className={`w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 transition-transform duration-150 ${
                          businessMenuOpen ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </div>
                </button>

                {/* Subtitle / Breadcrumb indicator */}
                <div className="hidden xl:flex items-center gap-2 text-xs text-slate-400 ml-1 border-l border-slate-200 pl-2">
                  <span className="font-medium text-[#697586] truncate max-w-[140px]">{currentPageTitle}</span>
                </div>

                {/* Quick Store Switcher Dropdown (when user has multiple authorized businesses) */}
                {businessMenuOpen && businesses.length > 1 && (
                  <div className="absolute left-0 top-full mt-2 w-72 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                    <div className="px-3.5 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between border-b border-slate-100 pb-2 mb-1">
                      <span>Authorized Stores & Branches</span>
                      <span className="text-[10px] text-emerald-600 font-medium">{businesses.length} stores</span>
                    </div>
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-50">
                      {businesses.map((biz) => {
                        const isCurrent = biz.id === activeBusiness.id
                        return (
                          <button
                            key={biz.id}
                            onClick={() => {
                              switchBusiness(biz.id)
                              setBusinessMenuOpen(false)
                            }}
                            className={`w-full text-left px-3.5 py-2.5 text-xs flex items-center justify-between hover:bg-slate-50 transition ${
                              isCurrent ? 'bg-emerald-50/50 font-semibold text-[#101C35]' : 'text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 truncate">
                              <div
                                className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 text-[10px] font-bold ${
                                  isCurrent
                                    ? 'bg-[#101C35] text-[#12A878]'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                {biz.name.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="truncate">
                                <div className="truncate text-xs">{biz.name}</div>
                                <div className="text-[10px] text-slate-400 font-normal">
                                  {biz.currency} • {biz.role || 'Member'}
                                </div>
                              </div>
                            </div>
                            {isCurrent && <Check className="w-4 h-4 text-[#12A878] shrink-0" />}
                          </button>
                        )
                      })}
                    </div>

                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <Link
                        to="/business-setup"
                        onClick={() => setBusinessMenuOpen(false)}
                        className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-[#12A878] font-semibold hover:bg-emerald-50/50 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Register another store</span>
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs sm:text-sm truncate">
                <span className="font-bold text-[#101C35] tracking-tight">MAAREE 360</span>
                <span className="text-slate-300">/</span>
                <span className="font-semibold text-[#172033] tracking-tight truncate">{currentPageTitle}</span>
              </div>
            )}
          </div>

          {/* Center Search Trigger (Linear/Stripe style) */}
          <div className="hidden md:flex items-center justify-center max-w-sm w-full mx-4">
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F7F8FA] hover:bg-[#F1F3F6] border border-[#E8ECF1] text-xs text-[#697586] transition group focus:outline-none focus:ring-2 focus:ring-[#059669]/20"
            >
              <div className="flex items-center gap-2 truncate">
                <Search className="w-3.5 h-3.5 text-[#697586] group-hover:text-[#172033] transition" />
                <span className="truncate group-hover:text-[#172033]">Search products, transactions, actions...</span>
              </div>
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white border border-[#E8ECF1] rounded">
                ⌘K
              </kbd>
            </button>
          </div>

          {/* Right section: Notifications & User Profile */}
          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            {/* Mobile Search Icon */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100 md:hidden"
              title="Search"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Notifications Popover Dropdown */}
            <NotificationBellDropdown />

            {/* Platform Console Shortcut for Admins */}
            {isPlatformAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#101C35] text-white text-xs font-semibold hover:bg-[#1A2C50] transition shadow-2xs border border-[#12A878]/30"
                title="Open Platform Owner & Super Admin Console"
              >
                <Shield className="w-3.5 h-3.5 text-[#12A878]" />
                <span className="hidden sm:inline">Platform Console</span>
              </Link>
            )}

            {/* Profile Menu Dropdown */}
            <div className="relative" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                className="flex items-center gap-1.5 h-8 p-1 pl-1 pr-1.5 rounded-lg hover:bg-slate-100 transition focus:outline-none"
              >
                <div className="w-6 h-6 rounded-full bg-[#0F172A] text-white font-semibold text-[10px] flex items-center justify-center shrink-0">
                  {userInitials}
                </div>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {profileMenuOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white border border-slate-200/90 shadow-xl py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3.5 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-[#0F172A] m-0 truncate">{user?.name}</p>
                    <p className="text-[11px] text-slate-500 m-0 truncate mt-0.5">{user?.email}</p>
                  </div>

                  {isPlatformAdmin && (
                    <Link
                      to="/admin"
                      onClick={() => setProfileMenuOpen(false)}
                      className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-[#101C35] font-semibold hover:bg-emerald-50/50 transition border-b border-slate-100"
                    >
                      <Shield className="w-3.5 h-3.5 text-[#12A878]" />
                      <span>Platform Console</span>
                    </Link>
                  )}

                  <Link
                    to="/settings"
                    onClick={() => setProfileMenuOpen(false)}
                    className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-slate-700 hover:bg-slate-50 transition"
                  >
                    <Settings className="w-3.5 h-3.5 text-slate-400" />
                    <span>Store Settings</span>
                  </Link>

                  <div className="border-t border-slate-100 mt-1 pt-1">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full text-left px-3.5 py-2 text-xs flex items-center gap-2 text-[#DC2626] hover:bg-red-50 transition"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Main Page Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
          {children}
        </main>
      </div>

      {/* Global Quick Search / Command Palette Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
    </div>
  )
}
