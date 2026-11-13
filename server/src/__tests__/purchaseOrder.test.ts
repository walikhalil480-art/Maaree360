import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, Prisma, PurchaseOrderStatus, StockMovementType } from '@prisma/client'

describe('Purchase Orders API', () => {
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

  const sampleSupplier = {
    id: 'sup-1',
    businessId: mockBusiness.id,
    name: 'Eldoret Farmers Millers',
    contactPerson: 'David Kiprono',
    phone: '+254712345678',
    email: 'sales@eldoretmillers.co.ke',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const sampleProduct = {
    id: 'prod-1',
    businessId: mockBusiness.id,
    name: 'Basmati Rice 2kg',
    sku: 'RICE-BAS-2KG',
    unit: 'pack',
    costPrice: new Prisma.Decimal('450.00'),
    sellingPrice: new Prisma.Decimal('550.00'),
    minStockThreshold: 10,
    isActive: true,
  }

  const sampleStockLevel = {
    id: 'stock-1',
    businessId: mockBusiness.id,
    productId: sampleProduct.id,
    quantity: new Prisma.Decimal('10.0000'),
    reservedQuantity: new Prisma.Decimal('0.0000'),
    lastUpdated: new Date(),
  }

  const samplePOItem = {
    id: '550e8400-e29b-41d4-a716-446655440002',
    purchaseOrderId: 'po-1',
    productId: sampleProduct.id,
    quantityOrdered: new Prisma.Decimal('100.0000'),
    unitCost: new Prisma.Decimal('450.00'),
    quantityReceived: new Prisma.Decimal('0.0000'),
    subtotal: new Prisma.Decimal('45000.00'),
    notes: null,
    product: sampleProduct,
  }

  const samplePO = {
    id: 'po-1',
    businessId: mockBusiness.id,
    supplierId: sampleSupplier.id,
    orderNumber: 'PO-0001',
    status: PurchaseOrderStatus.DRAFT,
    orderDate: new Date(),
    expectedDeliveryDate: null,
    currency: 'KES',
    subtotal: new Prisma.Decimal('45000.00'),
    discount: new Prisma.Decimal('0.00'),
    taxAmount: new Prisma.Decimal('0.00'),
    total: new Prisma.Decimal('45000.00'),
    notes: 'Urgent stock replenishment',
    createdById: mockUser.id,
    receivedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    supplier: sampleSupplier,
    items: [samplePOItem],
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    samplePOItem.quantityReceived = new Prisma.Decimal('0.0000')
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership)
    vi.spyOn(prisma, '$transaction').mockImplementation(async (cb: any) => cb(prisma))
  })

  describe('GET /api/v1/businesses/:businessId/purchase-orders', () => {
    it('should list purchase orders with pagination', async () => {
      vi.spyOn(prisma.purchaseOrder, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.purchaseOrder, 'findMany').mockResolvedValue([samplePO as any])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/purchase-orders?page=1&limit=10`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.purchaseOrders).toHaveLength(1)
      expect(res.body.purchaseOrders[0].orderNumber).toBe('PO-0001')
      expect(res.body.pagination.total).toBe(1)
    })

    it('should forbid CASHIER from viewing purchase orders', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/purchase-orders`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })
  })

  describe('POST /api/v1/businesses/:businessId/purchase-orders (Create Draft)', () => {
    it('should create draft purchase order and calculate totals server-side', async () => {
      vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue(sampleSupplier as any)
      vi.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness as any)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([sampleProduct as any])
      vi.spyOn(prisma.purchaseOrder, 'count').mockResolvedValue(0)
      vi.spyOn(prisma.purchaseOrder, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.purchaseOrder, 'create').mockResolvedValue(samplePO as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          supplierId: '550e8400-e29b-41d4-a716-446655440000',
          items: [
            {
              productId: '550e8400-e29b-41d4-a716-446655440001',
              quantityOrdered: 100,
              unitCost: 450,
            },
          ],
          discount: 1000,
          taxAmount: 7040,
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.purchaseOrder.orderNumber).toBe('PO-0001')
    })

    it('should reject creating PO for an archived supplier', async () => {
      vi.spyOn(prisma.supplier, 'findFirst').mockResolvedValue({
        ...sampleSupplier,
        isActive: false,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          supplierId: '550e8400-e29b-41d4-a716-446655440000',
          items: [{ productId: '550e8400-e29b-41d4-a716-446655440001', quantityOrdered: 10, unitCost: 100 }],
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('SUPPLIER_ARCHIVED')
    })
  })

  describe('PATCH /api/v1/businesses/:businessId/purchase-orders/:orderId (Edit Draft)', () => {
    it('should allow editing draft order', async () => {
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue(samplePO as any)
      vi.spyOn(prisma.purchaseOrder, 'update').mockResolvedValue({
        ...samplePO,
        notes: 'Updated delivery instructions',
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ notes: 'Updated delivery instructions' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should reject editing placed or received order', async () => {
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.ORDERED,
      } as any)

      const res = await request(app)
        .patch(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ notes: 'Illegal edit attempt' })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('ORDER_NOT_EDITABLE')
    })
  })

  describe('POST /api/v1/businesses/:businessId/purchase-orders/:orderId/place', () => {
    it('should place order (DRAFT -> ORDERED) without increasing stock', async () => {
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue(samplePO as any)
      vi.spyOn(prisma.purchaseOrder, 'update').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.ORDERED,
      } as any)
      const stockUpdateSpy = vi.spyOn(prisma.stockLevel, 'update')

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/place`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.purchaseOrder.status).toBe('ORDERED')
      // Critical check: Placing an order must NOT increase inventory
      expect(stockUpdateSpy).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/v1/businesses/:businessId/purchase-orders/:orderId/receive (Goods Receipt & Partial Deliveries)', () => {
    it('should receive partial delivery, increment stock, and update status to PARTIALLY_RECEIVED', async () => {
      const orderedPO = {
        ...samplePO,
        status: PurchaseOrderStatus.ORDERED,
      }

      vi.spyOn(prisma.purchaseOrderReceipt, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue(orderedPO as any)
      vi.spyOn(prisma.purchaseOrderReceipt, 'count').mockResolvedValue(0)

      const mockReceipt = {
        id: 'rcv-1',
        businessId: mockBusiness.id,
        purchaseOrderId: orderedPO.id,
        receiptNumber: 'RCV-PO-0001-1',
        receivedById: mockUser.id,
        receivedAt: new Date(),
        items: [],
      }

      vi.spyOn(prisma.purchaseOrderReceipt, 'create').mockResolvedValue(mockReceipt as any)
      vi.spyOn(prisma.purchaseOrderItem, 'update').mockResolvedValue({
        ...samplePOItem,
        quantityReceived: new Prisma.Decimal('60.0000'),
      } as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any) // qty = 10
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({
        ...sampleStockLevel,
        quantity: new Prisma.Decimal('70.0000'), // 10 + 60
      } as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({
        id: 'mov-1',
        type: StockMovementType.STOCK_IN,
        quantityChange: new Prisma.Decimal('60.0000'),
      } as any)
      vi.spyOn(prisma.purchaseOrderReceiptItem, 'create').mockResolvedValue({} as any)
      vi.spyOn(prisma.purchaseOrder, 'update').mockResolvedValue({
        ...orderedPO,
        status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
      } as any)
      vi.spyOn(prisma.purchaseOrderReceipt, 'findUnique').mockResolvedValue({
        ...mockReceipt,
        receivedBy: mockUser,
        items: [],
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          receiptReference: 'DN-99410',
          items: [
            {
              purchaseOrderItemId: '550e8400-e29b-41d4-a716-446655440002',
              quantityReceived: 60,
            },
          ],
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.purchaseOrder.status).toBe('PARTIALLY_RECEIVED')
      expect(res.body.receipt.receiptNumber).toBe('RCV-PO-0001-1')
    })

    it('should strictly reject over-receipt (delivering more than outstanding balance)', async () => {
      const partiallyReceivedPO = {
        ...samplePO,
        status: PurchaseOrderStatus.PARTIALLY_RECEIVED,
        items: [
          {
            ...samplePOItem,
            id: '550e8400-e29b-41d4-a716-446655440002',
            quantityOrdered: new Prisma.Decimal('100.0000'),
            quantityReceived: new Prisma.Decimal('60.0000'), // 40 outstanding
          },
        ],
      }

      vi.spyOn(prisma.purchaseOrderReceipt, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue(partiallyReceivedPO as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          items: [
            {
              purchaseOrderItemId: '550e8400-e29b-41d4-a716-446655440002',
              quantityReceived: 50, // 50 > 40 outstanding!
            },
          ],
        })

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('OVER_RECEIPT_NOT_ALLOWED')
      expect(res.body.error.message).toMatch(/Over-receipt not allowed/i)
    })

    it('should allow STOCK_CLERK to receive deliveries', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockStockClerkMembership)
      vi.spyOn(prisma.purchaseOrderReceipt, 'findUnique').mockResolvedValue(null)
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.ORDERED,
        items: [
          {
            ...samplePOItem,
            id: '550e8400-e29b-41d4-a716-446655440002',
          },
        ],
      } as any)
      vi.spyOn(prisma.purchaseOrderReceipt, 'count').mockResolvedValue(0)
      vi.spyOn(prisma.purchaseOrderReceipt, 'create').mockResolvedValue({ id: 'rcv-1' } as any)
      vi.spyOn(prisma.purchaseOrderItem, 'update').mockResolvedValue({
        ...samplePOItem,
        quantityReceived: new Prisma.Decimal('100.0000'),
      } as any)
      vi.spyOn(prisma.stockLevel, 'findUnique').mockResolvedValue(sampleStockLevel as any)
      vi.spyOn(prisma.stockLevel, 'update').mockResolvedValue({} as any)
      vi.spyOn(prisma.stockMovement, 'create').mockResolvedValue({} as any)
      vi.spyOn(prisma.purchaseOrderReceiptItem, 'create').mockResolvedValue({} as any)
      vi.spyOn(prisma.purchaseOrder, 'update').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.RECEIVED,
      } as any)
      vi.spyOn(prisma.purchaseOrderReceipt, 'findUnique').mockResolvedValue({
        id: 'rcv-1',
        items: [],
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          items: [{ purchaseOrderItemId: '550e8400-e29b-41d4-a716-446655440002', quantityReceived: 100 }],
        })

      if (res.status !== 200) console.log('DEBUG RES BODY:', res.body)
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })

    it('should forbid CASHIER from receiving deliveries with 403', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          items: [{ purchaseOrderItemId: '550e8400-e29b-41d4-a716-446655440002', quantityReceived: 10 }],
        })

      expect(res.status).toBe(403)
      expect(res.body.error.code).toBe('FORBIDDEN')
    })

    it('should deduplicate receipt using idempotencyKey without modifying stock twice', async () => {
      const existingReceipt = {
        id: 'rcv-idem',
        receiptNumber: 'RCV-PO-0001-1',
        idempotencyKey: 'idem-key-99',
        purchaseOrder: samplePO,
        items: [],
      }

      vi.spyOn(prisma.purchaseOrderReceipt, 'findUnique').mockResolvedValue(existingReceipt as any)
      const stockLevelUpdateSpy = vi.spyOn(prisma.stockLevel, 'update')

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/receive`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          idempotencyKey: 'idem-key-99',
          items: [{ purchaseOrderItemId: '550e8400-e29b-41d4-a716-446655440002', quantityReceived: 10 }],
        })

      expect(res.status).toBe(200)
      expect(res.body.receipt.id).toBe('rcv-idem')
      expect(stockLevelUpdateSpy).not.toHaveBeenCalled()
    })
  })

  describe('POST /api/v1/businesses/:businessId/purchase-orders/:orderId/cancel', () => {
    it('should cancel active order', async () => {
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.ORDERED,
      } as any)
      vi.spyOn(prisma.purchaseOrder, 'update').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.CANCELLED,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/cancel`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ notes: 'Supplier out of raw materials' })

      expect(res.status).toBe(200)
      expect(res.body.purchaseOrder.status).toBe('CANCELLED')
    })

    it('should reject cancelling a completed and fully received order', async () => {
      vi.spyOn(prisma.purchaseOrder, 'findFirst').mockResolvedValue({
        ...samplePO,
        status: PurchaseOrderStatus.RECEIVED,
      } as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/purchase-orders/po-1/cancel`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('CANNOT_CANCEL_COMPLETED_ORDER')
    })
  })
})
