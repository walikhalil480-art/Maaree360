import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { PlatformRoleType, BusinessStatus, SubscriptionStatus } from '@prisma/client'

describe('MAAREE 360 Platform Administration API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-po-1',
    name: 'Platform Owner',
    email: 'owner@maaree360.com',
    passwordHash: 'argon2id$hashed',
    phone: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockPlatformOwnerAdmin = {
    id: 'admin-po-1',
    userId: 'user-po-1',
    role: PlatformRoleType.PLATFORM_OWNER,
    customPermissions: [],
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSupportAdmin = {
    id: 'admin-support-1',
    userId: 'user-supp-1',
    role: PlatformRoleType.SUPPORT_ADMIN,
    customPermissions: [],
    isActive: true,
    mfaEnabled: false,
    mfaSecret: null,
    lastLoginAt: null,
    lastLoginIp: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSession = {
    id: 'sess-1',
    token: 'owner-session-token',
    userId: 'user-po-1',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    user: mockUser,
  }

  const mockSupportSession = {
    id: 'sess-supp',
    token: 'support-session-token',
    userId: 'user-supp-1',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    user: {
      id: 'user-supp-1',
      name: 'Support Agent',
      email: 'support@maaree360.com',
      passwordHash: 'hash',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }

  const mockBusinessUserSession = {
    id: 'sess-biz',
    token: 'biz-user-token',
    userId: 'user-biz-1',
    expiresAt: new Date(Date.now() + 86400000),
    createdAt: new Date(),
    user: {
      id: 'user-biz-1',
      name: 'Business Owner',
      email: 'biz@customer.com',
      passwordHash: 'hash',
      phone: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('1. Security Boundary & Authentication Enforcement', () => {
    it('should reject unauthenticated request to /api/v1/platform/overview with 401', async () => {
      const res = await request(app).get('/api/v1/platform/overview')
      expect(res.status).toBe(401)
      expect(res.body.error?.code || res.body.code).toBe('UNAUTHORIZED')
    })

    it('should reject business user without PlatformAdmin record with 403 PLATFORM_FORBIDDEN', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    it('should reject deactivated platform admin with 403 PLATFORM_ADMIN_INACTIVE', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue({
        ...mockPlatformOwnerAdmin,
        isActive: false,
      } as any)

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_ADMIN_INACTIVE')
    })
  })

  describe('2. Platform RBAC & Granular Permission Enforcement', () => {
    it('should allow PLATFORM_OWNER to access overview and retrieve actual metrics', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.business, 'count').mockResolvedValue(12)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(45)
      vi.spyOn(prisma.businessMembership, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.session, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.businessSubscription, 'count').mockResolvedValue(10)
      vi.spyOn(prisma.businessSubscription, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.subscriptionPlan, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.business, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.platformAuditLog, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.metrics.businesses.total).toBe(12)
      expect(res.body.data.metrics.users.total).toBe(45)
    })

    it('should forbid SUPPORT_ADMIN from creating subscription plans (403 INSUFFICIENT_PLATFORM_PERMISSIONS)', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSupportSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockSupportAdmin as any)

      const res = await request(app)
        .post('/api/v1/platform/plans')
        .set('Cookie', ['smartstock_session=support-session-token'])
        .send({
          code: 'hacker-plan',
          name: 'Hacker Plan',
          priceMonthly: 100,
          priceAnnual: 1000,
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('INSUFFICIENT_PLATFORM_PERMISSIONS')
    })

    it('should forbid SUPPORT_ADMIN from suspending businesses', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSupportSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockSupportAdmin as any)

      const res = await request(app)
        .post('/api/v1/platform/businesses/biz-123/status')
        .set('Cookie', ['smartstock_session=support-session-token'])
        .send({
          status: 'SUSPENDED',
          reason: 'Non-payment',
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('INSUFFICIENT_PLATFORM_PERMISSIONS')
    })
  })

  describe('3. Business Account Suspension Lifecycle & Enforcement', () => {
    it('should allow PLATFORM_OWNER to suspend a business with documented reason', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.business, 'findUnique').mockResolvedValue({
        id: 'biz-123',
        name: 'Delinquent Store',
        status: BusinessStatus.ACTIVE,
      } as any)
      vi.spyOn(prisma.business, 'update').mockResolvedValue({
        id: 'biz-123',
        name: 'Delinquent Store',
        status: BusinessStatus.SUSPENDED,
        suspensionReason: 'Terms of service violation',
      } as any)
      vi.spyOn(prisma.platformAuditLog, 'create').mockResolvedValue({} as any)

      const res = await request(app)
        .post('/api/v1/platform/businesses/biz-123/status')
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          status: BusinessStatus.SUSPENDED,
          reason: 'Terms of service violation',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.business.status).toBe('SUSPENDED')
    })

    it('should reject suspension without a documented reason (400 REASON_REQUIRED)', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.business, 'findUnique').mockResolvedValue({
        id: 'biz-123',
        status: BusinessStatus.ACTIVE,
      } as any)

      const res = await request(app)
        .post('/api/v1/platform/businesses/biz-123/status')
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          status: BusinessStatus.SUSPENDED,
          reason: '',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('REASON_REQUIRED')
    })

    it('should enforce business suspension in requireBusinessMember middleware (403 BUSINESS_SUSPENDED)', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        id: 'mem-1',
        userId: 'user-biz-1',
        businessId: 'biz-123',
        role: 'OWNER',
        isActive: true,
        business: {
          id: 'biz-123',
          name: 'Suspended Mart',
          status: BusinessStatus.SUSPENDED,
          suspensionReason: 'Account suspended for policy breach',
        },
      } as any)

      // Query any business-scoped route
      const res = await request(app)
        .get('/api/v1/businesses/biz-123/products')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('BUSINESS_SUSPENDED')
    })
  })

  describe('4. Platform Owner Protection & Security', () => {
    it('should protect root PLATFORM_OWNER account from deactivation (400 CANNOT_MODIFY_ROOT_OWNER)', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)

      const res = await request(app)
        .patch('/api/v1/platform/users/admin-po-1')
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          isActive: false,
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('CANNOT_MODIFY_ROOT_OWNER')
    })

    it('should protect root PLATFORM_OWNER account from demotion to another role', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)

      const res = await request(app)
        .patch('/api/v1/platform/users/admin-po-1')
        .set('Cookie', ['smartstock_session=owner-session-token'])
        .send({
          role: 'SUPPORT_ADMIN',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('CANNOT_MODIFY_ROOT_OWNER')
    })
  })

  describe('5. Controlled Support Access Sessions', () => {
    it('should allow support admin to create a time-limited diagnostic session with documented reason', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSupportSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockSupportAdmin as any)
      vi.spyOn(prisma.business, 'findUnique').mockResolvedValue({
        id: 'biz-target',
        name: 'Target Customer Store',
      } as any)
      vi.spyOn(prisma.supportSession, 'create').mockResolvedValue({
        id: 'supp-sess-1',
        adminId: 'admin-support-1',
        businessId: 'biz-target',
        reason: 'Investigating POS printer synchronization failure',
        authorizedById: 'admin-support-1',
        expiresAt: new Date(Date.now() + 3600000),
        revokedAt: null,
        actionsLogged: [],
        createdAt: new Date(),
      } as any)
      vi.spyOn(prisma.platformAuditLog, 'create').mockResolvedValue({} as any)

      const res = await request(app)
        .post('/api/v1/platform/support/sessions')
        .set('Cookie', ['smartstock_session=support-session-token'])
        .send({
          businessId: 'biz-target',
          reason: 'Investigating POS printer synchronization failure',
          durationMinutes: 60,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.session.businessId).toBe('biz-target')
      expect(res.body.businessName).toBe('Target Customer Store')
    })

    it('should reject support access creation when reason is too short', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSupportSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockSupportAdmin as any)

      const res = await request(app)
        .post('/api/v1/platform/support/sessions')
        .set('Cookie', ['smartstock_session=support-session-token'])
        .send({
          businessId: 'biz-target',
          reason: 'fix',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code || res.body.code).toBe('REASON_REQUIRED')
    })

    it('should allow immediate revocation of an active support session', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.supportSession, 'findUnique').mockResolvedValue({
        id: 'supp-sess-1',
        businessId: 'biz-target',
        revokedAt: null,
      } as any)
      vi.spyOn(prisma.supportSession, 'update').mockResolvedValue({
        id: 'supp-sess-1',
        businessId: 'biz-target',
        revokedAt: new Date(),
      } as any)
      vi.spyOn(prisma.platformAuditLog, 'create').mockResolvedValue({} as any)

      const res = await request(app)
        .delete('/api/v1/platform/support/sessions/supp-sess-1')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.session.revokedAt).toBeDefined()
    })
  })

  describe('6. System Health & Real Telemetry', () => {
    it('should return live PostgreSQL latency and system resources without fake data', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma, '$queryRaw').mockResolvedValue([{ '?column?': 1 }] as any)
      vi.spyOn(prisma.business, 'count').mockResolvedValue(5)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(10)
      vi.spyOn(prisma.product, 'count').mockResolvedValue(150)
      vi.spyOn(prisma.sale, 'count').mockResolvedValue(890)
      vi.spyOn(prisma.businessMembership, 'count').mockResolvedValue(12)
      vi.spyOn(prisma.session, 'count').mockResolvedValue(4)
      vi.spyOn(prisma.platformAuditLog, 'count').mockResolvedValue(30)

      const res = await request(app)
        .get('/api/v1/platform/health')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.health.status).toBe('healthy')
      expect(res.body.health.services.database.engine).toBe('PostgreSQL')
      expect(res.body.health.services.database.latencyMs).toBeGreaterThanOrEqual(0)
      expect(res.body.health.databaseMetrics.tables.products).toBe(150)
      expect(res.body.health.databaseMetrics.tables.sales).toBe(890)
    })
  })

  describe('7. Twelve Mandatory Access Control & Isolation Scenarios', () => {
    const mockCashierSession = {
      id: 'sess-cashier',
      token: 'cashier-session-token',
      userId: 'user-cashier-1',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      user: {
        id: 'user-cashier-1',
        name: 'Cashier User',
        email: 'cashier@shabeele.com',
        passwordHash: 'hash',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    const mockManagerSession = {
      id: 'sess-manager',
      token: 'manager-session-token',
      userId: 'user-manager-1',
      expiresAt: new Date(Date.now() + 86400000),
      createdAt: new Date(),
      user: {
        id: 'user-manager-1',
        name: 'Manager User',
        email: 'manager@shabeele.com',
        passwordHash: 'hash',
        phone: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    }

    // Scenario 1: Platform Owner can access Platform Console
    it('Scenario 1: Platform Owner can access Platform Console', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.business, 'count').mockResolvedValue(10)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(50)
      vi.spyOn(prisma.businessSubscription, 'count').mockResolvedValue(10)
      vi.spyOn(prisma.businessSubscription, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.subscriptionPlan, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.business, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.platformAuditLog, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.metrics).toBeDefined()
    })

    // Scenario 2: Authorised Platform Administrator can access permitted sections
    it('Scenario 2: Authorised Platform Administrator can access permitted sections', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSupportSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockSupportAdmin as any)
      vi.spyOn(prisma.business, 'findMany').mockResolvedValue([
        {
          id: 'biz-1',
          name: 'Store A',
          slug: 'store-a',
          status: BusinessStatus.ACTIVE,
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          createdAt: new Date(),
          updatedAt: new Date(),
          memberships: [
            {
              user: {
                id: 'u-1',
                name: 'Owner A',
                email: 'owner@storea.com',
                phone: null,
              },
            },
          ],
          _count: {
            memberships: 2,
            products: 25,
            sales: 100,
            registers: 1,
          },
          subscription: null,
        } as any,
      ])
      vi.spyOn(prisma.business, 'count').mockResolvedValue(1)

      const res = await request(app)
        .get('/api/v1/platform/businesses')
        .set('Cookie', ['smartstock_session=support-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.businesses).toBeInstanceOf(Array)
    })

    // Scenario 3: Business Owner cannot see Platform Console / access platform APIs
    it('Scenario 3: Business Owner is strictly denied platform access', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    // Scenario 4: Business Owner cannot open Platform Console using a direct URL / endpoint
    it('Scenario 4: Business Owner direct URL / endpoint returns 403 PLATFORM_FORBIDDEN', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/platform/health')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    // Scenario 5: Business Owner receives HTTP 403 when calling platform administration APIs
    it('Scenario 5: Business Owner receives HTTP 403 when calling platform administration APIs', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/platform/settings')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    // Scenario 6: Business Administrator cannot access platform-wide business data
    it('Scenario 6: Business Administrator cannot access platform-wide business directory', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/platform/businesses')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    // Scenario 7: Branch Manager cannot access another branch without permission
    it('Scenario 7: Branch Manager cannot access another branch without membership (protected 404)', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockManagerSession as any)
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null) // Not a member of other-branch

      const res = await request(app)
        .get('/api/v1/businesses/dcf9ee62-dbed-4ae9-9c1d-ec46f0e24031/products')
        .set('Cookie', ['smartstock_session=manager-session-token'])

      expect(res.status).toBe(404)
      expect(res.body.error?.code || res.body.code).toBe('NOT_FOUND')
    })

    // Scenario 8: Cashier cannot access platform administration
    it('Scenario 8: Cashier cannot access platform administration', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockCashierSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    // Scenario 9: Business Owner cannot promote themselves to Platform Owner
    it('Scenario 9: Business Owner cannot promote themselves to Platform Owner', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/platform/users')
        .set('Cookie', ['smartstock_session=biz-user-token'])
        .send({
          email: 'biz@customer.com',
          role: 'PLATFORM_OWNER',
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code || res.body.code).toBe('PLATFORM_FORBIDDEN')
    })

    // Scenario 10: Business registration never automatically grants platform privileges
    it('Scenario 10: Business registration never automatically grants platform privileges', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.user, 'create').mockResolvedValue({
        id: 'new-user-id',
        name: 'New Shop Owner',
        email: 'newowner@test.co.ke',
        passwordHash: 'hash',
        createdAt: new Date(),
        updatedAt: new Date(),
        phone: null,
        platformAdmin: null,
      } as any)

      const res = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'New Shop Owner',
          email: 'newowner@test.co.ke',
          password: 'Password123!',
        })

      expect(res.status).toBe(201)
      expect(res.body.user.platformAdmin).toBeNull()
    })

    // Scenario 11: Switching businesses loads assigned business context
    it('Scenario 11: User with authorized memberships can access assigned business', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        id: 'mem-1',
        userId: 'user-biz-1',
        businessId: '1f7894e6-f0c4-4c82-b2ae-28a8a9d81479',
        role: 'OWNER',
        isActive: true,
        business: {
          id: '1f7894e6-f0c4-4c82-b2ae-28a8a9d81479',
          name: 'Shabeele Whole Sellers',
          status: BusinessStatus.ACTIVE,
        },
      } as any)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.product, 'count').mockResolvedValue(0)

      const res = await request(app)
        .get('/api/v1/businesses/1f7894e6-f0c4-4c82-b2ae-28a8a9d81479/products')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    // Scenario 12: Users cannot access businesses outside their assigned scope
    it('Scenario 12: Users cannot access businesses outside their assigned scope (protected 404)', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockBusinessUserSession as any)
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null) // No membership in unauthorized-store

      const res = await request(app)
        .get('/api/v1/businesses/1f7894e6-f0c4-4c82-b2ae-28a8a9d81479/products')
        .set('Cookie', ['smartstock_session=biz-user-token'])

      expect(res.status).toBe(404)
      expect(res.body.error?.code || res.body.code).toBe('NOT_FOUND')
    })
  })

  describe('13. Platform Data Authenticity & Subsystems Verification', () => {
    it('should return accurate, distinct user breakdowns and MRR in overview', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.business, 'count').mockResolvedValue(5)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(10)
      vi.spyOn(prisma.platformAdmin, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.businessMembership, 'findMany')
        .mockResolvedValueOnce([{ userId: 'u1' }, { userId: 'u2' }] as any) // owners
        .mockResolvedValueOnce([{ userId: 'u3' }] as any) // managers
        .mockResolvedValueOnce([{ userId: 'u4' }, { userId: 'u5' }] as any) // cashiers
      vi.spyOn(prisma.session, 'findMany').mockResolvedValue([{ userId: 'u1' }] as any) // active sessions
      vi.spyOn(prisma.businessSubscription, 'count')
        .mockResolvedValueOnce(2) // active
        .mockResolvedValueOnce(0) // trial
        .mockResolvedValueOnce(0) // expired
        .mockResolvedValueOnce(0) // cancelled
        .mockResolvedValueOnce(0) // pastDue
        .mockResolvedValueOnce(1) // upcomingRenewals
      vi.spyOn(prisma.businessSubscription, 'findMany').mockResolvedValue([
        {
          id: 'sub-1',
          billingInterval: 'MONTHLY',
          plan: { priceMonthly: 6500, priceAnnual: 65000 },
        },
        {
          id: 'sub-2',
          billingInterval: 'ANNUAL',
          plan: { priceMonthly: 6500, priceAnnual: 120000 },
        },
      ] as any)
      vi.spyOn(prisma.subscriptionPlan, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.business, 'findMany').mockResolvedValue([])
      vi.spyOn(prisma.platformAuditLog, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .get('/api/v1/platform/overview')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.metrics.users.owners).toBe(2)
      expect(res.body.data.metrics.users.managers).toBe(1)
      expect(res.body.data.metrics.users.cashiers).toBe(2)
      expect(res.body.data.metrics.users.activeSessionUsers).toBe(1)
      // MRR calculation: 6500 + 120000/12 = 6500 + 10000 = 16500
      expect(res.body.data.metrics.subscriptions.mrr).toBe(16500)
      expect(res.body.data.metrics.subscriptions.currency).toBe('KES')
      expect(res.body.data.metrics.subscriptions.upcomingRenewals).toBe(1)
    })

    it('should list tenant business accounts via GET /api/v1/platform/tenant-users', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)
      vi.spyOn(prisma.user, 'findMany').mockResolvedValue([
        {
          id: 'tenant-user-1',
          name: 'Shabeele Cashier',
          email: 'cashier@shabeele.com',
          phone: '+254712345678',
          createdAt: new Date(),
          platformAdmin: null,
          sessions: [{ id: 'sess-active', expiresAt: new Date(Date.now() + 100000) }],
          memberships: [
            {
              businessId: 'biz-1',
              role: 'CASHIER',
              isActive: true,
              business: { id: 'biz-1', name: 'Shabeele Store', slug: 'shabeele', status: 'ACTIVE' },
            },
          ],
        },
      ] as any)
      vi.spyOn(prisma.user, 'count').mockResolvedValue(1)

      const res = await request(app)
        .get('/api/v1/platform/tenant-users')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.users.length).toBe(1)
      expect(res.body.users[0].name).toBe('Shabeele Cashier')
      expect(res.body.users[0].hasActiveSession).toBe(true)
      expect(res.body.users[0].memberships[0].businessName).toBe('Shabeele Store')
    })

    it('should return live environment inspection from GET /api/v1/platform/integrations', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)

      const res = await request(app)
        .get('/api/v1/platform/integrations')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.integrations)).toBe(true)
      expect(res.body.integrations.length).toBeGreaterThanOrEqual(4)
      const mpesa = res.body.integrations.find((i: any) => i.id === 'mpesa')
      expect(mpesa).toBeDefined()
      expect(mpesa.requiredKeys).toContain('MPESA_CONSUMER_KEY')
    })

    it('should return live snapshot directory state from GET /api/v1/platform/backups', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
      vi.spyOn(prisma.platformAdmin, 'findUnique').mockResolvedValue(mockPlatformOwnerAdmin as any)

      const res = await request(app)
        .get('/api/v1/platform/backups')
        .set('Cookie', ['smartstock_session=owner-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.storageEngine).toBe('PostgreSQL 16+')
      expect(res.body.backupDirectory).toBe('./backups')
      expect(Array.isArray(res.body.snapshots)).toBe(true)
    })
  })
})
