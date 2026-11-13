import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, Prisma, StockMovementType } from '@prisma/client'

describe('Inventory & Stock Tracking API', () => {
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

  const mockStockClerkMembership = {
    id: 'mem-clerk',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.STOCK_CLERK,
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

  const sampleStockLevel = {
    id: 'stock-1',
    businessId: mockBusiness.id,
    productId: sampleProduct.id,
    quantity: new Prisma.Decimal('25.0000'),
    reservedQuantity: new Prisma.Decimal('0.0000'),
    lastUpdated: new Date(),
    createdAt: new Date(),
  }

  const sampleMovement = {
    id: 'mov-1',
    businessId: mockBusiness.id,
    productId: sampleProduct.id,
    type: StockMovementType.STOCK_IN,
    quantityChange: new Prisma.Decimal('15.0000'),
    previousQuantity: new Prisma.Decimal('10.0000'),
    resultingQuantity: new Prisma.Decimal('25.0000'),
    reason: 'Initial supplier delivery',
    reference: 'PO-1001',
    idempotencyKey: null,
    userId: mockUser.id,
    createdAt: new Date(),
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
    // Make $transaction execute the callback passing prisma itself
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma))
  })

  describe('GET /api/v1/businesses/:businessId/inventory', () => {
    it('should list inventory stock balances with pagination', async () => {
      vi.spyOn(prisma.product, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([
        {
          ...sampleProduct,
          stockLevel: sampleStockLevel,
        } as any,
      ])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/inventory?page=1&limit=10`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.items).toHaveLength(1)
      expect(res.body.items[0].product.name).toBe('Basmati Rice 2kg')
      expect(res.body.items[0].stockLevel.quantity).toBe(25)
      expect(res.body.pagination.total).toBe(1)
    })

    it('should reject unauthenticated requests with 401', async () => {
      vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(null)

      const res = await request(app).get(`/api/v1/businesses/${mockBusiness.id}/inventory`)

      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/v1/businesses/:businessId/inventory/low-stock', () => {
    it('should return products where quantity is at or below minStockThreshold', async () => {
      const lowProduct = {
        ...sampleProduct,
        minStockThreshold: 10,
        stockLevel: {
          ...sampleStockLevel,
          quantity: new Prisma.Decimal('4.0000'),
        },
      }

      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([lowProduct as any])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/inventory/low-stock`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.count).toBe(1)
      expect(res.body.items[0].productId).toBe(sampleProduct.id)
      expect(res.body.items[0].currentQuantity).toBe(4)
      expect(res.body.items[0].minStockThreshold).toBe(10)
    })
  })

  describe('GET /api/v1/businesses/:businessId/inventory/products/:productId', () => {
    it('should return single product stock level and recent movements', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue({
        ...sampleProduct,
        stockLevel: sampleStockLevel,
        stockMovements: [sampleMovement as any],
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.product.sku).toBe('RICE-BAS-2KG')
      expect(res.body.stockLevel.quantity).toBe(25)
      expect(res.body.recentMovements).toHaveLength(1)
    })

    it('should return 404 if product not found in business', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/inventory/products/non-existent`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/v1/businesses/:businessId/inventory/products/:productId/opening-stock', () => {
    it('should record opening stock balance and audit movement', async () => {
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('50.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        ...sampleMovement,
        type: StockMovementType.OPENING_STOCK,
        quantityChange: new Prisma.Decimal('25.0000'),
        previousQuantity: new Prisma.Decimal('25.0000'),
        resultingQuantity: new Prisma.Decimal('50.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/opening-stock`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 50,
          reason: 'Initial physical inventory count',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.stockLevel.quantity)).toBe(50)
      expect(res.body.movement.type).toBe('OPENING_STOCK')
    })
  })

  describe('POST /api/v1/businesses/:businessId/inventory/products/:productId/receive', () => {
    it('should receive stock and increase quantity', async () => {
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('35.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        ...sampleMovement,
        type: StockMovementType.STOCK_IN,
        quantityChange: new Prisma.Decimal('10.0000'),
        previousQuantity: new Prisma.Decimal('25.0000'),
        resultingQuantity: new Prisma.Decimal('35.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 10,
          reason: 'Delivery from Supplier X',
          reference: 'INV-9921',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.stockLevel.quantity)).toBe(35)
      expect(Number(res.body.movement.quantityChange)).toBe(10)
    })

    it('should allow STOCK_CLERK to receive stock', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockStockClerkMembership)
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('30.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue(sampleMovement as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ quantity: 5 })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should forbid CASHIER from receiving stock with 403', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ quantity: 10 })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('POST /api/v1/businesses/:businessId/inventory/products/:productId/issue', () => {
    it('should issue stock and decrease quantity', async () => {
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any) // qty = 25
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('20.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        ...sampleMovement,
        type: StockMovementType.STOCK_OUT,
        quantityChange: new Prisma.Decimal('-5.0000'),
        previousQuantity: new Prisma.Decimal('25.0000'),
        resultingQuantity: new Prisma.Decimal('20.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/issue`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 5,
          reason: 'Internal transfer',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.stockLevel.quantity)).toBe(20)
    })

    it('should strictly reject issuing more stock than available (negative stock prevention)', async () => {
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('5.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/issue`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 10, // attempting to issue 10 when only 5 exist
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
      expect(res.body.error.message).toMatch(/Insufficient stock/i)
    })
  })

  describe('POST /api/v1/businesses/:businessId/inventory/products/:productId/adjust', () => {
    it('should adjust physical count with mode COUNT', async () => {
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('20.0000'),
      } as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('18.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        ...sampleMovement,
        type: StockMovementType.ADJUSTMENT_OUT,
        quantityChange: new Prisma.Decimal('-2.0000'),
        previousQuantity: new Prisma.Decimal('20.0000'),
        resultingQuantity: new Prisma.Decimal('18.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/adjust`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          mode: 'COUNT',
          countedQuantity: 18,
          reason: 'End-of-month stock count discrepancy',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.stockLevel.quantity)).toBe(18)
    })
  })

  describe('POST /api/v1/businesses/:businessId/inventory/products/:productId/loss-damage', () => {
    it('should record damage and deduct stock balance', async () => {
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('23.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        ...sampleMovement,
        type: StockMovementType.DAMAGE,
        quantityChange: new Prisma.Decimal('-2.0000'),
        previousQuantity: new Prisma.Decimal('25.0000'),
        resultingQuantity: new Prisma.Decimal('23.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/loss-damage`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 2,
          type: 'DAMAGE',
          reason: 'Water damaged packaging in transit',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.stockLevel.quantity)).toBe(23)
      expect(res.body.movement.type).toBe('DAMAGE')
    })
  })

  describe('POST /api/v1/businesses/:businessId/inventory/products/:productId/return', () => {
    it('should record return and restore stock balance', async () => {
      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findFirst').mockResolvedValue(sampleProduct as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('26.0000'),
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        ...sampleMovement,
        type: StockMovementType.RETURN,
        quantityChange: new Prisma.Decimal('1.0000'),
        previousQuantity: new Prisma.Decimal('25.0000'),
        resultingQuantity: new Prisma.Decimal('26.0000'),
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/return`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 1,
          reason: 'Customer returned sealed item',
          reference: 'RCP-1290',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Number(res.body.stockLevel.quantity)).toBe(26)
      expect(res.body.movement.type).toBe('RETURN')
    })
  })

  describe('Idempotency Key Deduplication', () => {
    it('should return existing movement and avoid double mutations if idempotency key was previously processed', async () => {
      const existingMovementWithProduct = {
        ...sampleMovement,
        idempotencyKey: 'idem-key-12345',
        product: {
          ...sampleProduct,
          stockLevel: sampleStockLevel,
        },
      }

      vi.spyOn(prisma.stockMovement, 'findUnique').mockResolvedValue(existingMovementWithProduct as any)
      const updateSpy = vi.spyOn(prisma.stockLevel, 'update')

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/inventory/products/${sampleProduct.id}/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          quantity: 10,
          idempotencyKey: 'idem-key-12345',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.movement.idempotencyKey).toBe('idem-key-12345')
      // Ensure no further database updates occurred
      expect(updateSpy).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/v1/businesses/:businessId/inventory/movements', () => {
    it('should list historical ledger movements with filter and pagination', async () => {
      vi.spyOn(prisma.stockMovement, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.stockMovement, 'findMany').mockResolvedValue([
        {
          ...sampleMovement,
          product: { id: sampleProduct.id, name: sampleProduct.name, sku: sampleProduct.sku },
          user: { id: mockUser.id, name: mockUser.name },
        } as any,
      ])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/inventory/movements?page=1&limit=20&type=STOCK_IN`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.movements).toHaveLength(1)
      expect(res.body.movements[0].type).toBe('STOCK_IN')
      expect(res.body.pagination.total).toBe(1)
    })

    it('should forbid CASHIER from accessing movement ledger with 403', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/inventory/movements`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })
})
