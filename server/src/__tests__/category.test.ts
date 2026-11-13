import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role } from '@prisma/client'

describe('Category API', () => {
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

  const mockBusiness = {
    id: 'biz-1',
    name: 'Nairobi Groceries',
    slug: 'nairobi-groceries-1',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerMembership = {
    id: 'mem-1',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockCashierMembership = {
    id: 'mem-2',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
  })

  describe('GET /api/v1/businesses/:businessId/categories', () => {
    it('should list categories with product counts for a member', async () => {
      const mockCategories = [
        {
          id: 'cat-1',
          businessId: mockBusiness.id,
          name: 'Beverages',
          description: 'Drinks and juices',
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { products: 12 },
        },
        {
          id: 'cat-2',
          businessId: mockBusiness.id,
          name: 'Snacks',
          description: null,
          createdAt: new Date(),
          updatedAt: new Date(),
          _count: { products: 0 },
        },
      ]

      vi.spyOn(prisma.category, 'findMany').mockResolvedValue(mockCategories as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/categories`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.categories).toHaveLength(2)
      expect(res.body.categories[0].name).toBe('Beverages')
      expect(res.body.categories[0].productsCount).toBe(12)
    })

    it('should return 401 when not authenticated', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(null)

      const res = await request(app).get(`/api/v1/businesses/${mockBusiness.id}/categories`)

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should return 404 if user is not a member of the business', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/categories`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('POST /api/v1/businesses/:businessId/categories', () => {
    it('should create a new category', async () => {
      vi.spyOn(prisma.category, 'findUnique').mockResolvedValue(null)
      const newCategory = {
        id: 'cat-3',
        businessId: mockBusiness.id,
        name: 'Dairy',
        description: 'Milk and cheese',
        createdAt: new Date(),
        updatedAt: new Date(),
      }
      vi.spyOn(prisma.category, 'create').mockResolvedValue(newCategory as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/categories`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Dairy', description: 'Milk and cheese' })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.category.name).toBe('Dairy')
    })

    it('should reject duplicate category name within the same business', async () => {
      vi.spyOn(prisma.category, 'findUnique').mockResolvedValue({
        id: 'cat-1',
        businessId: mockBusiness.id,
        name: 'Beverages',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/categories`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Beverages' })

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CATEGORY_EXISTS')
    })

    it('should reject category creation if role is CASHIER', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/categories`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Dairy' })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('should reject invalid empty name', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/categories`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: '' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('PATCH /api/v1/businesses/:businessId/categories/:categoryId', () => {
    it('should update a category successfully', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({
        id: 'cat-1',
        businessId: mockBusiness.id,
        name: 'Beverages',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      vi.spyOn(prisma.category, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.category, 'update').mockResolvedValue({
        id: 'cat-1',
        businessId: mockBusiness.id,
        name: 'Cold Beverages',
        description: 'Sodas and juices',
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/categories/cat-1`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Cold Beverages', description: 'Sodas and juices' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.category.name).toBe('Cold Beverages')
    })

    it('should return 404 if category does not exist in this business', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/categories/non-existent-cat`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ name: 'Updated Name' })

      expect(res.status).toBe(404)
    })
  })

  describe('DELETE /api/v1/businesses/:businessId/categories/:categoryId', () => {
    it('should safely delete a category when no products are associated', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({
        id: 'cat-2',
        businessId: mockBusiness.id,
        name: 'Empty Category',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { products: 0 },
      } as any)
      vi.spyOn(prisma.category, 'delete').mockResolvedValue({ id: 'cat-2' } as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/categories/cat-2`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/deleted/i)
    })

    it('should prevent deleting a category if it still contains products', async () => {
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({
        id: 'cat-1',
        businessId: mockBusiness.id,
        name: 'Beverages',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { products: 5 },
      } as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/categories/cat-1`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CATEGORY_IN_USE')
      expect(res.body.error.message).toMatch(/5 product\(s\)/i)
    })
  })
})
