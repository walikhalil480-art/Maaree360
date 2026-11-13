import React from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import BusinessSetupPage from './pages/BusinessSetupPage'
import DashboardOverview from './pages/DashboardOverview'
import SettingsPage from './pages/SettingsPage'
import ProductsPage from './pages/ProductsPage'
import ScanPage from './pages/ScanPage'
import InventoryPage from './pages/InventoryPage'
import { SuppliersPage } from './pages/SuppliersPage'
import { PurchaseOrdersPage } from './pages/PurchaseOrdersPage'
import { PosPage } from './pages/PosPage'
import { SalesHistoryPage } from './pages/SalesHistoryPage'
import { CustomersPage } from './pages/CustomersPage'
import { ExpensesPage } from './pages/ExpensesPage'
import { ReportsPage } from './pages/ReportsPage'
import TeamPage from './pages/TeamPage'
import AcceptInvitationPage from './pages/AcceptInvitationPage'
import AiAssistantPage from './pages/AiAssistantPage'
import NotificationsPage from './pages/NotificationsPage'
import { PriceCheckerPage } from './pages/PriceCheckerPage'
import HardwareSetupPage from './pages/HardwareSetupPage'
import AppShell from './components/AppShell'
import { MaareeLogo } from './components/ui/MaareeLogo'
import { AccessDeniedState } from './components/ui/PermissionGuard'

// Platform Administration Console
import { PlatformAdminRoute } from './admin/components/PlatformAdminRoute'
import { PlatformAdminShell } from './admin/components/PlatformAdminShell'
import PlatformOverviewPage from './admin/pages/PlatformOverviewPage'
import PlatformBusinessesPage from './admin/pages/PlatformBusinessesPage'
import PlatformSubscriptionsPage from './admin/pages/PlatformSubscriptionsPage'
import PlatformUsersPage from './admin/pages/PlatformUsersPage'
import PlatformSystemHealthPage from './admin/pages/PlatformSystemHealthPage'
import PlatformSecurityPage from './admin/pages/PlatformSecurityPage'
import PlatformAuditLogsPage from './admin/pages/PlatformAuditLogsPage'
import PlatformFeaturesPage from './admin/pages/PlatformFeaturesPage'
import PlatformAnnouncementsPage from './admin/pages/PlatformAnnouncementsPage'
import PlatformIntegrationsPage from './admin/pages/PlatformIntegrationsPage'
import PlatformBackupsPage from './admin/pages/PlatformBackupsPage'
import PlatformSupportPage from './admin/pages/PlatformSupportPage'
import PlatformSettingsPage from './admin/pages/PlatformSettingsPage'

function ProtectedRoute({
  children,
  requiredPermission,
  requiredAnyPermissions,
  moduleName,
}: {
  children: React.ReactNode
  requiredPermission?: string
  requiredAnyPermissions?: string[]
  moduleName?: string
}) {
  const { user, businesses, loading, hasPermission, hasAnyPermission, activeBusiness, isPlatformAdmin } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <MaareeLogo variant="stacked" theme="light" size="md" />
          <div className="w-6 h-6 border-2 border-[#101C35] border-t-transparent rounded-full animate-spin mt-2" />
          <span className="text-xs font-semibold text-[#64748B]">Verifying session...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  // If user is a platform administrator with no business memberships, direct to platform console
  if (isPlatformAdmin && businesses.length === 0) {
    return <Navigate to="/admin" replace />
  }

  // If user is authenticated but has not created/joined any business yet, guide to business setup
  if (businesses.length === 0 && location.pathname !== '/business-setup') {
    return <Navigate to="/business-setup" replace />
  }

  // RBAC Permission Check
  if (activeBusiness && activeBusiness.role !== 'OWNER') {
    if (requiredPermission && !hasPermission(requiredPermission)) {
      return (
        <AppShell>
          <AccessDeniedState
            moduleName={moduleName || 'This Module'}
            requiredPermission={requiredPermission}
          />
        </AppShell>
      )
    }
    if (
      requiredAnyPermissions &&
      requiredAnyPermissions.length > 0 &&
      !hasAnyPermission(requiredAnyPermissions)
    ) {
      return (
        <AppShell>
          <AccessDeniedState
            moduleName={moduleName || 'This Module'}
            requiredPermission={requiredAnyPermissions.join(' or ')}
          />
        </AppShell>
      )
    }
  }

  return <>{children}</>
}

function PublicOnlyRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F7FA] flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <MaareeLogo variant="stacked" theme="light" size="md" />
          <div className="w-6 h-6 border-2 border-[#101C35] border-t-transparent rounded-full animate-spin mt-2" />
        </div>
      </div>
    )
  }

  if (user) {
    return <Navigate to="/dashboard" replace />
  }

  return <>{children}</>
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Root redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          {/* Public Authentication Routes */}
          <Route
            path="/login"
            element={
              <PublicOnlyRoute>
                <LoginPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/register"
            element={
              <PublicOnlyRoute>
                <RegisterPage />
              </PublicOnlyRoute>
            }
          />
          <Route
            path="/forgot-password"
            element={
              <PublicOnlyRoute>
                <ForgotPasswordPage />
              </PublicOnlyRoute>
            }
          />

          {/* Protected Business Setup */}
          <Route
            path="/business-setup"
            element={
              <ProtectedRoute>
                <BusinessSetupPage />
              </ProtectedRoute>
            }
          />

          {/* Protected Dashboard */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <AppShell>
                  <DashboardOverview />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Products & Categories Module */}
          <Route
            path="/products"
            element={
              <ProtectedRoute requiredPermission="products.view" moduleName="Products & Catalog">
                <AppShell>
                  <ProductsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Inventory & Stock Tracking Module */}
          <Route
            path="/inventory"
            element={
              <ProtectedRoute requiredPermission="inventory.view" moduleName="Inventory Management">
                <AppShell>
                  <InventoryPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Barcode & QR Code Operations */}
          <Route
            path="/barcodes"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ScanPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/scan"
            element={
              <ProtectedRoute>
                <AppShell>
                  <ScanPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Point of Sale (POS) & Sales Transactions */}
          <Route
            path="/sales"
            element={
              <ProtectedRoute requiredPermission="pos.sell" moduleName="Point of Sale">
                <AppShell>
                  <PosPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/pos"
            element={
              <ProtectedRoute requiredPermission="pos.sell" moduleName="Point of Sale">
                <AppShell>
                  <PosPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/history"
            element={
              <ProtectedRoute
                requiredAnyPermissions={['pos.sell', 'reports.sales.view']}
                moduleName="Sales History"
              >
                <AppShell>
                  <SalesHistoryPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Customer Management & Accounts */}
          <Route
            path="/customers"
            element={
              <ProtectedRoute
                requiredAnyPermissions={['pos.sell', 'reports.sales.view']}
                moduleName="Customer Management"
              >
                <AppShell>
                  <CustomersPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Operating Expenses & Profit Calculations Module */}
          <Route
            path="/expenses"
            element={
              <ProtectedRoute
                requiredPermission="finance.expenses.view"
                moduleName="Operating Expenses"
              >
                <AppShell>
                  <ExpensesPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Purchases / Purchase Orders Module */}
          <Route
            path="/purchases"
            element={
              <ProtectedRoute
                requiredPermission="purchases.view"
                moduleName="Purchase Orders"
              >
                <AppShell>
                  <PurchaseOrdersPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route
            path="/purchase-orders"
            element={
              <ProtectedRoute
                requiredPermission="purchases.view"
                moduleName="Purchase Orders"
              >
                <AppShell>
                  <PurchaseOrdersPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Suppliers & Vendors Module */}
          <Route
            path="/suppliers"
            element={
              <ProtectedRoute requiredPermission="suppliers.view" moduleName="Suppliers">
                <AppShell>
                  <SuppliersPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Reports & Business Intelligence Module */}
          <Route
            path="/reports"
            element={
              <ProtectedRoute
                requiredAnyPermissions={[
                  'reports.sales.view',
                  'reports.inventory.view',
                  'finance.profit.view',
                ]}
                moduleName="Reports & Analytics"
              >
                <AppShell>
                  <ReportsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* AI Business Assistant & Sales Forecasting */}
          <Route
            path="/assistant"
            element={
              <ProtectedRoute
                requiredAnyPermissions={['reports.sales.view', 'finance.profit.view']}
                moduleName="AI Business Assistant"
              >
                <AppShell>
                  <AiAssistantPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Notifications & Business Alerts */}
          <Route
            path="/notifications"
            element={
              <ProtectedRoute>
                <AppShell>
                  <NotificationsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Team Roles & Permissions Module */}
          <Route
            path="/team"
            element={
              <ProtectedRoute requiredPermission="team.view" moduleName="Team Management">
                <AppShell>
                  <TeamPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Invitation Acceptance Route */}
          <Route path="/accept-invitation" element={<AcceptInvitationPage />} />

          {/* Hardware & Peripheral Integrations */}
          <Route
            path="/hardware-setup"
            element={
              <ProtectedRoute>
                <AppShell>
                  <HardwareSetupPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* Price Checker Module */}
          <Route
            path="/price-checker"
            element={
              <ProtectedRoute>
                <AppShell>
                  <PriceCheckerPage />
                </AppShell>
              </ProtectedRoute>
            }
          />
          <Route path="/price-checker/:businessId" element={<PriceCheckerPage isKiosk />} />
          <Route path="/kiosk/price-checker/:businessId" element={<PriceCheckerPage isKiosk />} />

          {/* Settings Route */}
          <Route
            path="/settings"
            element={
              <ProtectedRoute requiredPermission="settings.edit" moduleName="Settings">
                <AppShell>
                  <SettingsPage />
                </AppShell>
              </ProtectedRoute>
            }
          />

          {/* ======================================================== */}
          {/* TIER 1: PLATFORM OWNER & SUPER ADMIN CONSOLE ROUTES       */}
          {/* ======================================================== */}
          <Route
            path="/admin"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformOverviewPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/overview"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformOverviewPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/businesses"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformBusinessesPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/subscriptions"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformSubscriptionsPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/users"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformUsersPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/health"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformSystemHealthPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/security"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformSecurityPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/audit-logs"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformAuditLogsPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/features"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformFeaturesPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/announcements"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformAnnouncementsPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/integrations"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformIntegrationsPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/backups"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformBackupsPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/support"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformSupportPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />
          <Route
            path="/admin/settings"
            element={
              <PlatformAdminRoute>
                <PlatformAdminShell>
                  <PlatformSettingsPage />
                </PlatformAdminShell>
              </PlatformAdminRoute>
            }
          />

          {/* Fallback route */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
