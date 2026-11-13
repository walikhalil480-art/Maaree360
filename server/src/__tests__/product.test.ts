import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, Prisma } from '@prisma/client'

describe('Product API', () => {
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

  const sampleProduct = {
    id: 'prod-1',
    businessId: mockBusiness.id,
    name: 'Basmati Rice 2kg',
    sku: 'RICE-BAS-2KG',
    description: 'Premium aromatic basmati rice',
    brand: 'Daawat',
    categoryId: 'cat-1',
    unit: 'pack',
    costPrice: new Prisma.Decimal('450.00'),
    sellingPrice: new Prisma.Decimal('550.00'),
    minStockThreshold: 10,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    category: { id: 'cat-1', name: 'Grains' },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
  })

  describe('GET /api/v1/businesses/:businessId/products', () => {
    it('should list products with pagination and category details', async () => {
      vi.spyOn(prisma.product, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProduct as any])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/products?page=1&limit=10`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.products).toHaveLength(1)
      expect(res.body.products[0].name).toBe('Basmati Rice 2kg')
      expect(res.body.pagination.total).toBe(1)
      expect(res.body.pagination.page).toBe(1)
    })

    it('should filter by search and category', async () => {
      const countSpy = vi.spyOn(prisma.product, 'count').mockResolvedValue(0)
      const findSpy = vi.spyOn(prisma.product, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .get(
          `/api/v1/businesses/${mockBusiness.id}/products?search=rice&categoryId=cat-1&isActive=true`
        )
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(countSpy).toHaveBeenCalled()
      expect(findSpy).toHaveBeenCalled()
    })

    it('should reject unauthenticated requests with 401', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(null)

      const res = await request(app).get(`/api/v1/businesses/${mockBusiness.id}/products`)

      expect(res.status).toBe(401)
    })

    it('should reject non-business members with 404', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/products`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/v1/businesses/:businessId/products', () => {
    it('should create product successfully', async () => {
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.category, 'findFirst').mockResolvedValue({
        id: 'cat-1',
        businessId: mockBusiness.id,
        name: 'Grains',
        description: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any)
      vi.spyOn(prisma.product, 'create').mockResolvedValue(sampleProduct as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Basmati Rice 2kg',
          sku: 'RICE-BAS-2KG',
          brand: 'Daawat',
          categoryId: '550e8400-e29b-41d4-a716-446655440000',
          unit: 'pack',
          costPrice: 450,
          sellingPrice: 550,
          minStockThreshold: 10,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.product.name).toBe('Basmati Rice 2kg')
    })

    it('should reject duplicate SKU within the same business', async () => {
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(sampleProduct as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Basmati Rice 2kg',
          sku: 'RICE-BAS-2KG',
          costPrice: 450,
          sellingPrice: 550,
        })

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('SKU_EXISTS')
    })

    it('should reject negative prices with 400 validation error', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Test Product',
          sku: 'TEST-SKU',
          costPrice: -10,
          sellingPrice: 100,
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject cashier from creating products', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          name: 'Test Product',
          sku: 'TEST-SKU',
          costPrice: 50,
          sellingPrice: 100,
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('GET /api/v1/businesses/:businessId/products/:productId', () => {
    it('should retrieve single product', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/products/prod-1`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.product.sku).toBe('RICE-BAS-2KG')
    })

    it('should return 404 if product not found', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/products/non-existent`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })

  describe('PATCH /api/v1/businesses/:businessId/products/:productId', () => {
    it('should update product fields', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.product, 'update').mockResolvedValue({
        ...sampleProduct,
        sellingPrice: new Prisma.Decimal('580.00'),
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/products/prod-1`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ sellingPrice: 580 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })

  describe('PATCH /archive and /reactivate', () => {
    it('should archive product', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.product, 'update').mockResolvedValue({
        ...sampleProduct,
        isActive: false,
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/products/prod-1/archive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/archived/i)
      expect(res.body.product.isActive).toBe(false)
    })

    it('should reactivate product', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue({
        ...sampleProduct,
        isActive: false,
      } as any)
      vi.spyOn(prisma.product, 'update').mockResolvedValue({
        ...sampleProduct,
        isActive: true,
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/products/prod-1/reactivate`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/reactivated/i)
      expect(res.body.product.isActive).toBe(true)
    })
  })
})
