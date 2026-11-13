import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, ProductCodeType, Prisma } from '@prisma/client'

describe('Product Code API', () => {
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
    description: 'Premium aromatic rice',
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
    codes: [],
  }

  const sampleCode = {
    id: 'code-1',
    businessId: mockBusiness.id,
    productId: sampleProduct.id,
    code: '6161101234567',
    type: ProductCodeType.EAN_13,
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
  })

  describe('GET /api/v1/businesses/:businessId/products/:productId/codes', () => {
    it('should list codes for a product', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.productCode, 'findMany').mockResolvedValue([sampleCode])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.codes).toHaveLength(1)
      expect(res.body.codes[0].code).toBe('6161101234567')
      expect(res.body.codes[0].type).toBe(ProductCodeType.EAN_13)
    })

    it('should return 404 if product not found in business', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/products/non-existent/codes`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/v1/businesses/:businessId/products/:productId/codes', () => {
    it('should add a valid barcode to product', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.productCode, 'create').mockResolvedValue(sampleCode)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          code: '6161101234567',
          type: 'EAN_13',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.code.code).toBe('6161101234567')
    })

    it('should reject duplicate code within the same business with 409', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue({
        ...sampleCode,
        product: { id: 'prod-2', name: 'Other Rice', sku: 'RICE-OTH' },
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          code: '6161101234567',
          type: 'EAN_13',
        })

      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CODE_EXISTS')
      expect(res.body.error.message).toMatch(/already assigned/i)
    })

    it('should reject invalid EAN-13 code (non-13 digits) with 400', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          code: '12345', // invalid length for EAN-13
          type: 'EAN_13',
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject cashier from adding codes (403 forbidden)', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          code: '6161101234567',
          type: 'EAN_13',
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('DELETE /api/v1/businesses/:businessId/products/:productId/codes/:codeId', () => {
    it('should remove a code safely', async () => {
      vi.spyOn(prisma.productCode, 'findFirst').mockResolvedValue(sampleCode)
      vi.spyOn(prisma.productCode, 'delete').mockResolvedValue(sampleCode)

      const res = await request(app)
        .delete(
          `/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes/${sampleCode.id}`
        )
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toMatch(/removed/i)
    })

    it('should return 404 if code does not exist', async () => {
      vi.spyOn(prisma.productCode, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .delete(
          `/api/v1/businesses/${mockBusiness.id}/products/${sampleProduct.id}/codes/non-existent`
        )
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })

  describe('GET /api/v1/businesses/:businessId/codes/resolve', () => {
    it('should resolve a product by registered barcode', async () => {
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue({
        ...sampleCode,
        product: sampleProduct,
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=6161101234567`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.matchedBy).toBe('BARCODE')
      expect(res.body.product.name).toBe('Basmati Rice 2kg')
      expect(res.body.product.sku).toBe('RICE-BAS-2KG')
    })

    it('should resolve product by SmartStock QR reference', async () => {
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)

      const res = await request(app)
        .get(
          `/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=smartstock:product:${sampleProduct.id}`
        )
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.matchedBy).toBe('QR_REFERENCE')
      expect(res.body.product.id).toBe(sampleProduct.id)
    })

    it('should resolve product by TillPro QR reference', async () => {
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)

      const res = await request(app)
        .get(
          `/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=tillpro:product:${sampleProduct.id}`
        )
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.matchedBy).toBe('QR_REFERENCE')
      expect(res.body.product.id).toBe(sampleProduct.id)
    })

    it('should resolve product by SKU fallback', async () => {
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(sampleProduct as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=RICE-BAS-2KG`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.matchedBy).toBe('SKU')
      expect(res.body.product.sku).toBe('RICE-BAS-2KG')
    })

    it('should return 404 CODE_NOT_FOUND when code is unknown', async () => {
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=UNKNOWN_BARCODE_999`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('CODE_NOT_FOUND')
    })

    it('should correctly indicate archived product status', async () => {
      vi.spyOn(prisma.productCode, 'findUnique').mockResolvedValue({
        ...sampleCode,
        product: { ...sampleProduct, isActive: false },
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=6161101234567`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.product.isActive).toBe(false)
    })

    it('should reject unauthenticated request with 401', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(null)

      const res = await request(app).get(
        `/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=6161101234567`
      )

      expect(res.status).toBe(401)
    })

    it('should reject non-member with 404 (tenant boundary)', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/codes/resolve?code=6161101234567`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })
})
