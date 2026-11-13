import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import {
  Role,
  Prisma,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  StockMovementType,
} from '@prisma/client'

describe('POS & Sales Transactions API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-cashier',
    name: 'Wanjiku Kamau',
    email: 'wanjiku@smartstock.co.ke',
    passwordHash: 'hash',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockSession = {
    id: 'session-cashier',
    token: 'cashier-session-token',
    userId: mockUser.id,
    expiresAt: new Date(Date.now() + 1000000),
    createdAt: new Date(),
    user: mockUser,
  }

  const mockBusiness = {
    id: 'biz-1',
    name: 'Nairobi Super Fresh Retail',
    slug: 'nairobi-super-fresh-1',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockCashierMembership = {
    id: 'mem-cashier',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockOwnerMembership = {
    id: 'mem-owner',
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

  const sampleProductA = {
    id: '550e8400-e29b-41d4-a716-446655440010',
    businessId: mockBusiness.id,
    name: 'Unga wa Dola Maize Flour 2kg',
    sku: 'UNGA-DOLA-2KG',
    unit: 'pack',
    costPrice: new Prisma.Decimal('160.00'),
    sellingPrice: new Prisma.Decimal('210.00'),
    minStockThreshold: 10,
    isActive: true,
  }

  const sampleProductB = {
    id: '550e8400-e29b-41d4-a716-446655440020',
    businessId: mockBusiness.id,
    name: 'Fresh Dairy Milk 500ml',
    sku: 'MILK-FD-500ML',
    unit: 'pouch',
    costPrice: new Prisma.Decimal('50.00'),
    sellingPrice: new Prisma.Decimal('65.00'),
    minStockThreshold: 20,
    isActive: true,
  }

  const sampleStockLevelA = {
    id: 'stock-a',
    businessId: mockBusiness.id,
    productId: sampleProductA.id,
    quantity: new Prisma.Decimal('50.0000'),
    reservedQuantity: new Prisma.Decimal('0.0000'),
    lastUpdated: new Date(),
  }

  const sampleStockLevelB = {
    id: 'stock-b',
    businessId: mockBusiness.id,
    productId: sampleProductB.id,
    quantity: new Prisma.Decimal('100.0000'),
    reservedQuantity: new Prisma.Decimal('0.0000'),
    lastUpdated: new Date(),
  }

  const sampleSale = {
    id: 'sale-001',
    businessId: mockBusiness.id,
    receiptNumber: 'REC-0001',
    cashierId: mockUser.id,
    status: SaleStatus.COMPLETED,
    subtotal: new Prisma.Decimal('420.00'),
    discount: new Prisma.Decimal('0.00'),
    taxAmount: new Prisma.Decimal('0.00'),
    total: new Prisma.Decimal('420.00'),
    currency: 'KES',
    paymentStatus: PaymentStatus.PAID,
    customerName: 'John Doe',
    customerPhone: '+254700112233',
    notes: null,
    idempotencyKey: 'sale-key-001',
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    cashier: mockUser,
    business: mockBusiness,
    items: [
      {
        id: 'item-1',
        saleId: 'sale-001',
        productId: sampleProductA.id,
        productName: sampleProductA.name,
        productSku: sampleProductA.sku,
        unit: 'pack',
        quantity: new Prisma.Decimal('2.0000'),
        unitPrice: new Prisma.Decimal('210.00'),
        unitCost: new Prisma.Decimal('160.00'),
        discount: new Prisma.Decimal('0.00'),
        taxAmount: new Prisma.Decimal('0.00'),
        lineTotal: new Prisma.Decimal('420.00'),
        product: sampleProductA,
      },
    ],
    payments: [
      {
        id: 'pay-1',
        businessId: mockBusiness.id,
        saleId: 'sale-001',
        method: PaymentMethod.CASH,
        amount: new Prisma.Decimal('420.00'),
        amountTendered: new Prisma.Decimal('500.00'),
        changeDue: new Prisma.Decimal('80.00'),
        reference: null,
        createdAt: new Date(),
      },
    ],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)
    vi.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness)
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma))
  })

  describe('POST /api/v1/businesses/:businessId/sales (POS Checkout)', () => {
    it('should complete cash sale, calculate change due, deduct stock, and record ledger', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any])
      vi.spyOn(prisma.sale, 'count').mockResolvedValue(0)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevelA as any)
      const stockUpdateSpy = vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({} as any)
      const stockMovementSpy = vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({} as any)
      vi.spyOn(prisma.sale, 'create').mockResolvedValue(sampleSale as any)

      // Cashier buys 2 packs of Unga @ 210 = 420. Tendered 500 => Change 80
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 2,
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 500,
          },
          customerName: 'John Doe',
          customerPhone: '+254700112233',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.sale.receiptNumber).toBe('REC-0001')
      expect(res.body.sale.total).toBe('420')

      // Verify stock deducted
      expect(stockUpdateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleStockLevelA.id },
          data: {
            quantity: expect.anything(),
          },
        })
      )

      // Verify immutable stock movement logged
      expect(stockMovementSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            businessId: mockBusiness.id,
            productId: sampleProductA.id,
            type: StockMovementType.STOCK_OUT,
            userId: mockUser.id,
          }),
        })
      )
    })

    it('should reject cash sale when amount tendered is less than total', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any])

      // Total is 2 * 210 = 420. Tendered only 400!
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 2,
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 400,
          },
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INSUFFICIENT_PAYMENT')
      expect(res.body.error.message).toMatch(/Amount tendered .* is less than total amount due/i)
    })

    it('should complete mobile money (M-Pesa) sale with transaction reference', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any])
      vi.spyOn(prisma.sale, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevelA as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({} as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({} as any)

      const mpesaSale = {
        ...sampleSale,
        receiptNumber: 'REC-0002',
        payments: [
          {
            id: 'pay-mpesa',
            businessId: mockBusiness.id,
            saleId: 'sale-001',
            method: PaymentMethod.MOBILE_MONEY,
            amount: new Prisma.Decimal('420.00'),
            amountTendered: new Prisma.Decimal('420.00'),
            changeDue: new Prisma.Decimal('0.00'),
            reference: 'QH82KL491X',
          },
        ],
      }
      vi.spyOn(prisma.sale, 'create').mockResolvedValue(mpesaSale as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 2,
            },
          ],
          payment: {
            method: 'MOBILE_MONEY',
            reference: 'QH82KL491X',
          },
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.sale.payments[0].method).toBe('MOBILE_MONEY')
      expect(res.body.sale.payments[0].reference).toBe('QH82KL491X')
    })

    it('should strictly reject sale when stock is insufficient (no negative stock)', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any])
      // Available quantity is 5
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue({
        ...sampleStockLevelA,
        quantity: new Prisma.Decimal('5.0000'),
      } as any)

      // Requesting 10 units!
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 10,
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 3000,
          },
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('INSUFFICIENT_STOCK')
      expect(res.body.error.message).toMatch(/Insufficient stock for 'Unga wa Dola/i)
    })

    it('should ignore client-submitted prices and use database sellingPrice', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any]) // DB price is 210
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevelA as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({} as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({} as any)

      const saleCreateSpy = vi.spyOn(prisma.sale, 'create').mockResolvedValue(sampleSale as any)

      // Malicious or buggy client attempts to submit unitPrice: 10.00
      await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 1,
              unitPrice: 10, // Must be ignored!
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 250,
          },
        })

      // Check that server used product.sellingPrice (210) for total
      expect(saleCreateSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subtotal: new Prisma.Decimal('210.00'),
            total: new Prisma.Decimal('210.00'),
          }),
        })
      )
    })

    it('should forbid CASHIER from applying custom discounts without manager authorization', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any])

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 1,
            },
          ],
          discount: 50, // Cashier trying to give a 50 KES discount!
          payment: {
            method: 'CASH',
            amountTendered: 200,
          },
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('DISCOUNT_NOT_AUTHORIZED')
    })

    it('should allow OWNER to apply discounts on sale', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProductA as any])
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevelA as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({} as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({} as any)

      const discountedSale = {
        ...sampleSale,
        subtotal: new Prisma.Decimal('210.00'),
        discount: new Prisma.Decimal('20.00'),
        total: new Prisma.Decimal('190.00'),
      }
      vi.spyOn(prisma.sale, 'create').mockResolvedValue(discountedSale as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 1,
            },
          ],
          discount: 20, // Owner authorized discount
          payment: {
            method: 'CASH',
            amountTendered: 200,
          },
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.sale.discount).toBe('20')
    })

    it('should reject selling archived or inactive products', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([
        {
          ...sampleProductA,
          isActive: false, // Archived product!
        } as any,
      ])

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 1,
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 250,
          },
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('PRODUCT_NOT_ACTIVE')
    })

    it('should forbid STOCK_CLERK from checkout operations with 403', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockStockClerkMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          items: [
            {
              productId: sampleProductA.id,
              quantity: 1,
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 250,
          },
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('should deduplicate checkout using idempotencyKey without deducting stock twice', async () => {
      vi.spyOn(prisma.sale, 'findUnique').mockResolvedValue(sampleSale as any)
      const stockUpdateSpy = vi.spyOn(prisma.stockLevel, 'update')

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({
          idempotencyKey: 'sale-key-001',
          items: [
            {
              productId: sampleProductA.id,
              quantity: 2,
            },
          ],
          payment: {
            method: 'CASH',
            amountTendered: 500,
          },
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.sale.receiptNumber).toBe('REC-0001')
      // Stock update should not be called since duplicate request was detected
      expect(stockUpdateSpy).not.toHaveBeenCalled()
    })
  })

  describe('GET /api/v1/businesses/:businessId/sales (Sales History & Reports)', () => {
    it('should list sales with pagination and filters', async () => {
      vi.spyOn(prisma.sale, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([sampleSale as any])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/sales?page=1&limit=10`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.sales).toHaveLength(1)
      expect(res.body.sales[0].receiptNumber).toBe('REC-0001')
      expect(res.body.pagination.total).toBe(1)
    })

    it('should retrieve single sale detail with snapshots and payments', async () => {
      vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue(sampleSale as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/sales/sale-001`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.sale.receiptNumber).toBe('REC-0001')
      expect(res.body.sale.items[0].productName).toBe(sampleProductA.name)
    })

    it('should return sales summary metrics for dashboard', async () => {
      vi.spyOn(prisma.sale, 'findMany')
        .mockResolvedValueOnce([sampleSale as any]) // todaySales
        .mockResolvedValueOnce([sampleSale as any]) // recentSales
      vi.spyOn(prisma.sale, 'count').mockResolvedValue(1) // totalCompletedCount

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/sales/summary`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.summary.todaySalesValue).toBe(420)
      expect(res.body.summary.todayTransactionsCount).toBe(1)
      expect(res.body.summary.averageTransactionValue).toBe(420)
      expect(res.body.summary.recentSales).toHaveLength(1)
    })

    it('should reject cancelling a completed sale to preserve audit trail', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
      vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue(sampleSale as any) // status is COMPLETED

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/sales/sale-001/cancel`)
        .set('Cookie', ['smartstock_session=cashier-session-token'])
        .send({ reason: 'Customer changed mind' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('COMPLETED_SALE_CANNOT_BE_CANCELLED')
      expect(res.body.error.message).toMatch(/Completed sales cannot be cancelled directly/i)
    })
  })
})
