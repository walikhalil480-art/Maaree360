import { prisma } from '../db/prisma.js'
import {
  CreateExpenseInput,
  UpdateExpenseInput,
  ExpenseQueryInput,
  ProfitSummaryQueryInput,
  EXPENSE_CATEGORY_CONFIG,
} from '../schemas/expense.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Prisma, Role, SaleStatus, ExpenseCategory } from '@prisma/client'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export class ExpenseService {
  /**
   * Helper to parse date strings into start-of-day and end-of-day Date objects.
   */
  private parseDateBoundaries(startDateStr?: string, endDateStr?: string) {
    let startDate: Date | undefined
    let endDate: Date | undefined

    if (startDateStr) {
      const parsed = new Date(startDateStr)
      if (isNaN(parsed.getTime())) {
        throw new AppError('Invalid startDate format', 400, 'INVALID_DATE')
      }
      // If only YYYY-MM-DD was provided, set to 00:00:00.000 UTC
      if (startDateStr.length <= 10) {
        startDate = new Date(`${startDateStr}T00:00:00.000Z`)
      } else {
        startDate = parsed
      }
    }

    if (endDateStr) {
      const parsed = new Date(endDateStr)
      if (isNaN(parsed.getTime())) {
        throw new AppError('Invalid endDate format', 400, 'INVALID_DATE')
      }
      // If only YYYY-MM-DD was provided, set to 23:59:59.999 UTC
      if (endDateStr.length <= 10) {
        endDate = new Date(`${endDateStr}T23:59:59.999Z`)
      } else {
        endDate = parsed
      }
    }

    if (startDate && endDate && startDate > endDate) {
      throw new AppError('Start date cannot be after end date', 400, 'INVALID_DATE_RANGE')
    }

    return { startDate, endDate }
  }

  /**
   * Calculate period start and end dates based on standard period identifiers.
   */
  private getPeriodBoundaries(query: ProfitSummaryQueryInput) {
    if (query.startDate || query.endDate) {
      return this.parseDateBoundaries(query.startDate, query.endDate)
    }

    const now = new Date()
    const period = query.period || 'month'

    if (period === 'today') {
      const start = new Date(now)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { startDate: start, endDate: end }
    }

    if (period === 'week') {
      const start = new Date(now)
      const day = start.getDay() // 0 is Sunday
      const diff = start.getDate() - day + (day === 0 ? -6 : 1) // adjust when day is sunday
      start.setDate(diff)
      start.setHours(0, 0, 0, 0)
      const end = new Date(now)
      end.setHours(23, 59, 59, 999)
      return { startDate: start, endDate: end }
    }

    if (period === 'month') {
      const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)
      return { startDate: start, endDate: end }
    }

    if (period === 'year') {
      const start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0)
      const end = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999)
      return { startDate: start, endDate: end }
    }

    // Default: 'all' (unbounded)
    return { startDate: undefined, endDate: undefined }
  }

  /**
   * 1. Create a new operating expense for the tenant business.
   */
  async createExpense(
    businessId: string,
    createdById: string,
    input: CreateExpenseInput
  ) {
    const amountDecimal = new Prisma.Decimal(input.amount).toDecimalPlaces(
      2,
      Prisma.Decimal.ROUND_HALF_UP
    )

    if (amountDecimal.lessThanOrEqualTo(0)) {
      throw new AppError('Expense amount must be greater than 0', 400, 'INVALID_AMOUNT')
    }

    const expense = await prisma.expense.create({
      data: {
        businessId,
        createdById,
        category: input.category,
        description: input.description.trim(),
        amount: amountDecimal,
        expenseDate: input.expenseDate,
        referenceNumber: input.referenceNumber?.trim() || null,
        notes: input.notes?.trim() || null,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return expense
  }

  /**
   * 2. List expenses with pagination, category filter, date range filter, and search.
   */
  async listExpenses(businessId: string, query: ExpenseQueryInput) {
    const { page, limit, search, category, startDate: startStr, endDate: endStr, sortBy, sortOrder } = query
    const skip = (page - 1) * limit

    const { startDate, endDate } = this.parseDateBoundaries(startStr, endStr)

    const where: Prisma.ExpenseWhereInput = { businessId }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { description: { contains: search, mode: 'insensitive' } },
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (startDate || endDate) {
      where.expenseDate = {}
      if (startDate) {
        where.expenseDate.gte = startDate
      }
      if (endDate) {
        where.expenseDate.lte = endDate
      }
    }

    const [expenses, total, aggregate] = await Promise.all([
      prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        include: {
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.expense.count({ where }),
      prisma.expense.aggregate({
        where,
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const totalAmount = aggregate._sum.amount ? Number(aggregate._sum.amount) : 0

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      summary: {
        totalAmount,
        count: total,
      },
    }
  }

  /**
   * 3. Retrieve a single expense by ID, guaranteeing tenant isolation.
   */
  async getExpenseById(businessId: string, expenseId: string) {
    const expense = await prisma.expense.findFirst({
      where: {
        id: expenseId,
        businessId,
      },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    if (!expense) {
      const existsElsewhere = await prisma.expense.findUnique({
        where: { id: expenseId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Expense',
          resourceId: expenseId,
          action: 'CROSS_TENANT_EXPENSE_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Expense record not found in this business', 404, 'EXPENSE_NOT_FOUND')
    }

    return expense
  }

  /**
   * 4. Update an existing expense.
   */
  async updateExpense(
    businessId: string,
    expenseId: string,
    input: UpdateExpenseInput
  ) {
    // Verify expense exists in this business
    await this.getExpenseById(businessId, expenseId)

    const updateData: Prisma.ExpenseUpdateInput = {}

    if (input.category !== undefined) {
      updateData.category = input.category
    }
    if (input.description !== undefined) {
      updateData.description = input.description.trim()
    }
    if (input.amount !== undefined) {
      const amountDecimal = new Prisma.Decimal(input.amount).toDecimalPlaces(
        2,
        Prisma.Decimal.ROUND_HALF_UP
      )
      if (amountDecimal.lessThanOrEqualTo(0)) {
        throw new AppError('Expense amount must be greater than 0', 400, 'INVALID_AMOUNT')
      }
      updateData.amount = amountDecimal
    }
    if (input.expenseDate !== undefined) {
      updateData.expenseDate = input.expenseDate
    }
    if (input.referenceNumber !== undefined) {
      updateData.referenceNumber = input.referenceNumber?.trim() || null
    }
    if (input.notes !== undefined) {
      updateData.notes = input.notes?.trim() || null
    }

    const updated = await prisma.expense.update({
      where: { id: expenseId },
      data: updateData,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
      },
    })

    return updated
  }

  /**
   * 5. Delete an expense (Enforces Role: OWNER or MANAGER only).
   */
  async deleteExpense(businessId: string, expenseId: string, userRole: Role) {
    if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
      throw new AppError(
        'Only Owners and Managers are permitted to delete expense records.',
        403,
        'FORBIDDEN'
      )
    }

    // Verify tenant ownership
    await this.getExpenseById(businessId, expenseId)

    await prisma.expense.delete({
      where: { id: expenseId },
    })

    return { success: true, message: 'Expense record deleted successfully' }
  }

  /**
   * 6. Financial Profit Summary:
   * Real-time calculation of Sales Revenue, COGS, Gross Profit, Operating Expenses, and Estimated Operating Profit.
   *
   * Method documentation:
   * - Gross Sales Revenue: Sum of completed sales total amount within period boundaries.
   * - Refunds Deducted: Sum of approved sales refunds created within the period.
   * - Net Sales Revenue: Gross Sales Revenue - Refunds.
   * - Cost of Goods Sold (COGS): Net units sold (quantity - quantityReturned) * snapshot unit cost at time of sale.
   * - Gross Profit: Net Sales Revenue - COGS.
   * - Operating Expenses: Sum of all recorded operational expenses within period boundaries.
   * - Estimated Operating Profit: Gross Profit - Operating Expenses.
   * - Stock purchases and POs are deliberately excluded from operating expenses to prevent double-counting inventory.
   */
  async getProfitSummary(businessId: string, query: ProfitSummaryQueryInput) {
    const { startDate, endDate } = this.getPeriodBoundaries(query)

    // Build common date filter
    const dateFilter: Prisma.DateTimeFilter = {}
    if (startDate) dateFilter.gte = startDate
    if (endDate) dateFilter.lte = endDate
    const hasDateFilter = startDate !== undefined || endDate !== undefined

    // 1. Fetch completed sales with line items for revenue and COGS calculation
    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      include: {
        items: {
          include: {
            product: {
              select: { costPrice: true },
            },
          },
        },
      },
    })

    let grossSalesRevenue = new Prisma.Decimal(0)
    let totalCogs = new Prisma.Decimal(0)
    let completedTransactionsCount = sales.length

    for (const sale of sales) {
      grossSalesRevenue = grossSalesRevenue.plus(sale.total)

      for (const item of sale.items) {
        // Effective net units sold (excluding items that were returned)
        const netQty = Prisma.Decimal.max(0, item.quantity.minus(item.quantityReturned))
        // Snapshot unit cost at time of sale, falling back to current product costPrice
        const unitCost = item.unitCost !== null && item.unitCost !== undefined
          ? item.unitCost
          : item.product.costPrice

        const lineCogs = netQty.mul(unitCost)
        totalCogs = totalCogs.plus(lineCogs)
      }
    }

    // 2. Fetch recorded refunds within the period
    const refundAggregate = await prisma.saleReturn.aggregate({
      where: {
        businessId,
        ...(hasDateFilter ? { createdAt: dateFilter } : {}),
      },
      _sum: { refundAmount: true },
      _count: true,
    })

    const totalRefunds = refundAggregate._sum.refundAmount || new Prisma.Decimal(0)
    const refundCount = refundAggregate._count

    // Net Sales Revenue = Gross Sales - Refunds
    const netSalesRevenue = grossSalesRevenue.minus(totalRefunds)

    // Gross Profit = Net Sales Revenue - COGS
    const grossProfit = netSalesRevenue.minus(totalCogs)

    // Gross Margin % = (Gross Profit / Net Sales Revenue) * 100
    const grossProfitMargin = netSalesRevenue.greaterThan(0)
      ? grossProfit.dividedBy(netSalesRevenue).mul(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber()
      : 0

    // 3. Fetch Operating Expenses in the period
    const expenses = await prisma.expense.findMany({
      where: {
        businessId,
        ...(hasDateFilter ? { expenseDate: dateFilter } : {}),
      },
    })

    let totalOperatingExpenses = new Prisma.Decimal(0)
    const categoryTotalsMap = new Map<ExpenseCategory, { amount: Prisma.Decimal; count: number }>()

    for (const exp of expenses) {
      totalOperatingExpenses = totalOperatingExpenses.plus(exp.amount)
      const current = categoryTotalsMap.get(exp.category) || { amount: new Prisma.Decimal(0), count: 0 }
      current.amount = current.amount.plus(exp.amount)
      current.count += 1
      categoryTotalsMap.set(exp.category, current)
    }

    // Category breakdown list
    const categoryBreakdown = Object.entries(EXPENSE_CATEGORY_CONFIG).map(([key, config]) => {
      const catKey = key as ExpenseCategory
      const catData = categoryTotalsMap.get(catKey)
      const catAmount = catData ? catData.amount : new Prisma.Decimal(0)
      const percentage = totalOperatingExpenses.greaterThan(0)
        ? catAmount.dividedBy(totalOperatingExpenses).mul(100).toDecimalPlaces(1, Prisma.Decimal.ROUND_HALF_UP).toNumber()
        : 0

      return {
        category: catKey,
        label: config.label,
        description: config.description,
        totalAmount: catAmount.toNumber(),
        count: catData ? catData.count : 0,
        percentage,
      }
    })

    // Sort category breakdown with highest expenses first
    categoryBreakdown.sort((a, b) => b.totalAmount - a.totalAmount)

    // 4. Estimated Operating Profit = Gross Profit - Operating Expenses
    const estimatedOperatingProfit = grossProfit.minus(totalOperatingExpenses)

    // Net Operating Margin % = (Operating Profit / Net Sales Revenue) * 100
    const netOperatingMargin = netSalesRevenue.greaterThan(0)
      ? estimatedOperatingProfit.dividedBy(netSalesRevenue).mul(100).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP).toNumber()
      : 0

    return {
      period: query.period || 'month',
      dateRange: {
        startDate: startDate ? startDate.toISOString() : null,
        endDate: endDate ? endDate.toISOString() : null,
      },
      sales: {
        grossRevenue: grossSalesRevenue.toNumber(),
        totalRefunds: totalRefunds.toNumber(),
        netRevenue: netSalesRevenue.toNumber(),
        completedTransactionsCount,
        refundCount,
      },
      cogs: {
        totalCostOfGoodsSold: totalCogs.toNumber(),
        method: 'Unit cost snapshot at time of sale adjusted for customer returns',
      },
      grossProfit: {
        amount: grossProfit.toNumber(),
        marginPercentage: grossProfitMargin,
      },
      expenses: {
        totalOperatingExpenses: totalOperatingExpenses.toNumber(),
        expenseCount: expenses.length,
        categoryBreakdown,
      },
      operatingProfit: {
        amount: estimatedOperatingProfit.toNumber(),
        marginPercentage: netOperatingMargin,
        status: estimatedOperatingProfit.greaterThanOrEqualTo(0) ? 'PROFITABLE' : 'OPERATING_AT_LOSS',
      },
    }
  }
}

export const expenseService = new ExpenseService()
