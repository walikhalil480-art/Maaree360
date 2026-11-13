import { Router } from 'express'
import { platformController } from '../controllers/platform.controller.js'
import { requirePlatformAuth, requirePlatformPermission } from '../middleware/platformAuth.js'
import { PLATFORM_PERMISSIONS } from '../types/platform.types.js'

const router = Router()

// All platform endpoints strictly require an authenticated Platform Administrator
router.use(requirePlatformAuth)

// 1. Overview
router.get(
  '/overview',
  requirePlatformPermission(PLATFORM_PERMISSIONS.DASHBOARD_VIEW),
  platformController.getOverview
)

// 2. Businesses Management
router.get(
  '/businesses',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformController.listBusinesses
)
router.get(
  '/businesses/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_VIEW),
  platformController.getBusinessById
)
router.post(
  '/businesses',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_CREATE),
  platformController.createBusiness
)
router.post(
  '/businesses/:id/status',
  requirePlatformPermission(PLATFORM_PERMISSIONS.BUSINESSES_SUSPEND),
  platformController.updateBusinessStatus
)

// 3. Subscriptions & Plans
router.get(
  '/plans',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_VIEW),
  platformController.listPlans
)
router.post(
  '/plans',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  platformController.createPlan
)
router.patch(
  '/plans/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  platformController.updatePlan
)
router.post(
  '/businesses/:id/subscription',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUBSCRIPTIONS_MANAGE),
  platformController.assignSubscription
)

// 4. Platform Users (Administrators & Tenant Accounts)
router.get(
  '/users',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_VIEW),
  platformController.listAdmins
)
router.get(
  '/tenant-users',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_VIEW),
  platformController.listTenantUsers
)
router.post(
  '/users',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE),
  platformController.createAdmin
)
router.patch(
  '/users/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE),
  platformController.updateAdmin
)
router.post(
  '/users/:id/revoke-sessions',
  requirePlatformPermission(PLATFORM_PERMISSIONS.USERS_MANAGE),
  platformController.revokeAdminSessions
)

// 5. System Health & Backups Telemetry
router.get(
  '/health',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_VIEW),
  platformController.getDetailedHealth
)
router.get(
  '/backups',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SYSTEM_HEALTH_VIEW),
  platformController.getBackups
)

// 6. Security & Audit Logs
router.get(
  '/audit-logs',
  requirePlatformPermission(PLATFORM_PERMISSIONS.AUDIT_LOGS_VIEW),
  platformController.queryAuditLogs
)

// 7. Support Centre & Controlled Customer Access
router.get(
  '/support/sessions',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_ACCESS),
  platformController.listSupportSessions
)
router.post(
  '/support/sessions',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_ACCESS),
  platformController.createSupportSession
)
router.delete(
  '/support/sessions/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SUPPORT_ACCESS),
  platformController.revokeSupportSession
)

// 8. Platform Settings, Feature Management & Integrations
router.get(
  '/settings',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
  platformController.getSettings
)
router.patch(
  '/settings',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
  platformController.updateSettings
)
router.get(
  '/integrations',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
  platformController.getIntegrations
)

// 9. Platform Announcements
router.get(
  '/announcements',
  requirePlatformPermission(PLATFORM_PERMISSIONS.DASHBOARD_VIEW),
  platformController.listAnnouncements
)
router.post(
  '/announcements',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
  platformController.createAnnouncement
)
router.delete(
  '/announcements/:id',
  requirePlatformPermission(PLATFORM_PERMISSIONS.SETTINGS_MANAGE),
  platformController.deleteAnnouncement
)

export default router
