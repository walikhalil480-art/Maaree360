import { describe, it, expect, vi, beforeEach } from 'vitest'
import request from 'supertest'
import { createApp } from '../app.js'
import { prisma } from '../db/prisma.js'
import { Role, Prisma, ExpenseCategory, SaleStatus } from '@prisma/client'

describe('Expense Management & Operating Profit API', () => {
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

  const mockClerkMembership = {
    id: 'mem-clerk',
    userId: mockUser.id,
    businessId: mockBusiness.id,
    role: Role.STOCK_CLERK,
    createdAt: new Date(),
    business: mockBusiness,
  }

  const sampleExpense = {
    id: 'exp-1',
    businessId: mockBusiness.id,
    createdById: mockUser.id,
    category: ExpenseCategory.ELECTRICITY_AND_WATER,
    description: 'KPLC Electricity Tokens for store',
    amount: new Prisma.Decimal(3500),
    expenseDate: new Date('2026-10-10T12:00:00.000Z'),
    referenceNumber: 'TOK-889123',
    notes: 'Meter #142857',
    createdAt: new Date('2026-10-10T12:00:00.000Z'),
    updatedAt: new Date('2026-10-10T12:00:00.000Z'),
    createdBy: {
      id: mockUser.id,
      name: mockUser.name,
      email: mockUser.email,
    },
  }

  beforeEach(() => {
    vi.restoreAllMocks()
    vi.spyOn(prisma.session, 'findUnique').mockResolvedValue(mockSession as any)
    vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockOwnerMembership as any)
  })

  describe('POST /api/v1/businesses/:businessId/expenses', () => {
    it('should create an operating expense successfully', async () => {
      vi.spyOn(prisma.expense, 'create').mockResolvedValue(sampleExpense as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/expenses`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          category: 'Electricity and water',
          description: 'KPLC Electricity Tokens for store',
          amount: 3500,
          expenseDate: '2026-10-10',
          referenceNumber: 'TOK-889123',
          notes: 'Meter #142857',
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.expense.description).toBe('KPLC Electricity Tokens for store')
      expect(res.body.expense.category).toBe(ExpenseCategory.ELECTRICITY_AND_WATER)
    })

    it('should reject non-positive amounts with 400 validation error', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/expenses`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          category: 'Rent',
          description: 'Monthly store rent',
          amount: -500,
          expenseDate: '2026-10-01',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject invalid categories with 400 error', async () => {
      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/expenses`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          category: 'NonExistentCategory',
          description: 'Test expense',
          amount: 1000,
          expenseDate: '2026-10-01',
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('should reject stock clerks with 403 forbidden', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockClerkMembership as any)

      const res = await request(app)
        .post(`/api/v1/businesses/${mockBusiness.id}/expenses`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          category: 'Rent',
          description: 'Store rent',
          amount: 25000,
          expenseDate: '2026-10-01',
        })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/businesses/:businessId/expenses', () => {
    it('should list expenses with pagination and filtered summary', async () => {
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([sampleExpense] as any)
      vi.spyOn(prisma.expense, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.expense, 'aggregate').mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(3500) },
        _count: 1,
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.expenses).toHaveLength(1)
      expect(res.body.pagination.total).toBe(1)
      expect(res.body.summary.totalAmount).toBe(3500)
    })

    it('should filter by category and date range', async () => {
      const findManySpy = vi.spyOn(prisma.expense, 'findMany').mockResolvedValue([sampleExpense] as any)
      vi.spyOn(prisma.expense, 'count').mockResolvedValue(1)
      vi.spyOn(prisma.expense, 'aggregate').mockResolvedValue({
        _sum: { amount: new Prisma.Decimal(3500) },
        _count: 1,
      } as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses?category=RENT&startDate=2026-10-01&endDate=2026-10-31`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(findManySpy).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            businessId: mockBusiness.id,
            category: ExpenseCategory.RENT,
            expenseDate: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      )
    })

    it('should reject invalid date range where startDate > endDate', async () => {
      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses?startDate=2026-10-31&endDate=2026-10-01`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error.message).toContain('Start date cannot be after end date')
    })
  })

  describe('GET /api/v1/businesses/:businessId/expenses/:expenseId', () => {
    it('should return a single expense by ID', async () => {
      vi.spyOn(prisma.expense, 'findFirst').mockResolvedValue(sampleExpense as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses/${sampleExpense.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.expense.id).toBe(sampleExpense.id)
    })

    it('should return 404 when expense is not found in the business (cross-tenant isolation)', async () => {
      vi.spyOn(prisma.expense, 'findFirst').mockResolvedValue(null)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses/unknown-expense-id`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
      expect(res.body.error.code).toBe('EXPENSE_NOT_FOUND')
    })
  })

  describe('PUT /api/v1/businesses/:businessId/expenses/:expenseId', () => {
    it('should update an expense successfully', async () => {
      vi.spyOn(prisma.expense, 'findFirst').mockResolvedValue(sampleExpense as any)
      const updatedExpense = {
        ...sampleExpense,
        amount: new Prisma.Decimal(4000),
        description: 'Updated Electricity Tokens',
      }
      vi.spyOn(prisma.expense, 'update').mockResolvedValue(updatedExpense as any)

      const res = await request(app)
        .put(`/api/v1/businesses/${mockBusiness.id}/expenses/${sampleExpense.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({
          amount: 4000,
          description: 'Updated Electricity Tokens',
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.expense.description).toBe('Updated Electricity Tokens')
    })

    it('should reject cashier from editing expenses', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)

      const res = await request(app)
        .put(`/api/v1/businesses/${mockBusiness.id}/expenses/${sampleExpense.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])
        .send({ amount: 5000 })

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('DELETE /api/v1/businesses/:businessId/expenses/:expenseId', () => {
    it('should allow Owner to delete an expense', async () => {
      vi.spyOn(prisma.expense, 'findFirst').mockResolvedValue(sampleExpense as any)
      vi.spyOn(prisma.expense, 'delete').mockResolvedValue(sampleExpense as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/expenses/${sampleExpense.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.message).toContain('deleted successfully')
    })

    it('should reject Cashier from deleting an expense', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)

      const res = await request(app)
        .delete(`/api/v1/businesses/${mockBusiness.id}/expenses/${sampleExpense.id}`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })

  describe('GET /api/v1/businesses/:businessId/expenses/profit-summary', () => {
    it('should accurately calculate Gross Sales, Net Revenue, COGS, Gross Profit, Expenses, and Operating Profit', async () => {
      // Mock completed sales in the period:
      // Sale 1: Total = 10,000 KES
      // Item A: 10 units sold @ selling 1000 KES, unitCost = 700 KES. Line COGS = 7,000 KES.
      // 1 unit was returned via customer return -> net units sold = 9 -> realized COGS = 6,300 KES.
      const mockSales = [
        {
          id: 'sale-1',
          total: new Prisma.Decimal(10000),
          status: SaleStatus.COMPLETED,
          createdAt: new Date('2026-10-05'),
          items: [
            {
              id: 'item-1',
              quantity: new Prisma.Decimal(10),
              quantityReturned: new Prisma.Decimal(1),
              unitCost: new Prisma.Decimal(700),
              product: { costPrice: new Prisma.Decimal(700) },
            },
          ],
        },
      ]

      // Mock refunds: 1,000 KES refund recorded
      const mockRefundsAgg = {
        _sum: { refundAmount: new Prisma.Decimal(1000) },
        _count: 1,
      }

      // Mock expenses:
      // Rent = 1500 KES, Electricity = 500 KES -> Total = 2000 KES
      const mockExpenses = [
        {
          id: 'exp-1',
          category: ExpenseCategory.RENT,
          amount: new Prisma.Decimal(1500),
          expenseDate: new Date('2026-10-02'),
        },
        {
          id: 'exp-2',
          category: ExpenseCategory.ELECTRICITY_AND_WATER,
          amount: new Prisma.Decimal(500),
          expenseDate: new Date('2026-10-04'),
        },
      ]

      vi.spyOn(prisma.sale, 'findMany').mockResolvedValue(mockSales as any)
      vi.spyOn(prisma.saleReturn, 'aggregate').mockResolvedValue(mockRefundsAgg as any)
      vi.spyOn(prisma.expense, 'findMany').mockResolvedValue(mockExpenses as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses/profit-summary?period=month`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)

      const summary = res.body.summary

      // Gross Revenue = 10,000
      expect(summary.sales.grossRevenue).toBe(10000)
      // Refunds = 1,000
      expect(summary.sales.totalRefunds).toBe(1000)
      // Net Revenue = 10,000 - 1,000 = 9,000
      expect(summary.sales.netRevenue).toBe(9000)

      // Realized COGS = (10 - 1) * 700 = 6,300
      expect(summary.cogs.totalCostOfGoodsSold).toBe(6300)

      // Gross Profit = 9,000 - 6,300 = 2,700
      expect(summary.grossProfit.amount).toBe(2700)
      // Gross Profit Margin = (2,700 / 9,000) * 100 = 30%
      expect(summary.grossProfit.marginPercentage).toBe(30)

      // Total Operating Expenses = 1,500 + 500 = 2,000
      expect(summary.expenses.totalOperatingExpenses).toBe(2000)
      expect(summary.expenses.expenseCount).toBe(2)

      // Operating Profit = Gross Profit (2,700) - Operating Expenses (2,000) = 700
      expect(summary.operatingProfit.amount).toBe(700)
      // Net Operating Margin = (700 / 9,000) * 100 = 7.78%
      expect(summary.operatingProfit.marginPercentage).toBe(7.78)
      expect(summary.operatingProfit.status).toBe('PROFITABLE')

      // Category breakdown
      const rentCat = summary.expenses.categoryBreakdown.find((c: any) => c.category === 'RENT')
      expect(rentCat).toBeDefined()
      expect(rentCat.totalAmount).toBe(1500)
      expect(rentCat.percentage).toBe(75) // 1500 / 2000 = 75%
    })

    it('should prevent Cashiers from viewing profit summary (Owner & Manager only)', async () => {
      vi.spyOn(prisma.businessMembership, 'findUnique').mockResolvedValue(mockCashierMembership as any)

      const res = await request(app)
        .get(`/api/v1/businesses/${mockBusiness.id}/expenses/profit-summary`)
        .set('Cookie', ['smartstock_session=alice-session-token'])

      expect(res.status).toBe(403)
      expect(res.body.success).toBe(false)
    })
  })
})
