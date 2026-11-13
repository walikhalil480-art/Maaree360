import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import crypto from 'crypto'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, InvitationStatus } from '@prisma/client'

describe('MAAREE 360 - Employee Invitation System End-to-End Test Suite', () => {
  const app = createApp()

  const mockShopA = {
    id: 'shop-a-id',
    name: 'Shabeele Whole Sellers',
    slug: 'shabeele-whole-sellers',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockShopB = {
    id: 'shop-b-id',
    name: 'Raqiis Electronics',
    slug: 'raqiis-electronics',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockShopAOwner = {
    id: 'user-shop-a-owner',
    name: 'Hassan Owner',
    email: 'hassan@shabeele.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockShopAManager = {
    id: 'user-shop-a-manager',
    name: 'Omar Manager',
    email: 'omar@shabeele.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockShopACashier = {
    id: 'user-shop-a-cashier',
    name: 'Khadija Cashier',
    email: 'khadija@shabeele.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockShopBOwner = {
    id: 'user-shop-b-owner',
    name: 'Farah Owner',
    email: 'farah@raqiis.com',
    passwordHash: 'hashed-password',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerSessionA = {
    id: 'session-owner-a',
    token: 'owner-session-a-token',
    userId: mockShopAOwner.id,
    expiresAt: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    user: mockShopAOwner,
  }

  const mockManagerSessionA = {
    id: 'session-manager-a',
    token: 'manager-session-a-token',
    userId: mockShopAManager.id,
    expiresAt: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    user: mockShopAManager,
  }

  const mockCashierSessionA = {
    id: 'session-cashier-a',
    token: 'cashier-session-a-token',
    userId: mockShopACashier.id,
    expiresAt: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    user: mockShopACashier,
  }

  const mockOwnerSessionB = {
    id: 'session-owner-b',
    token: 'owner-session-b-token',
    userId: mockShopBOwner.id,
    expiresAt: new Date(Date.now() + 10000000),
    createdAt: new Date(),
    user: mockShopBOwner,
  }

  beforeEach(() => {
    vi.restoreAllMocks()

    // Transaction mock
    vi.spyOn(prisma, '$transaction').mockImplementation(async (arg: any) => {
      if (typeof arg === 'function') {
        return arg(prisma)
      }
      return Promise.all(arg)
    })

    // Session mock
    vi.spyOn(prisma.session, 'findUnique').mockImplementation(async ({ where }: any) => {
      if (where.token === 'owner-session-a-token') return mockOwnerSessionA as any
      if (where.token === 'manager-session-a-token') return mockManagerSessionA as any
      if (where.token === 'cashier-session-a-token') return mockCashierSessionA as any
      if (where.token === 'owner-session-b-token') return mockOwnerSessionB as any
      return null
    })

    // Business Membership mock for auth middleware
    vi.spyOn(prisma.businessMembership, 'findUnique').mockImplementation(async ({ where }: any) => {
      const uId = where.userId_businessId?.userId
      const bId = where.userId_businessId?.businessId

      if (uId === mockShopAOwner.id && bId === mockShopA.id) {
        return {
          id: 'mem-owner-a',
          userId: mockShopAOwner.id,
          businessId: mockShopA.id,
          role: Role.OWNER,
          isActive: true,
          user: mockShopAOwner,
          business: mockShopA,
        } as any
      }

      if (uId === mockShopAManager.id && bId === mockShopA.id) {
        return {
          id: 'mem-manager-a',
          userId: mockShopAManager.id,
          businessId: mockShopA.id,
          role: Role.MANAGER,
          isActive: true,
          user: mockShopAManager,
          business: mockShopA,
        } as any
      }

      if (uId === mockShopACashier.id && bId === mockShopA.id) {
        return {
          id: 'mem-cashier-a',
          userId: mockShopACashier.id,
          businessId: mockShopA.id,
          role: Role.CASHIER,
          isActive: true,
          user: mockShopACashier,
          business: mockShopA,
        } as any
      }

      if (uId === mockShopBOwner.id && bId === mockShopB.id) {
        return {
          id: 'mem-owner-b',
          userId: mockShopBOwner.id,
          businessId: mockShopB.id,
          role: Role.OWNER,
          isActive: true,
          user: mockShopBOwner,
          business: mockShopB,
        } as any
      }

      return null
    })

    vi.spyOn(prisma.auditLog, 'create').mockResolvedValue({ id: 'audit-test' } as any)
  })

  // =========================================================================
  // SCENARIO A: New Employee Flow
  // =========================================================================
  describe('Scenario A: New Employee Registration & Invitation Acceptance', () => {
    it('Owner invites new employee with name, email, role, and custom message', async () => {
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.staffInvitation, 'findFirst').mockResolvedValue(null)

      const mockCreated = {
        id: 'inv-jane-1',
        businessId: mockShopA.id,
        name: 'Jane Mwangi',
        email: 'jane@example.com',
        phone: null,
        message: 'Welcome to Shabeele Whole Sellers!',
        role: Role.CASHIER,
        status: InvitationStatus.PENDING,
        tokenHash: 'hash-jane',
        emailDeliveryStatus: 'FAILED',
        emailDeliveryError: 'SMTP gateway unconfigured',
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        invitedById: mockShopAOwner.id,
        createdAt: new Date(),
        invitedBy: { id: mockShopAOwner.id, name: mockShopAOwner.name, email: mockShopAOwner.email },
        business: { id: mockShopA.id, name: mockShopA.name },
      }

      vi.spyOn(prisma.staffInvitation, 'create').mockResolvedValue(mockCreated as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockShopA.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=owner-session-a-token'])
        .send({
          name: 'Jane Mwangi',
          email: 'jane@example.com',
          role: 'CASHIER',
          message: 'Welcome to Shabeele Whole Sellers!',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.token).toBeDefined()
      expect(res.body.invitationUrl).toContain(res.body.token)
      expect(res.body.data.name).toBe('Jane Mwangi')
      expect(res.body.data.role).toBe('CASHIER')
      expect(res.body.emailDelivery).toBeDefined()
    })

    it('Public preview endpoint returns invitation details and confirms user requires registration', async () => {
      const rawToken = 'jane-public-token-123'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-jane-1',
        tokenHash: hashed,
        name: 'Jane Mwangi',
        email: 'jane@example.com',
        phone: null,
        message: 'Welcome to Shabeele Whole Sellers!',
        role: Role.CASHIER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        businessId: mockShopA.id,
        business: mockShopA,
        invitedBy: mockShopAOwner,
      } as any)

      // No user exists yet with jane@example.com
      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const res = await request(app).get(`/api/v1/invitations/${rawToken}`)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.business.name).toBe('Shabeele Whole Sellers')
      expect(res.body.data.invitation.name).toBe('Jane Mwangi')
      expect(res.body.data.invitation.role).toBe('CASHIER')
      expect(res.body.data.isExistingUser).toBe(false)
      expect(res.body.data.requiresRegistration).toBe(true)
    })

    it('New employee accepts invitation and creates account in one atomic transaction', async () => {
      const rawToken = 'jane-accept-token-123'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-jane-1',
        tokenHash: hashed,
        name: 'Jane Mwangi',
        email: 'jane@example.com',
        phone: null,
        message: 'Welcome to Shabeele Whole Sellers!',
        role: Role.CASHIER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        businessId: mockShopA.id,
        business: mockShopA,
        invitedBy: mockShopAOwner,
      } as any)

      vi.spyOn(prisma.user, 'findUnique').mockResolvedValue(null)

      const mockCreatedUser = {
        id: 'user-jane-new',
        name: 'Jane Mwangi',
        email: 'jane@example.com',
        phone: '+254700112233',
        passwordHash: 'new-hashed-password',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockCreatedMembership = {
        id: 'mem-jane-shop-a',
        userId: mockCreatedUser.id,
        businessId: mockShopA.id,
        role: Role.CASHIER,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          user: { create: vi.fn().mockResolvedValue(mockCreatedUser) },
          staffInvitation: {
            update: vi.fn().mockResolvedValue({ id: 'inv-jane-1', status: InvitationStatus.ACCEPTED }),
          },
          businessMembership: { create: vi.fn().mockResolvedValue(mockCreatedMembership) },
          session: { create: vi.fn().mockResolvedValue({ id: 'sess-new', token: 'new-sess-token' }) },
          auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-new' }) },
        })
      })

      const res = await request(app)
        .post('/api/v1/invitations/accept-and-register')
        .send({
          token: rawToken,
          name: 'Jane Mwangi',
          password: 'Password123!',
          phone: '+254700112233',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.email).toBe('jane@example.com')
      expect(res.body.data.role).toBe('CASHIER')
      expect(res.body.data.business.name).toBe('Shabeele Whole Sellers')
      // Sets auth session cookie
      expect(res.headers['set-cookie']).toBeDefined()
    })

    it('Rejects reusing an already-accepted invitation token', async () => {
      const rawToken = 'already-accepted-token'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-jane-1',
        tokenHash: hashed,
        status: InvitationStatus.ACCEPTED,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        businessId: mockShopA.id,
        business: mockShopA,
      } as any)

      const res = await request(app)
        .post('/api/v1/invitations/accept-and-register')
        .send({
          token: rawToken,
          name: 'Jane Mwangi',
          password: 'Password123!',
        })

      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('INVITATION_ALREADY_USED')
    })
  })

  // =========================================================================
  // SCENARIO B: Existing User Multi-Tenant Flow
  // =========================================================================
  describe('Scenario B: Existing User Cross-Shop Invitation & Multi-Tenant Isolation', () => {
    it('Existing Shop A Cashier accepts invitation to join Shop B as Manager', async () => {
      const rawToken = 'cross-shop-token-456'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      // Invitation is specifically for Shop B (Raqiis Electronics) as MANAGER
      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-cross-1',
        tokenHash: hashed,
        email: mockShopACashier.email, // khadija@shabeele.com
        role: Role.MANAGER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        businessId: mockShopB.id,
        business: mockShopB,
        invitedBy: mockShopBOwner,
      } as any)

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        return callback({
          staffInvitation: {
            update: vi.fn().mockResolvedValue({ id: 'inv-cross-1', status: InvitationStatus.ACCEPTED }),
          },
          businessMembership: {
            upsert: vi.fn().mockResolvedValue({
              id: 'mem-khadija-shop-b',
              userId: mockShopACashier.id,
              businessId: mockShopB.id,
              role: Role.MANAGER,
              isActive: true,
            }),
          },
          auditLog: { create: vi.fn().mockResolvedValue({ id: 'audit-accept-cross' }) },
        })
      })

      // Khadija is logged in with cashier-session-a-token
      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Cookie', ['smartstock_session=cashier-session-a-token'])
        .send({ token: rawToken })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('accepted')
      expect(res.body.data.membership.role).toBe('MANAGER')
      expect(res.body.data.business.name).toBe('Raqiis Electronics')
    })
  })

  // =========================================================================
  // SCENARIO C: Security & Edge Cases
  // =========================================================================
  describe('Scenario C: Security Controls, Role Bounds & Edge Cases', () => {
    it('Returns 404 for nonexistent or invalid invitation token', async () => {
      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue(null)

      const res = await request(app).get('/api/v1/invitations/non-existent-token-xyz')
      expect(res.status).toBe(404)
      expect(res.body.error?.code).toBe('NOT_FOUND')
    })

    it('Returns 400 INVITATION_EXPIRED when invitation has expired', async () => {
      const rawToken = 'expired-token-789'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-expired-1',
        tokenHash: hashed,
        status: InvitationStatus.EXPIRED,
        expiresAt: new Date(Date.now() - 100000), // Expired in past
        businessId: mockShopA.id,
        business: mockShopA,
        invitedBy: mockShopAOwner,
      } as any)

      const res = await request(app).get(`/api/v1/invitations/${rawToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('INVITATION_EXPIRED')
    })

    it('Returns 400 INVITATION_REVOKED when invitation was cancelled by administrator', async () => {
      const rawToken = 'revoked-token-101'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-revoked-1',
        tokenHash: hashed,
        status: InvitationStatus.REVOKED,
        expiresAt: new Date(Date.now() + 100000),
        businessId: mockShopA.id,
        business: mockShopA,
        invitedBy: mockShopAOwner,
      } as any)

      const res = await request(app).get(`/api/v1/invitations/${rawToken}`)
      expect(res.status).toBe(400)
      expect(res.body.error?.code).toBe('INVITATION_REVOKED')
    })

    it('Rejects acceptance with 403 RECIPIENT_MISMATCH if user logged in with a different email', async () => {
      const rawToken = 'mismatch-token-202'
      const hashed = crypto.createHash('sha256').update(rawToken).digest('hex')

      // Invitation is specifically issued to user@different.com
      vi.spyOn(prisma.staffInvitation, 'findUnique').mockResolvedValue({
        id: 'inv-mismatch-1',
        tokenHash: hashed,
        email: 'user@different.com',
        role: Role.CASHIER,
        status: InvitationStatus.PENDING,
        expiresAt: new Date(Date.now() + 72 * 3600 * 1000),
        businessId: mockShopA.id,
        business: mockShopA,
      } as any)

      // Khadija (khadija@shabeele.com) attempts to accept it
      const res = await request(app)
        .post('/api/v1/invitations/accept')
        .set('Cookie', ['smartstock_session=cashier-session-a-token'])
        .send({ token: rawToken })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('RECIPIENT_MISMATCH')
    })

    it('Forbids Manager from inviting an Owner (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockShopA.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=manager-session-a-token'])
        .send({
          email: 'attempted_owner@example.com',
          role: 'OWNER',
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('FORBIDDEN')
    })

    it('Forbids Cashier from inviting any staff members (403 FORBIDDEN)', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockShopA.id}/team/members/invite`)
        .set('Cookie', ['smartstock_session=cashier-session-a-token'])
        .send({
          email: 'newclerk@example.com',
          role: 'STOCK_CLERK',
        })

      expect(res.status).toBe(403)
      expect(res.body.error?.code).toBe('FORBIDDEN')
    })

    it('Owner can successfully revoke a pending invitation', async () => {
      vi.spyOn(prisma.staffInvitation, 'findFirst').mockResolvedValue({
        id: 'inv-to-revoke',
        businessId: mockShopA.id,
        status: InvitationStatus.PENDING,
        role: Role.CASHIER,
        email: 'cancelme@example.com',
      } as any)

      vi.spyOn(prisma.staffInvitation, 'update').mockResolvedValue({
        id: 'inv-to-revoke',
        status: InvitationStatus.REVOKED,
        revokedAt: new Date(),
      } as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockShopA.id}/team/invitations/inv-to-revoke`)
        .set('Cookie', ['smartstock_session=owner-session-a-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('revoked')
    })

    it('Owner can refresh and resend an invitation link with a fresh token', async () => {
      vi.spyOn(prisma.staffInvitation, 'findFirst').mockResolvedValue({
        id: 'inv-to-resend',
        businessId: mockShopA.id,
        status: InvitationStatus.PENDING,
        role: Role.CASHIER,
        email: 'refreshme@example.com',
        business: mockShopA,
        invitedBy: mockShopAOwner,
      } as any)

      vi.spyOn(prisma.staffInvitation, 'update').mockResolvedValue({
        id: 'inv-to-resend',
        status: InvitationStatus.PENDING,
        role: Role.CASHIER,
        email: 'refreshme@example.com',
        resentAt: new Date(),
        invitedBy: mockShopAOwner,
        business: mockShopA,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockShopA.id}/team/invitations/inv-to-resend/resend`)
        .set('Cookie', ['smartstock_session=owner-session-a-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.token).toBeDefined()
      expect(res.body.invitationUrl).toContain(res.body.token)
    })
  })
})
