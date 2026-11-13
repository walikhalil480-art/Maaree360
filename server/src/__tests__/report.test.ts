import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { escapeCsvCell } from '../services/report.service.js'
import { Role, Prisma, SaleStatus, PaymentMethod, ExpenseCategory } from '@prisma/client'

describe('Reports & Business Intelligence API', () => {
  const app = createApp()

  const mockUser = {
    id: 'user-alice',
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
    name: 'Nairobi Retail Hub',
    slug: 'nairobi-retail-hub',
    currency: 'KES',
    timezone: 'Africa/Nairobi',
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  const mockOwnerMembership = {
    id: 'mem-owner',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.OWNER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const mockCashierMembership = {
    id: 'mem-cashier',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.CASHIER,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const sampleSale = {
    id: 'sale-1',
    businessId: mockBusiness.id,
    receiptNumber: 'REC-0001',
    cashierId: mockUser.id,
    status: SaleStatus.COMPLETED,
    subtotal: new Prisma.Decimal(1000),
    discount: new Prisma.Decimal(50),
    taxAmount: new Prisma.Decimal(0),
    total: new Prisma.Decimal(950),
    currency: 'KES',
    createdAt: new Date('2026-10-10T10:00:00.000Z'),
    items: [
      {
        id: 'item-1',
        saleId: 'sale-1',
        productId: 'prod-1',
        productName: 'Blue Band Margarine 500g',
        productSku: 'BB-500G',
        quantity: new Prisma.Decimal(2),
        quantityReturned: new Prisma.Decimal(0),
        unitPrice: new Prisma.Decimal(250),
        unitCost: new Prisma.Decimal(180),
        discount: new Prisma.Decimal(0),
        taxAmount: new Prisma.Decimal(0),
        lineTotal: new Prisma.Decimal(500),
        product: {
          id: 'prod-1',
          name: 'Blue Band Margarine 500g',
          sku: 'BB-500G',
          costPrice: new Prisma.Decimal(180),
          sellingPrice: new Prisma.Decimal(250),
          category: { id: 'cat-1', name: 'Groceries' },
        },
      },
      {
        id: 'item-2',
        saleId: 'sale-1',
        productId: 'prod-2',
        productName: 'Jogoo Maize Flour 2kg',
        productSku: 'JOG-2KG',
        quantity: new Prisma.Decimal(3),
        quantityReturned: new Prisma.Decimal(0),
        unitPrice: new Prisma.Decimal(170),
        unitCost: null, // Test fallback to product costPrice
        discount: new Prisma.Decimal(10),
        taxAmount: new Prisma.Decimal(0),
        lineTotal: new Prisma.Decimal(500),
        product: {
          id: 'prod-2',
          name: 'Jogoo Maize Flour 2kg',
          sku: 'JOG-2KG',
          costPrice: new Prisma.Decimal(130),
          sellingPrice: new Prisma.Decimal(170),
          category: { id: 'cat-1', name: 'Groceries' },
        },
      },
    ],
    payments: [
      {
        id: 'pay-1',
        saleId: 'sale-1',
        method: PaymentMethod.MOBILE_MONEY,
        amount: new Prisma.Decimal(950),
        createdAt: new Date('2026-10-10T10:00:00.000Z'),
      },
    ],
  }

  const sampleReturn = {
    id: 'ret-1',
    businessId: mockBusiness.id,
    saleId: 'sale-1',
    refundAmount: new Prisma.Decimal(100),
    createdAt: new Date('2026-10-11T12:00:00.000Z'),
  }

  const sampleExpense = {
    id: 'exp-1',
    businessId: mockBusiness.id,
    createdById: mockUser.id,
    category: ExpenseCategory.ELECTRICITY_AND_WATER,
    description: 'Electricity tokens',
    amount: new Prisma.Decimal(200),
    expenseDate: new Date('2026-10-10T12:00:00.000Z'),
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    createdBy: { name: mockUser.name },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any)
    vi.spyOn(prisma.business, 'findUnique').mockResolvedValue(mockBusiness as any)
  })

  describe('CSV Injection Escaping Utility', () => {
    it('should prepend single quote to potentially malicious formula cells', () => {
      expect(escapeCsvCell('=SUM(A1:A10)')).toBe(`"'=SUM(A1:A10)"`)
      expect(escapeCsvCell('+12345')).toBe(`"'+12345"`)
      expect(escapeCsvCell('-cmd|calc')).toBe(`"'-cmd|calc"`)
      expect(escapeCsvCell('@SUM(B1)')).toBe(`"'@SUM(B1)"`)
      expect(escapeCsvCell('\tTabPrefix')).toBe(`"'\tTabPrefix"`)
      expect(escapeCsvCell('\rReturnPrefix')).toBe(`"'\rReturnPrefix"`)
    })

    it('should handle standard text, numbers, and null/undefined values safely', () => {
      expect(escapeCsvCell('Milk 500ml')).toBe(`"Milk 500ml"`)
      expect(escapeCsvCell('He said "Hello"')).toBe(`"He said ""Hello"""`)
      expect(escapeCsvCell(150.5)).toBe(`"150.5"`)
      expect(escapeCsvCell(null)).toBe('""')
      expect(escapeCsvCell(undefined)).toBe('""')
    })
  })

  describe('GET /api/v1/businesses/:businessId/reports/summary', () => {
    it('should calculate financial metrics and comparison deltas successfully', async () => {
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([sampleSale] as any)
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([sampleReturn] as any)
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([sampleExpense] as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/summary?period=this_month`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.currency).toBe('KES')
      expect(res.body.data.metrics).toBeDefined()

      const m = res.body.data.metrics
      // Gross sales = 2*250 + 3*170 = 500 + 510 = 1010
      expect(m.grossSales).toBe(1010)
      // Discounts = item discount (10) + order discount (50) = 60
      expect(m.discounts).toBe(60)
      // Refunds = 100
      expect(m.refunds).toBe(100)
      // Net revenue = 1010 - 60 - 100 = 850
      expect(m.netRevenue).toBe(850)
      // COGS = 2 * 180 + 3 * 130 (fallback) = 360 + 390 = 750
      expect(m.cogs).toBe(750)
      // Gross profit = 850 - 750 = 100
      expect(m.grossProfit).toBe(100)
      // Operating expenses = 200
      expect(m.operatingExpenses).toBe(200)
      // Operating profit = 100 - 200 = -100
      expect(m.operatingProfit).toBe(-100)
      expect(m.hasEstimatedCosts).toBe(true)

      // Comparison object
      expect(res.body.data.comparisons).toBeDefined()
      expect(res.body.data.comparisons.grossSales).toBeDefined()
    })

    it('should reject Cashiers from accessing management financial reports', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(
        mockCashierMembership as any
      )

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/summary`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/businesses/:businessId/reports/revenue-trends', () => {
    it('should return time-series points and payment method breakdowns', async () => {
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([sampleSale] as any)
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([sampleReturn] as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/revenue-trends?period=this_month`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.timeSeries)).toBe(true)
      expect(Array.isArray(res.body.data.paymentMethods)).toBe(true)

      const mobileMoney = res.body.data.paymentMethods.find(
        (p: any) => p.method === PaymentMethod.MOBILE_MONEY
      )
      expect(mobileMoney).toBeDefined()
      expect(mobileMoney.totalAmount).toBe(950)
    })
  })

  describe('GET /api/v1/businesses/:businessId/reports/profitability', () => {
    it('should return product-level gross profits and margins', async () => {
      vi.spyOn(prisma.saleItem, 'findMany').mockResolvedValue(sampleSale.items as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/profitability?period=this_month`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(Array.isArray(res.body.data.items)).toBe(true)
      expect(res.body.data.items.length).toBe(2)

      const bb = res.body.data.items.find((p: any) => p.sku === 'BB-500G')
      expect(bb).toBeDefined()
      expect(bb.grossSales).toBe(500)
      expect(bb.cogs).toBe(360)
      expect(bb.grossProfit).toBe(140)
      expect(bb.hasEstimatedCost).toBe(false)

      const jogoo = res.body.data.items.find((p: any) => p.sku === 'JOG-2KG')
      expect(jogoo).toBeDefined()
      expect(jogoo.hasEstimatedCost).toBe(true)
    })
  })

  describe('GET /api/v1/businesses/:businessId/reports/inventory-intelligence', () => {
    it('should calculate turnover, velocity, and classify stock correctly', async () => {
      const mockProducts = [
        {
          id: 'prod-1',
          name: 'Fast Flour',
          sku: 'FF-1',
          unit: 'packet',
          costPrice: new Prisma.Decimal(100),
          sellingPrice: new Prisma.Decimal(130),
          category: { id: 'cat-1', name: 'Grain' },
          stockLevel: { quantity: new Prisma.Decimal(50) },
        },
        {
          id: 'prod-2',
          name: 'Dead Stock Spice',
          sku: 'DSS-1',
          unit: 'tin',
          costPrice: new Prisma.Decimal(200),
          sellingPrice: new Prisma.Decimal(300),
          category: { id: 'cat-2', name: 'Spices' },
          stockLevel: { quantity: new Prisma.Decimal(20) },
        },
        {
          id: 'prod-3',
          name: 'Sold Out Sugar',
          sku: 'SOS-1',
          unit: 'kg',
          costPrice: new Prisma.Decimal(150),
          sellingPrice: new Prisma.Decimal(180),
          category: { id: 'cat-1', name: 'Grain' },
          stockLevel: { quantity: new Prisma.Decimal(0) },
        },
      ]

      const mockRecentItems = [
        {
          productId: 'prod-1',
          quantity: new Prisma.Decimal(60),
          quantityReturned: new Prisma.Decimal(0),
          unitCost: new Prisma.Decimal(100),
        },
      ]

      vi.spyOn(prisma.product, 'findMany').mockResolvedValue(mockProducts as any)
      vi.spyOn(prisma.saleItem, 'findMany')
        .mockResolvedValueOnce(mockRecentItems as any) // recent sales
        .mockResolvedValueOnce([
          { productId: 'prod-1', sale: { createdAt: new Date() } },
        ] as any) // latest sales

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/inventory-intelligence?lookbackDays=60`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.summary).toBeDefined()
      expect(res.body.data.summary.deadStockCount).toBe(1)
      expect(res.body.data.summary.outOfStockCount).toBe(1)
      expect(res.body.data.summary.fastMovingCount).toBe(1)

      const deadStock = res.body.data.items.find((i: any) => i.sku === 'DSS-1')
      expect(deadStock.classification).toBe('POTENTIALLY_DEAD_STOCK')
      expect(deadStock.stockValuation).toBe(4000) // 20 * 200

      const outOfStock = res.body.data.items.find((i: any) => i.sku === 'SOS-1')
      expect(outOfStock.classification).toBe('OUT_OF_STOCK')
    })
  })

  describe('GET /api/v1/businesses/:businessId/reports/export/csv', () => {
    it('should export CSV with UTF-8 BOM and formula injection protection', async () => {
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([sampleSale] as any)
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([sampleReturn] as any)
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([sampleExpense] as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/export/csv?type=summary&period=this_month`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toContain('text/csv')
      expect(res.headers['content-disposition']).toContain('.csv')
      // UTF-8 BOM test
      expect(res.text.startsWith('\uFEFF')).toBe(true)
      expect(res.text).toContain('Gross Sales Revenue')
      expect(res.text).toContain('Net Sales Revenue')
    })
  })

  describe('GET /api/v1/businesses/:businessId/reports/export/pdf', () => {
    it('should stream generated management accounting PDF successfully', async () => {
      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue([sampleSale] as any)
      vi.spyOn(prisma.saleReturn, 'findMany').mockResolvedValue([sampleReturn] as any)
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([sampleExpense] as any)
      vi.spyOn(prisma.saleItem, 'findMany').mockResolvedValue(sampleSale.items as any)
      vi.spyOn(prisma.product, 'findMany').mockResolvedValue([])

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/reports/export/pdf?period=this_month`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.headers['content-type']).toBe('application/pdf')
      expect(res.headers['content-disposition']).toContain('.pdf')
    })
  })

  describe('Multi-tenant isolation', () => {
    it('should reject access to another business without membership', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/unauthorized-biz-99/reports/summary`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })
})
