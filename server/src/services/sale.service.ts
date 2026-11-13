import { prisma } from '../db/prisma.js'
import {
  CreateSaleInput,
  SaleQueryInput,
  CancelSaleInput,
} from '../schemas/sale.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  Prisma,
  Role,
  SaleStatus,
  PaymentStatus,
  PaymentMethod,
  StockMovementType,
} from '@prisma/client'
import { alertEvaluationService } from './alertEvaluation.service.js'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export class SaleService {
  /**
   * Generates a sequential receipt number unique to the business (e.g., REC-0001).
   */
  async generateReceiptNumber(businessId: string): Promise<string> {
    const count = await prisma.sale.count({
      where: { businessId },
    })

    let nextNumber = count + 1
    let candidate = `REC-${String(nextNumber).padStart(4, '0')}`

    // Ensure uniqueness in case of race condition or gaps
    while (
      await prisma.sale.findUnique({
        where: { businessId_receiptNumber: { businessId, receiptNumber: candidate } },
      })
    ) {
      nextNumber += 1
      candidate = `REC-${String(nextNumber).padStart(4, '0')}`
    }

    return candidate
  }

  /**
   * Completes a POS sale securely in an atomic database transaction.
   * Validates products, recalculates prices/totals server-side, verifies inventory,
   * deducts stock, appends to immutable stock ledger, and records payment.
   */
  async createSale(
    businessId: string,
    cashierId: string,
    cashierRole: Role,
    input: CreateSaleInput
  ) {
    // 1. Role permission: Cashier, Manager, Owner are allowed. Stock clerk is forbidden.
    if (cashierRole === Role.STOCK_CLERK) {
      throw new AppError(
        'Stock clerks are not authorized to create or complete sales transactions.',
        403,
        'FORBIDDEN'
      )
    }

    // 2. Discount authorization check
    // Cashiers cannot apply discounts without Owner/Manager privileges
    const orderDiscountVal = input.discount || 0
    const hasItemDiscount = input.items.some((item) => (item.discount || 0) > 0)
    if ((orderDiscountVal > 0 || hasItemDiscount) && cashierRole === Role.CASHIER) {
      throw new AppError(
        'Cashiers are not authorized to apply discounts. Manager or Owner approval required.',
        403,
        'DISCOUNT_NOT_AUTHORIZED'
      )
    }

    // 3. Idempotency Check
    if (input.idempotencyKey) {
      const existingSale = await prisma.sale.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: {
          items: true,
          payments: true,
          cashier: {
            select: { id: true, name: true, email: true },
          },
          business: {
            select: { id: true, name: true, currency: true },
          },
        },
      })

      if (existingSale) {
        return existingSale
      }
    }

    // 4. Fetch business currency
    const business = await prisma.business.findUnique({
      where: { id: businessId },
    })

    if (!business) {
      throw new AppError('Business not found', 404, 'NOT_FOUND')
    }

    const currency = business.currency || 'KES'

    // 4b. Validate customer if customerId provided
    let customer = null
    if (input.customerId) {
      customer = await prisma.customer.findFirst({
        where: { id: input.customerId, businessId, isActive: true },
      })
      if (!customer) {
        const foreignCustomer = await prisma.customer.findUnique({
          where: { id: input.customerId },
          select: { id: true, businessId: true },
        })
        if (foreignCustomer && foreignCustomer.businessId !== businessId) {
          recordCrossTenantSecurityViolation({
            userId: cashierId,
            sourceBusinessId: businessId,
            targetBusinessId: foreignCustomer.businessId,
            resourceType: 'Customer',
            resourceId: input.customerId,
            action: 'CROSS_TENANT_SALE_CUSTOMER_LINK_BLOCKED',
          }).catch(() => {})
        }
        throw new AppError(
          'Customer not found, archived, or does not belong to this business.',
          400,
          'INVALID_CUSTOMER'
        )
      }
    }

    // 5. Fetch and validate all products
    const productIds = Array.from(new Set(input.items.map((i) => i.productId)))
    const products = await prisma.product.findMany({
      where: {
        id: { in: productIds },
        businessId,
      },
    })

    if (products.length !== productIds.length) {
      const foreignProducts = await prisma.product.findMany({
        where: {
          id: { in: productIds },
          businessId: { not: businessId },
        },
        select: { id: true, businessId: true },
      })
      if (foreignProducts.length > 0) {
        for (const fp of foreignProducts) {
          recordCrossTenantSecurityViolation({
            userId: cashierId,
            sourceBusinessId: businessId,
            targetBusinessId: fp.businessId,
            resourceType: 'Product',
            resourceId: fp.id,
            action: 'CROSS_TENANT_SALE_PRODUCT_LINK_BLOCKED',
          }).catch(() => {})
        }
      }
      throw new AppError(
        'One or more selected products are invalid or do not belong to this business.',
        400,
        'INVALID_PRODUCT'
      )
    }

    // Check all products are active
    const inactiveProduct = products.find((p) => !p.isActive)
    if (inactiveProduct) {
      throw new AppError(
        `Product '${inactiveProduct.name}' (${inactiveProduct.sku}) is archived and cannot be sold.`,
        400,
        'PRODUCT_NOT_ACTIVE'
      )
    }

    const productMap = new Map(products.map((p) => [p.id, p]))

    // 6. Recalculate line totals and overall total server-side
    let calculatedSubtotal = new Prisma.Decimal(0)
    const itemsData = input.items.map((item) => {
      const product = productMap.get(item.productId)!
      const qty = new Prisma.Decimal(item.quantity)
      const unitPrice = product.sellingPrice // Server-authoritative unit selling price
      const unitCost = product.costPrice // Snapshot unit cost for margin auditing
      const itemDiscount = new Prisma.Decimal(item.discount || 0)
      const taxAmount = new Prisma.Decimal(0)

      const grossLineTotal = qty.mul(unitPrice)
      const lineTotal = grossLineTotal.minus(itemDiscount)

      if (lineTotal.lessThan(0)) {
        throw new AppError(
          `Line total for product '${product.name}' cannot be negative after discount.`,
          400,
          'INVALID_DISCOUNT'
        )
      }

      calculatedSubtotal = calculatedSubtotal.plus(lineTotal)

      return {
        productId: product.id,
        productName: product.name,
        productSku: product.sku,
        unit: product.unit,
        quantity: qty,
        unitPrice,
        unitCost,
        discount: itemDiscount,
        taxAmount,
        lineTotal,
        notes: item.notes?.trim() || null,
      }
    })

    const orderDiscount = new Prisma.Decimal(orderDiscountVal)
    const orderTaxAmount = new Prisma.Decimal(input.taxAmount || 0)
    const calculatedTotal = calculatedSubtotal.minus(orderDiscount).plus(orderTaxAmount)

    if (calculatedTotal.lessThan(0)) {
      throw new AppError(
        'Final sale total cannot be negative after applying order discount.',
        400,
        'INVALID_TOTAL'
      )
    }

    // 7. Validate Payments (supports single payment or split payments)
    const rawPayments =
      input.payments && input.payments.length > 0
        ? input.payments
        : input.payment
        ? [{ ...input.payment, amount: calculatedTotal.toNumber() }]
        : []

    if (rawPayments.length === 0) {
      throw new AppError(
        'At least one payment method is required to finalize sale.',
        400,
        'PAYMENT_REQUIRED'
      )
    }

    let totalAllocated = new Prisma.Decimal(0)
    const validatedPaymentsData: Array<{
      businessId: string
      method: PaymentMethod
      amount: Prisma.Decimal
      amountTendered: Prisma.Decimal | null
      changeDue: Prisma.Decimal | null
      reference: string | null
      notes: string | null
    }> = []

    for (const p of rawPayments) {
      const payAmount = p.amount !== undefined ? new Prisma.Decimal(p.amount) : calculatedTotal
      if (payAmount.lessThanOrEqualTo(0)) {
        throw new AppError(
          'Payment allocation amount must be greater than zero.',
          400,
          'INVALID_PAYMENT_AMOUNT'
        )
      }

      let pAmountTendered: Prisma.Decimal | null = null
      let pChangeDue: Prisma.Decimal | null = null

      if (p.method === PaymentMethod.CASH) {
        if (p.amountTendered === undefined || p.amountTendered === null) {
          throw new AppError(
            'Amount tendered is required for cash payments.',
            400,
            'INSUFFICIENT_PAYMENT'
          )
        }

        pAmountTendered = new Prisma.Decimal(p.amountTendered)
        if (pAmountTendered.lessThan(payAmount)) {
          throw new AppError(
            `Amount tendered (${currency} ${pAmountTendered}) is less than total amount due (${currency} ${payAmount}).`,
            400,
            'INSUFFICIENT_PAYMENT'
          )
        }

        pChangeDue = pAmountTendered.minus(payAmount)
      } else {
        pAmountTendered = payAmount
        pChangeDue = new Prisma.Decimal(0)
      }

      totalAllocated = totalAllocated.plus(payAmount)
      validatedPaymentsData.push({
        businessId,
        method: p.method,
        amount: payAmount,
        amountTendered: pAmountTendered,
        changeDue: pChangeDue,
        reference: p.reference?.trim() || null,
        notes: p.notes?.trim() || null,
      })
    }

    if (!totalAllocated.equals(calculatedTotal)) {
      throw new AppError(
        `Total allocated payments (${currency} ${totalAllocated}) must equal sale amount due (${currency} ${calculatedTotal}).`,
        400,
        'PAYMENT_SUM_MISMATCH'
      )
    }

    // 8. Execute atomic transaction
    const createdSale = await prisma.$transaction(async (tx) => {
      // Generate receipt number
      const receiptNumber = await this.generateReceiptNumber(businessId)

      // 8a. Check stock and deduct for each item
      for (const item of itemsData) {
        let stockLevel = await tx.stockLevel.findUnique({
          where: { productId: item.productId },
        })

        if (!stockLevel) {
          stockLevel = await tx.stockLevel.create({
            data: {
              businessId,
              productId: item.productId,
              quantity: new Prisma.Decimal(0),
              reservedQuantity: new Prisma.Decimal(0),
            },
          })
        }

        const previousQuantity = stockLevel.quantity
        const resultingQuantity = previousQuantity.minus(item.quantity)

        if (resultingQuantity.lessThan(0)) {
          throw new AppError(
            `Insufficient stock for '${item.productName}' (${item.productSku}). Available: ${previousQuantity}, Requested: ${item.quantity}. Sale cannot produce negative stock.`,
            400,
            'INSUFFICIENT_STOCK'
          )
        }

        // Update StockLevel balance
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: {
            quantity: resultingQuantity,
          },
        })

        // Append to immutable StockMovement ledger
        await tx.stockMovement.create({
          data: {
            businessId,
            productId: item.productId,
            type: StockMovementType.STOCK_OUT,
            quantityChange: item.quantity.negated(),
            previousQuantity,
            resultingQuantity,
            reason: `POS Sale ${receiptNumber}`,
            reference: receiptNumber,
            userId: cashierId,
          },
        })
      }

      // 8b. Create Sale record
      const createdSale = await tx.sale.create({
        data: {
          businessId,
          receiptNumber,
          cashierId,
          status: SaleStatus.COMPLETED,
          subtotal: calculatedSubtotal,
          discount: orderDiscount,
          taxAmount: orderTaxAmount,
          total: calculatedTotal,
          currency,
          paymentStatus: PaymentStatus.PAID,
          customerId: customer?.id || null,
          customerName: input.customerName?.trim() || customer?.name || null,
          customerPhone: input.customerPhone?.trim() || customer?.phone || null,
          notes: input.notes?.trim() || null,
          idempotencyKey: input.idempotencyKey?.trim() || null,
          completedAt: new Date(),
          items: {
            create: itemsData.map((it) => ({
              productId: it.productId,
              productName: it.productName,
              productSku: it.productSku,
              unit: it.unit,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              unitCost: it.unitCost,
              discount: it.discount,
              taxAmount: it.taxAmount,
              lineTotal: it.lineTotal,
              notes: it.notes,
            })),
          },
          payments: {
            create: validatedPaymentsData,
          },
        },
        include: {
          items: true,
          payments: true,
          customer: true,
          cashier: {
            select: { id: true, name: true, email: true },
          },
          business: {
            select: { id: true, name: true, currency: true },
          },
        },
      })

      return createdSale
    })

    // Non-blocking alert evaluation for items whose stock changed
    Promise.all(
      itemsData.map((item) =>
        alertEvaluationService.evaluateProductStock(businessId, item.productId)
      )
    ).catch((err) => {
      console.error('[SaleService] Error evaluating alerts after sale:', err)
    })

    return createdSale
  }

  /**
   * Lists sales with search, date range, payment method and status filters.
   */
  async listSales(businessId: string, query: SaleQueryInput) {
    const { page, limit, search, status, paymentMethod, paymentStatus, startDate, endDate } = query
    const skip = (page - 1) * limit

    const where: Prisma.SaleWhereInput = { businessId }

    if (status) {
      where.status = status
    }

    if (paymentStatus) {
      where.paymentStatus = paymentStatus
    }

    if (paymentMethod) {
      where.payments = {
        some: { method: paymentMethod },
      }
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        where.createdAt.gte = new Date(startDate)
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate)
      }
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { receiptNumber: { contains: term, mode: 'insensitive' } },
        { customerName: { contains: term, mode: 'insensitive' } },
        { customerPhone: { contains: term, mode: 'insensitive' } },
      ]
    }

    const [total, sales] = await Promise.all([
      prisma.sale.count({ where }),
      prisma.sale.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: true,
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          returns: {
            select: { id: true, returnNumber: true, refundAmount: true, refundMethod: true, createdAt: true },
          },
          cashier: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
    ])

    return {
      sales,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Fetches single sale with full historical snapshots and payments.
   */
  async getSale(businessId: string, saleId: string) {
    const sale = await prisma.sale.findFirst({
      where: { id: saleId, businessId },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
            returnItems: true,
          },
        },
        payments: true,
        customer: true,
        returns: {
          include: {
            items: {
              include: {
                product: {
                  select: { id: true, name: true, sku: true, unit: true },
                },
              },
            },
            processedBy: {
              select: { id: true, name: true, email: true },
            },
          },
        },
        cashier: {
          select: { id: true, name: true, email: true },
        },
        business: {
          select: { id: true, name: true, currency: true },
        },
      },
    })

    if (!sale) {
      const existsElsewhere = await prisma.sale.findUnique({
        where: { id: saleId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Sale',
          resourceId: saleId,
          action: 'CROSS_TENANT_SALE_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Sale transaction not found or access denied', 404, 'NOT_FOUND')
    }

    return sale
  }

  /**
   * Cancels an uncompleted sale. Completed sales cannot be cancelled to preserve transaction integrity.
   */
  async cancelSale(
    businessId: string,
    saleId: string,
    userRole: Role,
    input: CancelSaleInput
  ) {
    if (userRole !== Role.OWNER && userRole !== Role.MANAGER) {
      throw new AppError(
        'Only business Owners or Managers can cancel sales.',
        403,
        'FORBIDDEN'
      )
    }

    const sale = await prisma.sale.findFirst({
      where: { id: saleId, businessId },
    })

    if (!sale) {
      const existsElsewhere = await prisma.sale.findUnique({
        where: { id: saleId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'Sale',
          resourceId: saleId,
          action: 'CROSS_TENANT_SALE_CANCEL_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Sale transaction not found or access denied', 404, 'NOT_FOUND')
    }

    if (sale.status === SaleStatus.COMPLETED) {
      throw new AppError(
        'Completed sales cannot be cancelled directly to preserve transaction and audit integrity. Returns and item exchanges will be available in the upcoming Returns module.',
        400,
        'COMPLETED_SALE_CANNOT_BE_CANCELLED'
      )
    }

    if (sale.status === SaleStatus.CANCELLED) {
      throw new AppError('Sale is already cancelled.', 400, 'ALREADY_CANCELLED')
    }

    return prisma.sale.update({
      where: { id: saleId },
      data: {
        status: SaleStatus.CANCELLED,
        notes: input.reason
          ? `${sale.notes ? sale.notes + ' | ' : ''}Cancelled: ${input.reason}`
          : sale.notes,
      },
      include: {
        items: true,
        payments: true,
        cashier: {
          select: { id: true, name: true, email: true },
        },
      },
    })
  }

  /**
   * Dashboard Summary: Today's sales figures, transactions, average transaction value,
   * payment breakdown, and recent sales.
   */
  async getDashboardSummary(businessId: string) {
    // Start of today in UTC / local store day
    const startOfToday = new Date()
    startOfToday.setHours(0, 0, 0, 0)

    const [todaySales, totalCompletedCount, recentSales] = await Promise.all([
      prisma.sale.findMany({
        where: {
          businessId,
          status: SaleStatus.COMPLETED,
          createdAt: { gte: startOfToday },
        },
        include: {
          payments: true,
        },
      }),
      prisma.sale.count({
        where: {
          businessId,
          status: SaleStatus.COMPLETED,
        },
      }),
      prisma.sale.findMany({
        where: {
          businessId,
          status: SaleStatus.COMPLETED,
        },
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: {
          payments: true,
          cashier: { select: { id: true, name: true } },
          items: true,
        },
      }),
    ])

    // Calculate Today's Totals
    let todaySalesValue = new Prisma.Decimal(0)
    const paymentMethodBreakdown: Record<string, { count: number; total: Prisma.Decimal }> = {
      CASH: { count: 0, total: new Prisma.Decimal(0) },
      MOBILE_MONEY: { count: 0, total: new Prisma.Decimal(0) },
      CARD: { count: 0, total: new Prisma.Decimal(0) },
      BANK_TRANSFER: { count: 0, total: new Prisma.Decimal(0) },
      OTHER: { count: 0, total: new Prisma.Decimal(0) },
    }

    for (const sale of todaySales) {
      todaySalesValue = todaySalesValue.plus(sale.total)
      for (const p of sale.payments) {
        if (!paymentMethodBreakdown[p.method]) {
          paymentMethodBreakdown[p.method] = { count: 0, total: new Prisma.Decimal(0) }
        }
        paymentMethodBreakdown[p.method].count += 1
        paymentMethodBreakdown[p.method].total = paymentMethodBreakdown[p.method].total.plus(p.amount)
      }
    }

    const todayCount = todaySales.length
    const avgTransactionValue =
      todayCount > 0 ? todaySalesValue.div(todayCount).toNumber() : 0

    return {
      todaySalesValue: todaySalesValue.toNumber(),
      todayTransactionsCount: todayCount,
      totalCompletedTransactions: totalCompletedCount,
      averageTransactionValue: avgTransactionValue,
      paymentMethodBreakdown: Object.entries(paymentMethodBreakdown).map(
        ([method, stats]) => ({
          method,
          count: stats.count,
          total: stats.total.toNumber(),
        })
      ),
      recentSales: recentSales.map((s) => ({
        id: s.id,
        receiptNumber: s.receiptNumber,
        total: s.total.toNumber(),
        currency: s.currency,
        createdAt: s.createdAt,
        cashierName: s.cashier.name,
        paymentMethod: s.payments[0]?.method || 'CASH',
        itemsCount: s.items?.length || 0,
      })),
    }
  }
}

export const saleService = new SaleService()
