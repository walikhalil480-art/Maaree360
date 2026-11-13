import { prisma } from '../db/prisma.js'
import {
  ReportPeriod,
  ReportSummaryQuery,
  RevenueTrendQuery,
  ProfitabilityQuery,
  InventoryIntelligenceQuery,
  ReportExportQuery,
} from '../schemas/report.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Prisma, SaleStatus, PaymentMethod, ExpenseCategory } from '@prisma/client'
import PDFDocument from 'pdfkit'
import { Writable } from 'stream'

export interface DateRangeResult {
  startDate: Date
  endDate: Date
  periodDays: number
  precedingStartDate: Date
  precedingEndDate: Date
  label: string
}

/**
 * Escapes CSV cell to prevent spreadsheet formula injection attacks (=, +, -, @, \t, \r)
 * and safely wraps cells with double quotes.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""'
  let str = String(value)
  if (/^[\=\+\-\@\t\r]/.test(str)) {
    str = `'${str}`
  }
  str = str.replace(/"/g, '""')
  return `"${str}"`
}

export class ReportService {
  /**
   * Helper to parse date ranges for Nairobi timezone (UTC+3, no DST).
   */
  getPeriodDateRange(
    period: ReportPeriod,
    customStartStr?: string,
    customEndStr?: string
  ): DateRangeResult {
    // Nairobi is UTC+3 (180 mins)
    const now = new Date()
    const nairobiFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Nairobi',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    })
    const todayStr = nairobiFormatter.format(now) // YYYY-MM-DD in Nairobi

    let startDate: Date
    let endDate: Date
    let label: string = period

    if (period === 'custom') {
      if (!customStartStr || !customEndStr) {
        throw new AppError(
          'Both startDate and endDate are required for custom period',
          400,
          'INVALID_DATE_RANGE'
        )
      }
      startDate = customStartStr.includes('T')
        ? new Date(customStartStr)
        : new Date(`${customStartStr}T00:00:00.000+03:00`)
      endDate = customEndStr.includes('T')
        ? new Date(customEndStr)
        : new Date(`${customEndStr}T23:59:59.999+03:00`)

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        throw new AppError('Invalid date format provided for custom period', 400, 'INVALID_DATE')
      }
      if (startDate > endDate) {
        throw new AppError('Start date cannot be after end date', 400, 'INVALID_DATE_RANGE')
      }
      label = `Custom: ${customStartStr} to ${customEndStr}`
    } else if (period === 'today') {
      startDate = new Date(`${todayStr}T00:00:00.000+03:00`)
      endDate = new Date(`${todayStr}T23:59:59.999+03:00`)
      label = `Today (${todayStr})`
    } else if (period === 'yesterday') {
      const todayDate = new Date(`${todayStr}T12:00:00.000+03:00`)
      todayDate.setDate(todayDate.getDate() - 1)
      const yesterdayStr = nairobiFormatter.format(todayDate)
      startDate = new Date(`${yesterdayStr}T00:00:00.000+03:00`)
      endDate = new Date(`${yesterdayStr}T23:59:59.999+03:00`)
      label = `Yesterday (${yesterdayStr})`
    } else if (period === 'this_week') {
      const todayDate = new Date(`${todayStr}T12:00:00.000+03:00`)
      const day = todayDate.getDay() // 0 = Sunday, 1 = Monday
      const diffToMonday = day === 0 ? -6 : 1 - day
      todayDate.setDate(todayDate.getDate() + diffToMonday)
      const mondayStr = nairobiFormatter.format(todayDate)
      startDate = new Date(`${mondayStr}T00:00:00.000+03:00`)
      endDate = new Date(`${todayStr}T23:59:59.999+03:00`)
      label = `This Week (from ${mondayStr})`
    } else if (period === 'last_week') {
      const todayDate = new Date(`${todayStr}T12:00:00.000+03:00`)
      const day = todayDate.getDay()
      const diffToMonday = day === 0 ? -6 : 1 - day
      todayDate.setDate(todayDate.getDate() + diffToMonday - 7)
      const lastMondayStr = nairobiFormatter.format(todayDate)
      todayDate.setDate(todayDate.getDate() + 6)
      const lastSundayStr = nairobiFormatter.format(todayDate)
      startDate = new Date(`${lastMondayStr}T00:00:00.000+03:00`)
      endDate = new Date(`${lastSundayStr}T23:59:59.999+03:00`)
      label = `Last Week (${lastMondayStr} - ${lastSundayStr})`
    } else if (period === 'this_month') {
      const [year, month] = todayStr.split('-')
      const firstDayStr = `${year}-${month}-01`
      startDate = new Date(`${firstDayStr}T00:00:00.000+03:00`)
      // End of this month: 0th day of next month
      const y = parseInt(year, 10)
      const m = parseInt(month, 10)
      const lastDayObj = new Date(Date.UTC(y, m, 0))
      const lastDayStr = nairobiFormatter.format(lastDayObj)
      endDate = new Date(`${lastDayStr}T23:59:59.999+03:00`)
      label = `This Month (${year}-${month})`
    } else if (period === 'last_month') {
      const [yearStr, monthStr] = todayStr.split('-')
      let y = parseInt(yearStr, 10)
      let m = parseInt(monthStr, 10) - 1
      if (m === 0) {
        m = 12
        y -= 1
      }
      const padM = String(m).padStart(2, '0')
      const firstDayStr = `${y}-${padM}-01`
      const lastDayObj = new Date(Date.UTC(y, m, 0))
      const lastDayStr = nairobiFormatter.format(lastDayObj)
      startDate = new Date(`${firstDayStr}T00:00:00.000+03:00`)
      endDate = new Date(`${lastDayStr}T23:59:59.999+03:00`)
      label = `Last Month (${y}-${padM})`
    } else if (period === 'this_year') {
      const year = todayStr.split('-')[0]
      startDate = new Date(`${year}-01-01T00:00:00.000+03:00`)
      endDate = new Date(`${year}-12-31T23:59:59.999+03:00`)
      label = `This Year (${year})`
    } else {
      // Fallback: this month
      const [year, month] = todayStr.split('-')
      startDate = new Date(`${year}-${month}-01T00:00:00.000+03:00`)
      endDate = new Date(`${todayStr}T23:59:59.999+03:00`)
      label = `Current Period`
    }

    const durationMs = endDate.getTime() - startDate.getTime()
    const periodDays = Math.max(1, Math.round(durationMs / (1000 * 60 * 60 * 24)))

    // Preceding comparison period of identical duration immediately prior to startDate
    const precedingEndDate = new Date(startDate.getTime() - 1)
    const precedingStartDate = new Date(precedingEndDate.getTime() - durationMs)

    return {
      startDate,
      endDate,
      periodDays,
      precedingStartDate,
      precedingEndDate,
      label,
    }
  }

  /**
   * Internal helper to compute raw financial numbers for a business over any date window.
   */
  private async calculateWindowMetrics(businessId: string, startDate: Date, endDate: Date) {
    // 1. Fetch completed sales with items and returns in date range
    const sales = await prisma.sale.findMany({
      where: {
        businessId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: {
          include: {
            product: {
              select: { costPrice: true, name: true, sku: true },
            },
          },
        },
      },
    })

    // 2. Fetch sales returns processed in date range
    const returns = await prisma.saleReturn.findMany({
      where: {
        businessId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: {
        refundAmount: true,
      },
    })

    // 3. Fetch expenses incurred in date range
    const expenses = await prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: startDate, lte: endDate },
      },
      select: {
        amount: true,
        category: true,
      },
    })

    let grossSales = 0
    let itemDiscounts = 0
    let orderDiscounts = 0
    let cogs = 0
    let hasEstimatedCosts = false
    let totalUnitsSold = 0

    for (const sale of sales) {
      orderDiscounts += Number(sale.discount || 0)

      for (const item of sale.items) {
        const qty = Number(item.quantity)
        const qtyReturned = Number(item.quantityReturned || 0)
        const netQty = Math.max(0, qty - qtyReturned)
        const unitPrice = Number(item.unitPrice)
        const itemDiscount = Number(item.discount || 0)

        grossSales += qty * unitPrice
        itemDiscounts += itemDiscount
        totalUnitsSold += netQty

        // Unit cost calculation
        let unitCost: number
        if (item.unitCost !== null && item.unitCost !== undefined) {
          unitCost = Number(item.unitCost)
        } else {
          unitCost = Number(item.product.costPrice)
          hasEstimatedCosts = true
        }

        cogs += netQty * unitCost
      }
    }

    const totalDiscounts = itemDiscounts + orderDiscounts
    const totalRefunds = returns.reduce((acc, r) => acc + Number(r.refundAmount), 0)
    const netRevenue = Math.max(0, grossSales - totalDiscounts - totalRefunds)
    const grossProfit = netRevenue - cogs
    const grossMarginPercent = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0

    const totalExpenses = expenses.reduce((acc, e) => acc + Number(e.amount), 0)
    const operatingProfit = grossProfit - totalExpenses
    const operatingMarginPercent = netRevenue > 0 ? (operatingProfit / netRevenue) * 100 : 0
    const transactionCount = sales.length
    const averageSaleValue = transactionCount > 0 ? netRevenue / transactionCount : 0

    return {
      grossSales: Math.round(grossSales * 100) / 100,
      discounts: Math.round(totalDiscounts * 100) / 100,
      refunds: Math.round(totalRefunds * 100) / 100,
      netRevenue: Math.round(netRevenue * 100) / 100,
      cogs: Math.round(cogs * 100) / 100,
      grossProfit: Math.round(grossProfit * 100) / 100,
      grossMarginPercent: Math.round(grossMarginPercent * 100) / 100,
      operatingExpenses: Math.round(totalExpenses * 100) / 100,
      operatingProfit: Math.round(operatingProfit * 100) / 100,
      operatingMarginPercent: Math.round(operatingMarginPercent * 100) / 100,
      transactionCount,
      averageSaleValue: Math.round(averageSaleValue * 100) / 100,
      totalUnitsSold: Math.round(totalUnitsSold * 100) / 100,
      hasEstimatedCosts,
    }
  }

  /**
   * 1. Get Financial Executive Summary with Preceding Period Comparisons
   */
  async getFinancialSummary(businessId: string, query: ReportSummaryQuery) {
    const range = this.getPeriodDateRange(query.period, query.startDate, query.endDate)
    const current = await this.calculateWindowMetrics(businessId, range.startDate, range.endDate)
    const preceding = await this.calculateWindowMetrics(
      businessId,
      range.precedingStartDate,
      range.precedingEndDate
    )

    const calcChange = (cur: number, prev: number) => {
      const delta = cur - prev
      const percent = prev !== 0 ? (delta / Math.abs(prev)) * 100 : cur > 0 ? 100 : 0
      return {
        previous: prev,
        delta: Math.round(delta * 100) / 100,
        percent: Math.round(percent * 10) / 10,
      }
    }

    return {
      currency: 'KES',
      period: query.period,
      periodLabel: range.label,
      startDate: range.startDate.toISOString(),
      endDate: range.endDate.toISOString(),
      periodDays: range.periodDays,
      precedingStartDate: range.precedingStartDate.toISOString(),
      precedingEndDate: range.precedingEndDate.toISOString(),
      metrics: current,
      comparisons: {
        grossSales: calcChange(current.grossSales, preceding.grossSales),
        netRevenue: calcChange(current.netRevenue, preceding.netRevenue),
        grossProfit: calcChange(current.grossProfit, preceding.grossProfit),
        operatingExpenses: calcChange(current.operatingExpenses, preceding.operatingExpenses),
        operatingProfit: calcChange(current.operatingProfit, preceding.operatingProfit),
        transactionCount: calcChange(current.transactionCount, preceding.transactionCount),
        averageSaleValue: calcChange(current.averageSaleValue, preceding.averageSaleValue),
      },
    }
  }

  /**
   * 2. Get Revenue & Sales Trends (Time-series & Payment Methods)
   */
  async getRevenueTrends(businessId: string, query: RevenueTrendQuery) {
    const range = this.getPeriodDateRange(query.period, query.startDate, query.endDate)

    // Build sale filter
    const whereSale: Prisma.SaleWhereInput = {
      businessId,
      status: SaleStatus.COMPLETED,
      createdAt: { gte: range.startDate, lte: range.endDate },
    }

    if (query.productId || query.categoryId) {
      whereSale.items = {
        some: {
          ...(query.productId ? { productId: query.productId } : {}),
          ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {}),
        },
      }
    }

    if (query.paymentMethod) {
      whereSale.payments = {
        some: { method: query.paymentMethod },
      }
    }

    const sales = await prisma.sale.findMany({
      where: whereSale,
      include: {
        items: {
          include: {
            product: { select: { costPrice: true } },
          },
        },
        payments: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Fetch returns in range
    const returns = await prisma.saleReturn.findMany({
      where: {
        businessId,
        createdAt: { gte: range.startDate, lte: range.endDate },
      },
      select: {
        refundAmount: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Decide bucket interval
    let interval = query.interval
    if (!interval) {
      if (range.periodDays <= 2) interval = 'hour'
      else if (range.periodDays <= 60) interval = 'day'
      else if (range.periodDays <= 180) interval = 'week'
      else interval = 'month'
    }

    const nairobiTimezone = 'Africa/Nairobi'
    const getBucketKey = (d: Date): { key: string; label: string } => {
      const formatter = new Intl.DateTimeFormat('en-CA', {
        timeZone: nairobiTimezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        hour12: false,
      })
      const parts = formatter.formatToParts(d)
      const partMap: Record<string, string> = {}
      for (const p of parts) partMap[p.type] = p.value

      const yr = partMap.year
      const mo = partMap.month
      const da = partMap.day
      const hr = partMap.hour || '00'

      if (interval === 'hour') {
        return { key: `${yr}-${mo}-${da} ${hr}:00`, label: `${hr}:00` }
      }
      if (interval === 'month') {
        const monthName = new Intl.DateTimeFormat('en-US', {
          timeZone: nairobiTimezone,
          month: 'short',
        }).format(d)
        return { key: `${yr}-${mo}`, label: `${monthName} ${yr}` }
      }
      if (interval === 'week') {
        // Week number approximation
        const dt = new Date(d)
        dt.setHours(0, 0, 0, 0)
        dt.setDate(dt.getDate() + 4 - (dt.getDay() || 7))
        const yearStart = new Date(dt.getFullYear(), 0, 1)
        const weekNo = Math.ceil(((dt.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
        return { key: `${yr}-W${String(weekNo).padStart(2, '0')}`, label: `W${weekNo} ${yr}` }
      }
      // default: day
      const dayLabel = new Intl.DateTimeFormat('en-US', {
        timeZone: nairobiTimezone,
        day: 'numeric',
        month: 'short',
      }).format(d)
      return { key: `${yr}-${mo}-${da}`, label: dayLabel }
    }

    interface BucketData {
      date: string
      label: string
      grossSales: number
      discounts: number
      refunds: number
      netRevenue: number
      cogs: number
      grossProfit: number
      transactionCount: number
      unitsSold: number
    }

    const bucketMap = new Map<string, BucketData>()

    const getOrCreateBucket = (date: Date) => {
      const { key, label } = getBucketKey(date)
      if (!bucketMap.has(key)) {
        bucketMap.set(key, {
          date: key,
          label,
          grossSales: 0,
          discounts: 0,
          refunds: 0,
          netRevenue: 0,
          cogs: 0,
          grossProfit: 0,
          transactionCount: 0,
          unitsSold: 0,
        })
      }
      return bucketMap.get(key)!
    }

    // Process sales
    for (const sale of sales) {
      const b = getOrCreateBucket(sale.createdAt)
      b.transactionCount += 1
      b.discounts += Number(sale.discount || 0)

      for (const item of sale.items) {
        const qty = Number(item.quantity)
        const qtyRet = Number(item.quantityReturned || 0)
        const netQty = Math.max(0, qty - qtyRet)
        const unitPrice = Number(item.unitPrice)
        const unitCost =
          item.unitCost !== null && item.unitCost !== undefined
            ? Number(item.unitCost)
            : Number(item.product.costPrice)

        b.grossSales += qty * unitPrice
        b.discounts += Number(item.discount || 0)
        b.unitsSold += netQty
        b.cogs += netQty * unitCost
      }
    }

    // Process returns into buckets
    for (const ret of returns) {
      const b = getOrCreateBucket(ret.createdAt)
      b.refunds += Number(ret.refundAmount)
    }

    // Calculate net revenue and gross profit per bucket
    const timeSeries: BucketData[] = []
    for (const [_, b] of bucketMap.entries()) {
      b.grossSales = Math.round(b.grossSales * 100) / 100
      b.discounts = Math.round(b.discounts * 100) / 100
      b.refunds = Math.round(b.refunds * 100) / 100
      b.netRevenue = Math.max(0, Math.round((b.grossSales - b.discounts - b.refunds) * 100) / 100)
      b.cogs = Math.round(b.cogs * 100) / 100
      b.grossProfit = Math.round((b.netRevenue - b.cogs) * 100) / 100
      b.unitsSold = Math.round(b.unitsSold * 100) / 100
      timeSeries.push(b)
    }

    // Sort timeSeries by date key
    timeSeries.sort((a, b) => a.date.localeCompare(b.date))

    // Payment methods aggregation
    const paymentMap = new Map<PaymentMethod, { count: number; totalAmount: number }>()
    for (const m of Object.values(PaymentMethod)) {
      paymentMap.set(m, { count: 0, totalAmount: 0 })
    }

    let totalPaymentAmount = 0
    for (const sale of sales) {
      for (const p of sale.payments) {
        const existing = paymentMap.get(p.method) || { count: 0, totalAmount: 0 }
        const amt = Number(p.amount)
        existing.count += 1
        existing.totalAmount += amt
        totalPaymentAmount += amt
        paymentMap.set(p.method, existing)
      }
    }

    const paymentMethods = Array.from(paymentMap.entries())
      .map(([method, data]) => ({
        method,
        count: data.count,
        totalAmount: Math.round(data.totalAmount * 100) / 100,
        percentage:
          totalPaymentAmount > 0
            ? Math.round((data.totalAmount / totalPaymentAmount) * 1000) / 10
            : 0,
      }))
      .filter((p) => p.count > 0 || ['CASH', 'MOBILE_MONEY'].includes(p.method))

    // Overall totals for filtered set
    const totalGross = timeSeries.reduce((acc, t) => acc + t.grossSales, 0)
    const totalDiscounts = timeSeries.reduce((acc, t) => acc + t.discounts, 0)
    const totalRefunds = timeSeries.reduce((acc, t) => acc + t.refunds, 0)
    const totalNetRevenue = timeSeries.reduce((acc, t) => acc + t.netRevenue, 0)
    const totalCogs = timeSeries.reduce((acc, t) => acc + t.cogs, 0)
    const totalProfit = timeSeries.reduce((acc, t) => acc + t.grossProfit, 0)
    const totalTransactions = timeSeries.reduce((acc, t) => acc + t.transactionCount, 0)
    const totalUnits = timeSeries.reduce((acc, t) => acc + t.unitsSold, 0)

    return {
      currency: 'KES',
      period: query.period,
      periodLabel: range.label,
      interval,
      timeSeries,
      paymentMethods,
      totals: {
        grossSales: Math.round(totalGross * 100) / 100,
        discounts: Math.round(totalDiscounts * 100) / 100,
        refunds: Math.round(totalRefunds * 100) / 100,
        netRevenue: Math.round(totalNetRevenue * 100) / 100,
        cogs: Math.round(totalCogs * 100) / 100,
        grossProfit: Math.round(totalProfit * 100) / 100,
        transactionCount: totalTransactions,
        averageSaleValue:
          totalTransactions > 0 ? Math.round((totalNetRevenue / totalTransactions) * 100) / 100 : 0,
        totalUnitsSold: Math.round(totalUnits * 100) / 100,
      },
    }
  }

  /**
   * 3. Get Product-Level Profitability & Margins Analysis
   */
  async getProductProfitability(
    businessId: string,
    query: Partial<ProfitabilityQuery> & { period: ReportPeriod }
  ) {
    const range = this.getPeriodDateRange(query.period, query.startDate, query.endDate)

    // Build item filter
    const whereItem: Prisma.SaleItemWhereInput = {
      sale: {
        businessId,
        status: SaleStatus.COMPLETED,
        createdAt: { gte: range.startDate, lte: range.endDate },
      },
      ...(query.categoryId ? { product: { categoryId: query.categoryId } } : {}),
      ...(query.search
        ? {
            OR: [
              { productName: { contains: query.search, mode: 'insensitive' } },
              { productSku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const items = await prisma.saleItem.findMany({
      where: whereItem,
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            imageUrl: true,
            costPrice: true,
            sellingPrice: true,
            category: { select: { id: true, name: true } },
          },
        },
      },
    })

    // Group by product
    interface ProductAgg {
      productId: string
      productName: string
      sku: string
      imageUrl?: string | null
      categoryName: string
      unitsSold: number
      unitsReturned: number
      netUnitsSold: number
      grossSales: number
      discounts: number
      refunds: number
      netRevenue: number
      costSum: number
      cogs: number
      grossProfit: number
      grossMarginPercent: number
      snapshotUnitCost: number
      currentCostPrice: number
      hasEstimatedCost: boolean
    }

    const productMap = new Map<string, ProductAgg>()

    for (const item of items) {
      const pid = item.productId
      if (!productMap.has(pid)) {
        productMap.set(pid, {
          productId: pid,
          productName: item.productName,
          sku: item.productSku,
          imageUrl: item.product.imageUrl || null,
          categoryName: item.product.category?.name || 'Uncategorized',
          unitsSold: 0,
          unitsReturned: 0,
          netUnitsSold: 0,
          grossSales: 0,
          discounts: 0,
          refunds: 0,
          netRevenue: 0,
          costSum: 0,
          cogs: 0,
          grossProfit: 0,
          grossMarginPercent: 0,
          snapshotUnitCost: 0,
          currentCostPrice: Number(item.product.costPrice),
          hasEstimatedCost: false,
        })
      }

      const p = productMap.get(pid)!
      const qty = Number(item.quantity)
      const qtyRet = Number(item.quantityReturned || 0)
      const netQty = Math.max(0, qty - qtyRet)
      const unitPrice = Number(item.unitPrice)
      const discount = Number(item.discount || 0)

      let unitCost: number
      if (item.unitCost !== null && item.unitCost !== undefined) {
        unitCost = Number(item.unitCost)
      } else {
        unitCost = Number(item.product.costPrice)
        p.hasEstimatedCost = true
      }

      p.unitsSold += qty
      p.unitsReturned += qtyRet
      p.netUnitsSold += netQty
      p.grossSales += qty * unitPrice
      p.discounts += discount
      p.costSum += netQty * unitCost
    }

    // Calculate profitability per product
    let totalGrossSales = 0
    let totalDiscounts = 0
    let totalNetRevenue = 0
    let totalCogs = 0
    let totalProfit = 0
    let totalNetUnits = 0

    const list: ProductAgg[] = []
    for (const [_, p] of productMap.entries()) {
      p.grossSales = Math.round(p.grossSales * 100) / 100
      p.discounts = Math.round(p.discounts * 100) / 100
      p.netRevenue = Math.max(0, Math.round((p.grossSales - p.discounts) * 100) / 100)
      p.cogs = Math.round(p.costSum * 100) / 100
      p.grossProfit = Math.round((p.netRevenue - p.cogs) * 100) / 100
      p.grossMarginPercent =
        p.netRevenue > 0 ? Math.round((p.grossProfit / p.netRevenue) * 1000) / 10 : 0
      p.snapshotUnitCost =
        p.netUnitsSold > 0 ? Math.round((p.costSum / p.netUnitsSold) * 100) / 100 : p.currentCostPrice

      totalGrossSales += p.grossSales
      totalDiscounts += p.discounts
      totalNetRevenue += p.netRevenue
      totalCogs += p.cogs
      totalProfit += p.grossProfit
      totalNetUnits += p.netUnitsSold

      list.push(p)
    }

    // Sort list
    const sortBy = query.sortBy || 'grossProfit'
    const sortOrder = query.sortOrder || 'desc'
    list.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'productName') {
        comparison = a.productName.localeCompare(b.productName)
      } else {
        comparison = (a[sortBy] as number) - (b[sortBy] as number)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Pagination
    const page = query.page || 1
    const limit = query.limit || 20
    const totalCount = list.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const paginatedItems = list.slice((page - 1) * limit, page * limit)

    return {
      currency: 'KES',
      period: query.period,
      periodLabel: range.label,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      totals: {
        unitsSold: Math.round(totalNetUnits * 100) / 100,
        grossSales: Math.round(totalGrossSales * 100) / 100,
        discounts: Math.round(totalDiscounts * 100) / 100,
        netRevenue: Math.round(totalNetRevenue * 100) / 100,
        cogs: Math.round(totalCogs * 100) / 100,
        grossProfit: Math.round(totalProfit * 100) / 100,
        grossMarginPercent:
          totalNetRevenue > 0 ? Math.round((totalProfit / totalNetRevenue) * 1000) / 10 : 0,
      },
      items: paginatedItems,
    }
  }

  /**
   * 4. Get Inventory Intelligence, Turnover, and Dead Stock Analysis
   */
  async getInventoryIntelligence(
    businessId: string,
    query: Partial<InventoryIntelligenceQuery> = {}
  ) {
    const lookbackDays = query.lookbackDays || 60
    const now = new Date()
    const lookbackStart = new Date(now.getTime() - lookbackDays * 24 * 60 * 60 * 1000)

    // 1. Fetch products with stock level and category
    const whereProduct: Prisma.ProductWhereInput = {
      businessId,
      ...(query.categoryId ? { categoryId: query.categoryId } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { sku: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    }

    const products = await prisma.product.findMany({
      where: whereProduct,
      include: {
        category: { select: { id: true, name: true } },
        stockLevel: true,
      },
      orderBy: { name: 'asc' },
    })

    // 2. Fetch sales items sold during the lookback period
    const recentItems = await prisma.saleItem.findMany({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: lookbackStart, lte: now },
        },
      },
      select: {
        productId: true,
        quantity: true,
        quantityReturned: true,
        unitCost: true,
      },
    })

    const productSalesInPeriod = new Map<string, { unitsSold: number; cogs: number }>()
    for (const item of recentItems) {
      const pid = item.productId
      const qty = Number(item.quantity)
      const qtyRet = Number(item.quantityReturned || 0)
      const netQty = Math.max(0, qty - qtyRet)
      const cost = Number(item.unitCost || 0)

      const existing = productSalesInPeriod.get(pid) || { unitsSold: 0, cogs: 0 }
      existing.unitsSold += netQty
      existing.cogs += netQty * cost
      productSalesInPeriod.set(pid, existing)
    }

    // 3. Fetch all-time latest sale date for each product
    const latestSales = await prisma.saleItem.groupBy({
      by: ['productId'],
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
        },
      },
      _max: {
        id: true, // We will also fetch latest sale date directly
      },
    })

    // Query latest sale item createdAt per product
    const productLastSaleDateMap = new Map<string, Date>()
    const allRecentSales = await prisma.saleItem.findMany({
      where: {
        sale: {
          businessId,
          status: SaleStatus.COMPLETED,
        },
      },
      select: {
        productId: true,
        sale: { select: { createdAt: true } },
      },
      orderBy: { sale: { createdAt: 'desc' } },
    })

    for (const s of allRecentSales) {
      if (s.sale?.createdAt && !productLastSaleDateMap.has(s.productId)) {
        productLastSaleDateMap.set(s.productId, s.sale.createdAt)
      }
    }

    interface InventoryItemReport {
      productId: string
      productName: string
      sku: string
      imageUrl?: string | null
      categoryName: string
      unit: string
      currentStock: number
      costPrice: number
      sellingPrice: number
      stockValuation: number
      unitsSoldInPeriod: number
      cogsInPeriod: number
      salesVelocity: number // units/day
      daysOfInventoryOnHand: number | null
      lastSaleDate: string | null
      daysSinceLastSale: number | null
      hasEverSold: boolean
      classification: 'FAST_MOVING' | 'SLOW_MOVING' | 'POTENTIALLY_DEAD_STOCK' | 'OUT_OF_STOCK'
      annualizedTurnoverRatio: number
    }

    let totalCatalogProducts = products.length
    let totalStockValuation = 0
    let totalUnitsInStock = 0
    let outOfStockCount = 0
    let fastMovingCount = 0
    let slowMovingCount = 0
    let deadStockCount = 0
    let deadStockValuation = 0
    let totalCogsInPeriod = 0

    const items: InventoryItemReport[] = []

    for (const p of products) {
      const stock = Number(p.stockLevel?.quantity || 0)
      const cost = Number(p.costPrice)
      const selling = Number(p.sellingPrice)
      const valuation = Math.round(stock * cost * 100) / 100
      const salesData = productSalesInPeriod.get(p.id) || { unitsSold: 0, cogs: 0 }
      const unitsSold = Math.round(salesData.unitsSold * 100) / 100
      const cogs = Math.round(salesData.cogs * 100) / 100
      const velocity = Math.round((unitsSold / lookbackDays) * 1000) / 1000

      const lastDate = productLastSaleDateMap.get(p.id) || null
      let daysSinceLastSale: number | null = null
      if (lastDate) {
        daysSinceLastSale = Math.max(
          0,
          Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24))
        )
      }

      let classification: 'FAST_MOVING' | 'SLOW_MOVING' | 'POTENTIALLY_DEAD_STOCK' | 'OUT_OF_STOCK'
      if (stock <= 0) {
        classification = 'OUT_OF_STOCK'
        outOfStockCount += 1
      } else if (unitsSold === 0) {
        classification = 'POTENTIALLY_DEAD_STOCK'
        deadStockCount += 1
        deadStockValuation += valuation
      } else if (velocity >= 0.5) {
        classification = 'FAST_MOVING'
        fastMovingCount += 1
      } else {
        classification = 'SLOW_MOVING'
        slowMovingCount += 1
      }

      const daysOnHand = velocity > 0 ? Math.round(stock / velocity) : null
      const turnoverRatio =
        valuation > 0 ? Math.round((cogs / valuation) * (365 / lookbackDays) * 100) / 100 : 0

      totalStockValuation += valuation
      totalUnitsInStock += stock
      totalCogsInPeriod += cogs

      items.push({
        productId: p.id,
        productName: p.name,
        sku: p.sku,
        imageUrl: p.imageUrl,
        categoryName: p.category?.name || 'Uncategorized',
        unit: p.unit,
        currentStock: stock,
        costPrice: cost,
        sellingPrice: selling,
        stockValuation: valuation,
        unitsSoldInPeriod: unitsSold,
        cogsInPeriod: cogs,
        salesVelocity: velocity,
        daysOfInventoryOnHand: daysOnHand,
        lastSaleDate: lastDate ? lastDate.toISOString() : null,
        daysSinceLastSale,
        hasEverSold: lastDate !== null,
        classification,
        annualizedTurnoverRatio: turnoverRatio,
      })
    }

    // Filter by classification if requested
    let filtered = items
    if (query.classification && query.classification !== 'ALL') {
      filtered = items.filter((i) => i.classification === query.classification)
    }

    // Sort
    const sortBy = query.sortBy || 'salesVelocity'
    const sortOrder = query.sortOrder || 'desc'
    filtered.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'productName') {
        comparison = a.productName.localeCompare(b.productName)
      } else if (sortBy === 'unitsSold') {
        comparison = a.unitsSoldInPeriod - b.unitsSoldInPeriod
      } else if (sortBy === 'daysSinceLastSale') {
        const valA = a.daysSinceLastSale ?? 999999
        const valB = b.daysSinceLastSale ?? 999999
        comparison = valA - valB
      } else {
        comparison = (a[sortBy] as number) - (b[sortBy] as number)
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    // Pagination
    const page = query.page || 1
    const limit = query.limit || 20
    const totalCount = filtered.length
    const totalPages = Math.ceil(totalCount / limit) || 1
    const paginatedItems = filtered.slice((page - 1) * limit, page * limit)

    const annualizedTurnover =
      totalStockValuation > 0
        ? Math.round((totalCogsInPeriod / totalStockValuation) * (365 / lookbackDays) * 100) / 100
        : 0

    return {
      currency: 'KES',
      lookbackDays,
      lookbackStartDate: lookbackStart.toISOString(),
      summary: {
        totalCatalogProducts,
        totalStockValuation: Math.round(totalStockValuation * 100) / 100,
        totalUnitsInStock: Math.round(totalUnitsInStock * 100) / 100,
        outOfStockCount,
        fastMovingCount,
        slowMovingCount,
        deadStockCount,
        deadStockValuation: Math.round(deadStockValuation * 100) / 100,
        annualizedTurnoverRatio: annualizedTurnover,
        turnoverFormulaExplanation:
          'Inventory Turnover Ratio = (COGS in Lookback Period / Current Stock Valuation) * (365 / Lookback Days). It measures how many times inventory is sold and replaced over an annualized cycle.',
      },
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
      items: paginatedItems,
    }
  }

  /**
   * 5. Generate CSV Export with UTF-8 BOM and Formula Injection Prevention
   */
  async generateCsvExport(businessId: string, query: ReportExportQuery): Promise<string> {
    const BOM = '\uFEFF'
    const rows: string[] = []

    if (query.type === 'summary') {
      const summary = await this.getFinancialSummary(businessId, {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
      })

      rows.push(
        ['Metric', 'Current Period (KES)', 'Preceding Period (KES)', 'Delta (KES)', 'Change %']
          .map(escapeCsvCell)
          .join(',')
      )

      const m = summary.metrics
      const c = summary.comparisons
      rows.push(
        [
          'Gross Sales Revenue',
          m.grossSales,
          c.grossSales.previous,
          c.grossSales.delta,
          `${c.grossSales.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
      rows.push(
        ['Sales Discounts', m.discounts, '', '', ''].map(escapeCsvCell).join(',')
      )
      rows.push(
        ['Returns & Refunds', m.refunds, '', '', ''].map(escapeCsvCell).join(',')
      )
      rows.push(
        [
          'Net Sales Revenue',
          m.netRevenue,
          c.netRevenue.previous,
          c.netRevenue.delta,
          `${c.netRevenue.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
      rows.push(
        ['Cost of Goods Sold (COGS)', m.cogs, '', '', ''].map(escapeCsvCell).join(',')
      )
      rows.push(
        [
          'Estimated Gross Profit',
          m.grossProfit,
          c.grossProfit.previous,
          c.grossProfit.delta,
          `${c.grossProfit.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
      rows.push(
        ['Gross Margin %', `${m.grossMarginPercent}%`, '', '', ''].map(escapeCsvCell).join(',')
      )
      rows.push(
        [
          'Total Operating Expenses',
          m.operatingExpenses,
          c.operatingExpenses.previous,
          c.operatingExpenses.delta,
          `${c.operatingExpenses.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
      rows.push(
        [
          'Estimated Operating Profit',
          m.operatingProfit,
          c.operatingProfit.previous,
          c.operatingProfit.delta,
          `${c.operatingProfit.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
      rows.push(
        ['Operating Margin %', `${m.operatingMarginPercent}%`, '', '', ''].map(escapeCsvCell).join(',')
      )
      rows.push(
        [
          'Completed Transactions',
          m.transactionCount,
          c.transactionCount.previous,
          c.transactionCount.delta,
          `${c.transactionCount.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
      rows.push(
        [
          'Average Sale Value',
          m.averageSaleValue,
          c.averageSaleValue.previous,
          c.averageSaleValue.delta,
          `${c.averageSaleValue.percent}%`,
        ]
          .map(escapeCsvCell)
          .join(',')
      )
    } else if (query.type === 'revenue') {
      const data = await this.getRevenueTrends(businessId, {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
      })

      rows.push(
        [
          'Date / Period',
          'Gross Sales (KES)',
          'Discounts (KES)',
          'Refunds (KES)',
          'Net Revenue (KES)',
          'COGS (KES)',
          'Gross Profit (KES)',
          'Completed Sales',
          'Units Sold',
        ]
          .map(escapeCsvCell)
          .join(',')
      )

      for (const t of data.timeSeries) {
        rows.push(
          [
            t.label,
            t.grossSales,
            t.discounts,
            t.refunds,
            t.netRevenue,
            t.cogs,
            t.grossProfit,
            t.transactionCount,
            t.unitsSold,
          ]
            .map(escapeCsvCell)
            .join(',')
        )
      }
    } else if (query.type === 'profitability') {
      const data = await this.getProductProfitability(businessId, {
        period: query.period,
        startDate: query.startDate,
        endDate: query.endDate,
        categoryId: query.categoryId,
        limit: 1000,
      })

      rows.push(
        [
          'SKU',
          'Product Name',
          'Category',
          'Net Units Sold',
          'Gross Sales (KES)',
          'Discounts (KES)',
          'Net Revenue (KES)',
          'Snapshot Unit Cost (KES)',
          'COGS (KES)',
          'Gross Profit (KES)',
          'Margin %',
          'Cost Note',
        ]
          .map(escapeCsvCell)
          .join(',')
      )

      for (const p of data.items) {
        rows.push(
          [
            p.sku,
            p.productName,
            p.categoryName,
            p.netUnitsSold,
            p.grossSales,
            p.discounts,
            p.netRevenue,
            p.snapshotUnitCost,
            p.cogs,
            p.grossProfit,
            `${p.grossMarginPercent}%`,
            p.hasEstimatedCost ? 'Estimated from catalog' : 'Recorded at sale',
          ]
            .map(escapeCsvCell)
            .join(',')
        )
      }
    } else if (query.type === 'inventory' || query.type === 'dead_stock') {
      const data = await this.getInventoryIntelligence(businessId, {
        lookbackDays: query.lookbackDays || 60,
        classification: query.type === 'dead_stock' ? 'POTENTIALLY_DEAD_STOCK' : 'ALL',
        categoryId: query.categoryId,
        limit: 1000,
      })

      rows.push(
        [
          'SKU',
          'Product Name',
          'Category',
          'Current Stock',
          'Cost Price (KES)',
          'Selling Price (KES)',
          'Stock Valuation (KES)',
          `Units Sold (${data.lookbackDays}d)`,
          'Velocity (units/day)',
          'Days on Hand',
          'Last Sale Date',
          'Days Since Sale',
          'Classification',
          'Annualized Turnover',
        ]
          .map(escapeCsvCell)
          .join(',')
      )

      for (const item of data.items) {
        rows.push(
          [
            item.sku,
            item.productName,
            item.categoryName,
            item.currentStock,
            item.costPrice,
            item.sellingPrice,
            item.stockValuation,
            item.unitsSoldInPeriod,
            item.salesVelocity,
            item.daysOfInventoryOnHand !== null ? item.daysOfInventoryOnHand : 'N/A',
            item.lastSaleDate ? item.lastSaleDate.split('T')[0] : 'Never',
            item.daysSinceLastSale !== null ? item.daysSinceLastSale : 'N/A',
            item.classification,
            item.annualizedTurnoverRatio,
          ]
            .map(escapeCsvCell)
            .join(',')
        )
      }
    } else if (query.type === 'expenses') {
      const range = this.getPeriodDateRange(query.period, query.startDate, query.endDate)
      const expenses = await prisma.expense.findMany({
        where: {
          businessId,
          expenseDate: { gte: range.startDate, lte: range.endDate },
        },
        include: {
          createdBy: { select: { name: true } },
        },
        orderBy: { expenseDate: 'desc' },
      })

      rows.push(
        [
          'Expense Date',
          'Category',
          'Description',
          'Amount (KES)',
          'Reference',
          'Recorded By',
          'Notes',
        ]
          .map(escapeCsvCell)
          .join(',')
      )

      for (const exp of expenses) {
        rows.push(
          [
            exp.expenseDate.toISOString().split('T')[0],
            exp.category,
            exp.description,
            Number(exp.amount),
            exp.referenceNumber || '',
            exp.createdBy.name,
            exp.notes || '',
          ]
            .map(escapeCsvCell)
            .join(',')
        )
      }
    }

    return BOM + rows.join('\r\n')
  }

  /**
   * 6. Generate Multi-Page Management Accounting PDF Report using PDFKit
   */
  async generatePdfReport(
    businessId: string,
    query: ReportSummaryQuery,
    resStream: Writable
  ): Promise<void> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { name: true, currency: true, timezone: true },
    })

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND')
    }

    const summary = await this.getFinancialSummary(businessId, query)
    const trends = await this.getRevenueTrends(businessId, {
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate,
    })
    const profitability = await this.getProductProfitability(businessId, {
      period: query.period,
      startDate: query.startDate,
      endDate: query.endDate,
      limit: 10,
    })
    const inventory = await this.getInventoryIntelligence(businessId, {
      lookbackDays: 60,
      limit: 10,
    })

    // Fetch expense breakdown for period
    const range = this.getPeriodDateRange(query.period, query.startDate, query.endDate)
    const rawExpenses = await prisma.expense.findMany({
      where: {
        businessId,
        expenseDate: { gte: range.startDate, lte: range.endDate },
      },
    })

    const expenseCategoryMap = new Map<ExpenseCategory, number>()
    let totalExpenseAmount = 0
    for (const exp of rawExpenses) {
      const amt = Number(exp.amount)
      expenseCategoryMap.set(exp.category, (expenseCategoryMap.get(exp.category) || 0) + amt)
      totalExpenseAmount += amt
    }

    // Initialize PDF Document
    const doc = new PDFDocument({
      size: 'A4',
      margin: 36,
      bufferPages: true,
      info: {
        Title: `${business.name} - Management Financial Report`,
        Author: 'TillPro Retail Management',
        Subject: 'Management Accounting & Performance Report',
      },
    })

    doc.pipe(resStream)

    const formatKES = (val: number) =>
      `KES ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    // Helper to draw horizontal divider
    const drawDivider = (y: number) => {
      doc.save().strokeColor('#cbd5e1').lineWidth(0.75).moveTo(36, y).lineTo(559, y).stroke().restore()
    }

    // --- Page Header ---
    doc.fillColor('#172B4D').fontSize(18).font('Helvetica-Bold').text('TillPro', 36, 36)
    doc
      .fillColor('#14B8A6')
      .fontSize(10)
      .font('Helvetica-Bold')
      .text('RETAIL MANAGEMENT SYSTEM', 36, 58)

    doc
      .fillColor('#1e293b')
      .fontSize(13)
      .font('Helvetica-Bold')
      .text(business.name, 300, 36, { align: 'right' })

    const nairobiNow = new Intl.DateTimeFormat('en-KE', {
      timeZone: 'Africa/Nairobi',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date())

    doc
      .fillColor('#64748b')
      .fontSize(8)
      .font('Helvetica')
      .text(`Period: ${summary.periodLabel}`, 300, 52, { align: 'right' })
      .text(`Generated: ${nairobiNow} EAT`, 300, 64, { align: 'right' })

    drawDivider(82)

    // Report Title
    doc
      .fillColor('#1e293b')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text('EXECUTIVE FINANCIAL & PROFITABILITY SUMMARY', 36, 94)

    doc
      .fillColor('#64748b')
      .fontSize(9)
      .font('Helvetica')
      .text(
        `Comparison period: ${summary.precedingStartDate.split('T')[0]} to ${summary.precedingEndDate.split('T')[0]} (${summary.periodDays} days)`,
        36,
        112
      )

    // Table: Executive Summary KPIs
    let tableY = 132
    doc.rect(36, tableY, 523, 20).fill('#f1f5f9')
    doc.fillColor('#334155').fontSize(9).font('Helvetica-Bold')
    doc.text('Key Performance Metric', 44, tableY + 6)
    doc.text('Current Value', 260, tableY + 6, { width: 90, align: 'right' })
    doc.text('Prior Period', 360, tableY + 6, { width: 85, align: 'right' })
    doc.text('Change (%)', 455, tableY + 6, { width: 90, align: 'right' })
    tableY += 20

    const summaryRows = [
      {
        name: 'Gross Sales Revenue',
        val: formatKES(summary.metrics.grossSales),
        prev: formatKES(summary.comparisons.grossSales.previous),
        delta: `${summary.comparisons.grossSales.percent > 0 ? '+' : ''}${summary.comparisons.grossSales.percent}%`,
      },
      {
        name: 'Discounts Granted',
        val: formatKES(summary.metrics.discounts),
        prev: '-',
        delta: '-',
      },
      {
        name: 'Returns & Customer Refunds',
        val: formatKES(summary.metrics.refunds),
        prev: '-',
        delta: '-',
      },
      {
        name: 'Net Sales Revenue',
        val: formatKES(summary.metrics.netRevenue),
        prev: formatKES(summary.comparisons.netRevenue.previous),
        delta: `${summary.comparisons.netRevenue.percent > 0 ? '+' : ''}${summary.comparisons.netRevenue.percent}%`,
        bold: true,
      },
      {
        name: 'Cost of Goods Sold (COGS)',
        val: formatKES(summary.metrics.cogs),
        prev: '-',
        delta: summary.metrics.hasEstimatedCosts ? '(costs estimated)' : '',
      },
      {
        name: 'Estimated Gross Profit',
        val: formatKES(summary.metrics.grossProfit),
        prev: formatKES(summary.comparisons.grossProfit.previous),
        delta: `${summary.comparisons.grossProfit.percent > 0 ? '+' : ''}${summary.comparisons.grossProfit.percent}%`,
        bold: true,
      },
      {
        name: 'Gross Margin Percentage',
        val: `${summary.metrics.grossMarginPercent}%`,
        prev: '-',
        delta: '',
      },
      {
        name: 'Total Operating Expenses',
        val: formatKES(summary.metrics.operatingExpenses),
        prev: formatKES(summary.comparisons.operatingExpenses.previous),
        delta: `${summary.comparisons.operatingExpenses.percent > 0 ? '+' : ''}${summary.comparisons.operatingExpenses.percent}%`,
      },
      {
        name: 'Estimated Operating Profit (EBIT)',
        val: formatKES(summary.metrics.operatingProfit),
        prev: formatKES(summary.comparisons.operatingProfit.previous),
        delta: `${summary.comparisons.operatingProfit.percent > 0 ? '+' : ''}${summary.comparisons.operatingProfit.percent}%`,
        bold: true,
      },
      {
        name: 'Estimated Operating Margin',
        val: `${summary.metrics.operatingMarginPercent}%`,
        prev: '-',
        delta: '',
      },
      {
        name: 'Completed POS Transactions',
        val: String(summary.metrics.transactionCount),
        prev: String(summary.comparisons.transactionCount.previous),
        delta: `${summary.comparisons.transactionCount.percent > 0 ? '+' : ''}${summary.comparisons.transactionCount.percent}%`,
      },
      {
        name: 'Average Sale Value',
        val: formatKES(summary.metrics.averageSaleValue),
        prev: formatKES(summary.comparisons.averageSaleValue.previous),
        delta: `${summary.comparisons.averageSaleValue.percent > 0 ? '+' : ''}${summary.comparisons.averageSaleValue.percent}%`,
      },
    ]

    for (let i = 0; i < summaryRows.length; i++) {
      const row = summaryRows[i]
      if (i % 2 === 1) {
        doc.rect(36, tableY, 523, 18).fill('#f8fafc')
      }
      doc
        .fillColor(row.bold ? '#0f172a' : '#334155')
        .fontSize(8.5)
        .font(row.bold ? 'Helvetica-Bold' : 'Helvetica')

      doc.text(row.name, 44, tableY + 4)
      doc.text(row.val, 260, tableY + 4, { width: 90, align: 'right' })
      doc.text(row.prev, 360, tableY + 4, { width: 85, align: 'right' })
      doc.text(row.delta, 455, tableY + 4, { width: 90, align: 'right' })
      tableY += 18
    }

    // Payment Methods Breakdown Box
    tableY += 14
    doc.fillColor('#1e293b').fontSize(11).font('Helvetica-Bold').text('SALES BY PAYMENT METHOD', 36, tableY)
    tableY += 18

    doc.rect(36, tableY, 523, 18).fill('#f1f5f9')
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
    doc.text('Payment Channel', 44, tableY + 5)
    doc.text('Transactions', 200, tableY + 5, { width: 80, align: 'right' })
    doc.text('Total Amount (KES)', 310, tableY + 5, { width: 110, align: 'right' })
    doc.text('Share (%)', 450, tableY + 5, { width: 90, align: 'right' })
    tableY += 18

    for (const pm of trends.paymentMethods) {
      doc.fillColor('#334155').fontSize(8).font('Helvetica')
      const label =
        pm.method === 'MOBILE_MONEY'
          ? 'M-Pesa / Mobile Money'
          : pm.method === 'BANK_TRANSFER'
            ? 'Bank Transfer'
            : pm.method
      doc.text(label, 44, tableY + 4)
      doc.text(String(pm.count), 200, tableY + 4, { width: 80, align: 'right' })
      doc.text(formatKES(pm.totalAmount), 310, tableY + 4, { width: 110, align: 'right' })
      doc.text(`${pm.percentage}%`, 450, tableY + 4, { width: 90, align: 'right' })
      tableY += 16
    }

    // --- Page 2: Product Margins & Expenses Breakdown ---
    doc.addPage()

    // Page 2 Header
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('TOP PROFITABLE PRODUCTS', 36, 36)
    doc
      .fillColor('#64748b')
      .fontSize(8.5)
      .font('Helvetica')
      .text('Ranked by gross profit contribution during the reporting period', 36, 54)

    tableY = 72
    doc.rect(36, tableY, 523, 18).fill('#f1f5f9')
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
    doc.text('Product Name (SKU)', 44, tableY + 5)
    doc.text('Units Sold', 230, tableY + 5, { width: 60, align: 'right' })
    doc.text('Net Revenue', 300, tableY + 5, { width: 80, align: 'right' })
    doc.text('Gross Profit', 390, tableY + 5, { width: 80, align: 'right' })
    doc.text('Margin', 480, tableY + 5, { width: 65, align: 'right' })
    tableY += 18

    for (const p of profitability.items) {
      doc.fillColor('#334155').fontSize(8).font('Helvetica')
      doc.text(`${p.productName} (${p.sku})`, 44, tableY + 4, { width: 180, lineBreak: false })
      doc.text(String(p.netUnitsSold), 230, tableY + 4, { width: 60, align: 'right' })
      doc.text(formatKES(p.netRevenue), 300, tableY + 4, { width: 80, align: 'right' })
      doc.text(formatKES(p.grossProfit), 390, tableY + 4, { width: 80, align: 'right' })
      doc.text(`${p.grossMarginPercent}%`, 480, tableY + 4, { width: 65, align: 'right' })
      tableY += 16
    }

    // Operating Expense Breakdown
    tableY += 24
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('OPERATING EXPENSE BREAKDOWN', 36, tableY)
    tableY += 20

    doc.rect(36, tableY, 523, 18).fill('#f1f5f9')
    doc.fillColor('#334155').fontSize(8.5).font('Helvetica-Bold')
    doc.text('Expense Category', 44, tableY + 5)
    doc.text('Amount (KES)', 310, tableY + 5, { width: 110, align: 'right' })
    doc.text('Share of Expenses (%)', 430, tableY + 5, { width: 110, align: 'right' })
    tableY += 18

    const expList = Array.from(expenseCategoryMap.entries()).sort((a, b) => b[1] - a[1])
    if (expList.length === 0) {
      doc.fillColor('#64748b').fontSize(8.5).font('Helvetica-Oblique').text('No expenses recorded in this period.', 44, tableY + 6)
      tableY += 20
    } else {
      for (const [cat, amt] of expList) {
        doc.fillColor('#334155').fontSize(8).font('Helvetica')
        const share = totalExpenseAmount > 0 ? Math.round((amt / totalExpenseAmount) * 1000) / 10 : 0
        doc.text(cat.replace(/_/g, ' '), 44, tableY + 4)
        doc.text(formatKES(amt), 310, tableY + 4, { width: 110, align: 'right' })
        doc.text(`${share}%`, 430, tableY + 4, { width: 110, align: 'right' })
        tableY += 16
      }
    }

    // Inventory Health Snapshot Box
    tableY += 24
    doc.fillColor('#0f172a').fontSize(14).font('Helvetica-Bold').text('INVENTORY VALUATION & TURNOVER HEALTH', 36, tableY)
    tableY += 20

    doc.rect(36, tableY, 523, 80).fill('#f8fafc').strokeColor('#e2e8f0').stroke()
    const invS = inventory.summary
    doc.fillColor('#1e293b').fontSize(9).font('Helvetica-Bold')
    doc.text(`Total Stock Valuation: ${formatKES(invS.totalStockValuation)}`, 48, tableY + 12)
    doc.text(`Total Units in Stock: ${invS.totalUnitsInStock.toLocaleString()}`, 310, tableY + 12)

    doc.font('Helvetica').fontSize(8.5).fillColor('#475569')
    doc.text(`Catalog SKUs: ${invS.totalCatalogProducts}`, 48, tableY + 30)
    doc.text(`Fast-Moving SKUs: ${invS.fastMovingCount}`, 160, tableY + 30)
    doc.text(`Slow-Moving SKUs: ${invS.slowMovingCount}`, 290, tableY + 30)
    doc.text(`Out of Stock: ${invS.outOfStockCount}`, 430, tableY + 30)

    doc.fillColor('#b91c1c').font('Helvetica-Bold').text(
      `Dead Stock Tied Capital: ${formatKES(invS.deadStockValuation)} (${invS.deadStockCount} SKUs without sales in 60 days)`,
      48,
      tableY + 48
    )

    doc.fillColor('#0369a1').font('Helvetica').text(
      `Annualized Inventory Turnover Ratio: ${invS.annualizedTurnoverRatio}x`,
      48,
      tableY + 64
    )

    // --- Footer & Page Numbers on all pages ---
    const totalPages = doc.bufferedPageRange().count
    for (let i = 0; i < totalPages; i++) {
      doc.switchToPage(i)
      drawDivider(800)
      doc
        .fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica')
        .text(
          'TillPro Management Accounting Report — For Internal Management Purposes Only — Not an Official KRA Fiscal Tax Invoice',
          36,
          806,
          { width: 440, lineBreak: false }
        )
      doc
        .fillColor('#64748b')
        .fontSize(7.5)
        .font('Helvetica')
        .text(`Page ${i + 1} of ${totalPages}`, 480, 806, { width: 80, align: 'right' })
    }

    doc.end()
  }
}

export const reportService = new ReportService()
