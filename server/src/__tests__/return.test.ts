import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import {
  Role,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  ReturnRestockAction,
  StockMovementType,
  Prisma,
} from '@prisma/client'

describe('Sales Return & Refund API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-1',
    name: 'Alice Wanjiku',
    email: 'alice@smartstock.co.ke',
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
    name: 'Nairobi Mini-Mart',
    slug: 'nairobi-mini-mart',
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

  const mockClerkMembership = {
    id: 'mem-3',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.STOCK_CLERK,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockSaleItem1 = {
    id: 'c1d9f8e0-1111-4000-8000-000000000001',
    saleId: 'd2e0a1f2-2222-4000-8000-000000000002',
    productId: 'prod-1',
    productName: 'Jogoo Maize Flour 2kg',
    productSku: 'JOG-2KG-01',
    unit: 'packet',
    quantity: new Prisma.Decimal(5),
    unitPrice: new Prisma.Decimal(200),
    unitCost: new Prisma.Decimal(170),
    discount: new Prisma.Decimal(0),
    taxAmount: new Prisma.Decimal(0),
    lineTotal: new Prisma.Decimal(1000),
    quantityReturned: new Prisma.Decimal(0),
    notes: null,
  }

  const mockCompletedSale = {
    id: 'd2e0a1f2-2222-4000-8000-000000000002',
    businessId: mockBusiness.id,
    receiptNumber: 'REC-0001',
    cashierId: mockUser.id,
    customerId: null,
    status: SaleStatus.COMPLETED,
    subtotal: new Prisma.Decimal(1000),
    discount: new Prisma.Decimal(0),
    taxAmount: new Prisma.Decimal(0),
    total: new Prisma.Decimal(1000),
    currency: 'KES',
    paymentStatus: PaymentStatus.PAID,
    customerName: 'Walk-in Customer',
    customerPhone: null,
    notes: null,
    idempotencyKey: null,
    completedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    items: [mockSaleItem1],
    returns: [],
  }

  const sampleReturn = {
    id: 'ret-1',
    businessId: mockBusiness.id,
    saleId: mockCompletedSale.id,
    customerId: null,
    returnNumber: 'RET-0001',
    reason: 'Customer bought excess packets',
    refundMethod: PaymentMethod.CASH,
    refundAmount: new Prisma.Decimal(400),
    refundReference: null,
    notes: null,
    idempotencyKey: null,
    processedById: mockUser.id,
    createdAt: new Date(),
    updatedAt: new Date(),
    sale: {
      id: mockCompletedSale.id,
      receiptNumber: 'REC-0001',
      total: new Prisma.Decimal(1000),
      paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
      createdAt: new Date(),
    },
    customer: null,
    processedBy: { id: mockUser.id, name: mockUser.name, email: mockUser.email },
    items: [
      {
        id: 'ret-item-1',
        saleReturnId: 'ret-1',
        saleItemId: mockSaleItem1.id,
        productId: 'prod-1',
        quantityReturned: new Prisma.Decimal(2),
        unitRefundPrice: new Prisma.Decimal(200),
        refundSubtotal: new Prisma.Decimal(400),
        restockAction: ReturnRestockAction.RESTOCK,
        product: { id: 'prod-1', name: 'Jogoo Maize Flour 2kg', sku: 'JOG-2KG-01', unit: 'packet' },
      },
    ],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any)
  })

  describe('GET /api/v1/businesses/:businessId/returns', () => {
    it('should list sales returns with pagination', async () => {
      vi.spyOn(prisma.saleReturn, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([sampleReturn] as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/returns`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.returns).toHaveLength(1)
      expect(res.body.returns[0].returnNumber).toBe('RET-0001')
      expect(res.body.pagination.total).toBe(1)
    })

    it('should forbid stock clerks from listing returns', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockClerkMembership as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/returns`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
    })
  })

  describe('GET /api/v1/businesses/:businessId/returns/:returnId', () => {
    it('should get return details by ID', async () => {
      vi.spyOn(prisma.saleReturn, 'findFirst').mockResolvedValue(sampleReturn as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/returns/${sampleReturn.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.returnRecord.returnNumber).toBe('RET-0001')
    })
  })

  describe('POST /api/v1/businesses/:businessId/returns', () => {
    it('should process sales return and increment stock balance with RESTOCK action', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)
      vi.spyOn(prisma.saleReturn, 'count').mockResolvedValue(0)
      vi.spyOn(prisma.saleReturn, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue(mockCompletedSale as any)

      // Mock transaction execution
      const stockLevelMock = {
        id: 'stock-1',
        businessId: mockBusiness.id,
        productId: 'prod-1',
        quantity: new Prisma.Decimal(10),
        reservedQuantity: new Prisma.Decimal(0),
      }

      vi.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        const tx = {
          saleReturn: {
            create: vi.fn().mockResolvedValue(sampleReturn),
            findUnique: vi.fn().mockResolvedValue(sampleReturn),
          },
          stockLevel: {
            findUnique: vi.fn().mockResolvedValue(stockLevelMock),
            update: vi.fn().mockResolvedValue({
              ...stockLevelMock,
              quantity: new Prisma.Decimal(12),
            }),
          },
          stockMovement: {
            create: vi.fn().mockResolvedValue({
              id: 'mov-1',
              type: StockMovementType.RETURN,
              quantityChange: new Prisma.Decimal(2),
            }),
          },
          saleItem: {
            update: vi.fn().mockResolvedValue({
              ...mockSaleItem1,
              quantityReturned: new Prisma.Decimal(2),
            }),
            findMany: vi.fn().mockResolvedValue([
              {
                ...mockSaleItem1,
                quantity: new Prisma.Decimal(5),
                quantityReturned: new Prisma.Decimal(2),
              },
            ]),
          },
          saleReturnItem: {
            create: vi.fn().mockResolvedValue({ id: 'ret-item-1' }),
          },
          sale: {
            update: vi.fn().mockResolvedValue({
              ...mockCompletedSale,
              paymentStatus: PaymentStatus.PARTIALLY_REFUNDED,
            }),
          },
        }
        return callback(tx)
      })

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/returns`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          saleId: mockCompletedSale.id,
          refundMethod: PaymentMethod.CASH,
          reason: 'Customer bought excess packets',
          items: [
            {
              saleItemId: mockSaleItem1.id,
              quantity: 2,
              restockAction: ReturnRestockAction.RESTOCK,
            },
          ],
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.returnRecord.returnNumber).toBe('RET-0001')
    })

    it('should reject return if requested quantity exceeds original line quantity (over-return guard)', async () => {
      vi.spyOn(prisma.saleReturn, 'count').mockResolvedValue(0)
      vi.spyOn(prisma.saleReturn, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue(mockCompletedSale as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/returns`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          saleId: mockCompletedSale.id,
          refundMethod: PaymentMethod.CASH,
          items: [
            {
              saleItemId: mockSaleItem1.id,
              quantity: 10, // Original was only 5!
              restockAction: ReturnRestockAction.RESTOCK,
            },
          ],
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('OVER_RETURN_EXCEEDED')
    })

    it('should reject return if sale is already fully refunded', async () => {
      vi.spyOn(prisma.saleReturn, 'count').mockResolvedValue(0)
      vi.spyOn(prisma.saleReturn, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.sale, 'findFirst').mockResolvedValue({
        ...mockCompletedSale,
        paymentStatus: PaymentStatus.REFUNDED,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/returns`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          saleId: mockCompletedSale.id,
          refundMethod: PaymentMethod.CASH,
          items: [
            {
              saleItemId: mockSaleItem1.id,
              quantity: 1,
              restockAction: ReturnRestockAction.RESTOCK,
            },
          ],
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('SALE_ALREADY_REFUNDED')
    })

    it('should return existing return if idempotency key matches', async () => {
      vi.spyOn(prisma.saleReturn, 'findUnique').mockResolvedValue(sampleReturn as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/returns`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          saleId: mockCompletedSale.id,
          idempotencyKey: 'idemp-12345',
          refundMethod: PaymentMethod.CASH,
          items: [
            {
              saleItemId: mockSaleItem1.id,
              quantity: 2,
              restockAction: ReturnRestockAction.RESTOCK,
            },
          ],
        })

      expect(res.status).toBe(201)
      expect(res.body.returnRecord.returnNumber).toBe('RET-0001')
    })
  })
})
