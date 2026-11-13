import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role } from '@prisma/client'

describe('Business API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-1',
    name: 'Alice',
    email: 'alice@example.com',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSession = {
    id: 'session-1',
    token: 'alice-session-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUser,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
  })

  describe('POST /api/v1/businesses', () => {
    it('should create business and automatically assign creator as OWNER via transaction', async () => {
      const mockBusiness = {
        id: 'biz-1',
        name: 'Nairobi Mart',
        slug: 'nairobi-mart-abc123',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        createdAt: new Date(),
        updatedAt: new Date(),
      }

      const mockMembership = {
        id: 'mem-1',
        userId: mockUser.id,
        businessId: mockBusiness.id,
        role: Role.OWNER,
        createdAt: new Date(),
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback) => {
        return callback({
          business: {
            create: vi.fn().mockResolvedValue(mockBusiness),
          },
          businessMembership: {
            create: vi.fn().mockResolvedValue(mockMembership),
          },
        } as any)
      })

      const res = await request(app)
        .post('/api/v1/businesses')
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Nairobi Mart',
          currency: 'KES',
          timezone: 'Africa/Nairobi',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.business.name).toBe('Nairobi Mart')
      expect(res.body.business.role).toBe(Role.OWNER)
    })

    it('should reject business creation when not authenticated', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .post('/api/v1/businesses')
        .send({ name: 'Nairobi Mart' })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/businesses', () => {
    it('should list only businesses where user has active membership', async () => {
      vi.spyOn(prisma.businessMembership, 'findMany').mockResolvedValue([
        {
          id: 'mem-1',
          userId: mockUser.id,
          businessId: 'biz-1',
          role: Role.OWNER,
          createdAt: new Date(),
          business: {
            id: 'biz-1',
            name: 'Nairobi Mart',
            slug: 'nairobi-mart-123',
            currency: 'KES',
            timezone: 'Africa/Nairobi',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ] as any)

      const res = await request(app)
        .get('/api/v1/businesses')
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.businesses).toHaveLength(1)
      expect(res.body.businesses[0].name).toBe('Nairobi Mart')
      expect(res.body.businesses[0].role).toBe(Role.OWNER)
    })
  })

  describe('GET /api/v1/businesses/:businessId (Tenant Isolation)', () => {
    it('should return business details for authorized member', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        id: 'mem-1',
        userId: mockUser.id,
        businessId: 'biz-1',
        role: Role.MANAGER,
        createdAt: new Date(),
        business: {
          id: 'biz-1',
          name: 'Nairobi Mart',
          slug: 'nairobi-mart-123',
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any)

      const res = await request(app)
        .get('/api/v1/businesses/biz-1')
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.business.id).toBe('biz-1')
    })

    it('should return 404 Not Found when user attempts to access another tenant business', async () => {
      // User is NOT a member of biz-other
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get('/api/v1/businesses/biz-other')
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PATCH /api/v1/businesses/:businessId (Role Authorization & Escalation Prevention)', () => {
    it('should allow OWNER to update permitted business settings', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        id: 'mem-1',
        userId: mockUser.id,
        businessId: 'biz-1',
        role: Role.OWNER,
        createdAt: new Date(),
        business: {
          id: 'biz-1',
          name: 'Old Name',
          slug: 'old-name',
          currency: 'KES',
          timezone: 'Africa/Nairobi',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any)

      vi.spyOn(prisma.business, 'update').mockResolvedValue({
        id: 'biz-1',
        name: 'New Name',
        slug: 'old-name',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const res = await request(app)
        .patch('/api/v1/businesses/biz-1')
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'New Name' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.business.name).toBe('New Name')
    })

    it('should forbid CASHIER from updating business settings', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        id: 'mem-cashier',
        userId: mockUser.id,
        businessId: 'biz-1',
        role: Role.CASHIER,
        createdAt: new Date(),
        business: { id: 'biz-1', name: 'Nairobi Mart' },
      } as any)

      const res = await request(app)
        .patch('/api/v1/businesses/biz-1')
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Hacked Name' })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('should prevent role escalation attempts via request payload', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue({
        id: 'mem-1',
        userId: mockUser.id,
        businessId: 'biz-1',
        role: Role.MANAGER,
        createdAt: new Date(),
        business: { id: 'biz-1', name: 'Nairobi Mart' },
      } as any)

      const updateSpy = vi.spyOn(prisma.business, 'update').mockResolvedValue({
        id: 'biz-1',
        name: 'Nairobi Mart Updated',
        slug: 'slug',
        currency: 'KES',
        timezone: 'Africa/Nairobi',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      // Client attempts to pass role: 'OWNER' or change membership
      const res = await request(app)
        .patch('/api/v1/businesses/biz-1')
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Nairobi Mart Updated',
          role: 'OWNER', // Unauthorized field
        } as any)

      expect(res.status).toBe(200)
      // Ensure the update was called ONLY with permitted fields, strip or never passed role
      expect(updateSpy).toHaveBeenCalledWith({
        where: { id: 'biz-1' },
        data: { name: 'Nairobi Mart Updated' },
      })
    })
  })
})
