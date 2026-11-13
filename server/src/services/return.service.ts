import { prisma } from '../db/prisma.js'
import {
  CreateReturnInput,
  ReturnQueryInput,
} from '../schemas/return.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  Prisma,
  Role,
  SaleStatus,
  PaymentStatus,
  ReturnRestockAction,
  StockMovementType,
} from '@prisma/client'
import { alertEvaluationService } from './alertEvaluation.service.js'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export class ReturnService {
  /**
   * Generates a sequential return number unique to the business (e.g., RET-0001).
   */
  async generateReturnNumber(businessId: string): Promise<string> {
    const count = await prisma.saleReturn.count({
      where: { businessId },
    })

    let nextNumber = count + 1
    let candidate = `RET-${String(nextNumber).padStart(4, '0')}`

    while (
      await prisma.saleReturn.findUnique({
        where: { businessId_returnNumber: { businessId, returnNumber: candidate } },
      })
    ) {
      nextNumber += 1
      candidate = `RET-${String(nextNumber).padStart(4, '0')}`
    }

    return candidate
  }

  /**
   * Processes a sales return / refund atomically.
   * Enforces permissions, validates against original sale, prevents over-returns,
   * updates line item returned quantities, adjusts payment status,
   * updates inventory ledger for restocked items, and records the return.
   */
  async createReturn(
    businessId: string,
    processedById: string,
    userRole: Role,
    input: CreateReturnInput
  ) {
    // 1. Role permission: Owner, Manager, Cashier allowed. Stock clerk forbidden.
    if (userRole === Role.STOCK_CLERK) {
      throw new AppError(
        'Stock clerks are not authorized to process sales returns or refunds.',
        403,
        'FORBIDDEN'
      )
    }

    // 2. Idempotency Check
    if (input.idempotencyKey) {
      const existingReturn = await prisma.saleReturn.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: {
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              total: true,
              createdAt: true,
            },
          },
          customer: true,
          processedBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
            },
          },
        },
      })

      if (existingReturn) {
        return existingReturn
      }
    }

    // 3. Fetch original sale with items
    const sale = await prisma.sale.findFirst({
      where: { id: input.saleId, businessId },
      include: {
        items: true,
        returns: {
          include: {
            items: true,
          },
        },
      },
    })

    if (!sale) {
      const foreignSale = await prisma.sale.findUnique({
        where: { id: input.saleId },
        select: { id: true, businessId: true },
      })
      if (foreignSale && foreignSale.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          userId: processedById,
          sourceBusinessId: businessId,
          targetBusinessId: foreignSale.businessId,
          resourceType: 'Sale',
          resourceId: input.saleId,
          action: 'CROSS_TENANT_RETURN_SALE_LINK_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Sale record not found or does not belong to this business.', 404, 'SALE_NOT_FOUND')
    }

    if (sale.status !== SaleStatus.COMPLETED) {
      throw new AppError(
        `Cannot return items from a sale with status '${sale.status}'. Only completed sales can be refunded.`,
        400,
        'INVALID_SALE_STATUS'
      )
    }

    if (sale.paymentStatus === PaymentStatus.REFUNDED) {
      throw new AppError(
        `Sale '${sale.receiptNumber}' has already been fully refunded. No additional items can be returned.`,
        400,
        'SALE_ALREADY_REFUNDED'
      )
    }

    // Map sale items by id
    const saleItemMap = new Map(sale.items.map((it) => [it.id, it]))

    // 4. Validate each return item
    let calculatedRefundTotal = new Prisma.Decimal(0)
    const itemsToProcess: Array<{
      saleItem: typeof sale.items[0]
      qty: Prisma.Decimal
      unitRefundPrice: Prisma.Decimal
      refundSubtotal: Prisma.Decimal
      restockAction: ReturnRestockAction
      notes: string | null
    }> = []

    for (const returnItem of input.items) {
      const saleItem = saleItemMap.get(returnItem.saleItemId)
      if (!saleItem) {
        throw new AppError(
          `Item ID '${returnItem.saleItemId}' does not belong to sale '${sale.receiptNumber}'.`,
          400,
          'INVALID_RETURN_ITEM'
        )
      }

      const returnQty = new Prisma.Decimal(returnItem.quantity)
      if (returnQty.lessThanOrEqualTo(0)) {
        throw new AppError(
          `Return quantity for '${saleItem.productName}' must be greater than zero.`,
          400,
          'INVALID_QUANTITY'
        )
      }

      const alreadyReturned = saleItem.quantityReturned
      const remainingReturnable = saleItem.quantity.minus(alreadyReturned)

      if (returnQty.greaterThan(remainingReturnable)) {
        throw new AppError(
          `Cannot return ${returnQty} of '${saleItem.productName}'. Maximum returnable quantity is ${remainingReturnable} (${alreadyReturned} already returned from original ${saleItem.quantity}).`,
          400,
          'OVER_RETURN_EXCEEDED'
        )
      }

      // Calculate effective unit refund price based on net line total paid
      // effectivePrice = lineTotal / quantity
      const effectiveUnitPrice = saleItem.lineTotal.dividedBy(saleItem.quantity)
      const lineRefund = effectiveUnitPrice.mul(returnQty).toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP)

      calculatedRefundTotal = calculatedRefundTotal.plus(lineRefund)

      itemsToProcess.push({
        saleItem,
        qty: returnQty,
        unitRefundPrice: effectiveUnitPrice.toDecimalPlaces(2, Prisma.Decimal.ROUND_HALF_UP),
        refundSubtotal: lineRefund,
        restockAction: returnItem.restockAction || ReturnRestockAction.RESTOCK,
        notes: returnItem.notes?.trim() || null,
      })
    }

    // 5. Execute atomic transaction
    const returnResult = await prisma.$transaction(async (tx) => {
      const returnNumber = await this.generateReturnNumber(businessId)

      // 5a. Create the SaleReturn header
      const createdReturn = await tx.saleReturn.create({
        data: {
          businessId,
          saleId: sale.id,
          customerId: sale.customerId || null,
          returnNumber,
          refundMethod: input.refundMethod,
          refundAmount: calculatedRefundTotal,
          refundReference: input.refundReference?.trim() || null,
          reason: input.reason?.trim() || null,
          notes: input.notes?.trim() || null,
          idempotencyKey: input.idempotencyKey?.trim() || null,
          processedById,
        },
      })

      // 5b. Process each item: update saleItem, restock if needed, create returnItem
      for (const item of itemsToProcess) {
        let stockMovementId: string | null = null

        // If RESTOCK, return quantity back to inventory and log ledger
        if (item.restockAction === ReturnRestockAction.RESTOCK) {
          let stockLevel = await tx.stockLevel.findUnique({
            where: { productId: item.saleItem.productId },
          })

          if (!stockLevel) {
            stockLevel = await tx.stockLevel.create({
              data: {
                businessId,
                productId: item.saleItem.productId,
                quantity: new Prisma.Decimal(0),
                reservedQuantity: new Prisma.Decimal(0),
              },
            })
          }

          const previousQuantity = stockLevel.quantity
          const resultingQuantity = previousQuantity.plus(item.qty)

          // Update stock balance
          await tx.stockLevel.update({
            where: { id: stockLevel.id },
            data: {
              quantity: resultingQuantity,
            },
          })

          // Append StockMovement ledger
          const movement = await tx.stockMovement.create({
            data: {
              businessId,
              productId: item.saleItem.productId,
              type: StockMovementType.RETURN,
              quantityChange: item.qty,
              previousQuantity,
              resultingQuantity,
              reason: `Sale Return ${returnNumber} for Sale ${sale.receiptNumber}`,
              reference: returnNumber,
              userId: processedById,
            },
          })

          stockMovementId = movement.id
        }

        // Update SaleItem.quantityReturned
        await tx.saleItem.update({
          where: { id: item.saleItem.id },
          data: {
            quantityReturned: item.saleItem.quantityReturned.plus(item.qty),
          },
        })

        // Create SaleReturnItem
        await tx.saleReturnItem.create({
          data: {
            saleReturnId: createdReturn.id,
            saleItemId: item.saleItem.id,
            productId: item.saleItem.productId,
            quantityReturned: item.qty,
            unitRefundPrice: item.unitRefundPrice,
            refundSubtotal: item.refundSubtotal,
            restockAction: item.restockAction,
            notes: item.notes,
            stockMovementId,
          },
        })
      }

      // 5c. Check if original sale is now fully returned or partially returned
      // Fetch latest quantities of all sale items
      const updatedSaleItems = await tx.saleItem.findMany({
        where: { saleId: sale.id },
      })

      const isAllReturned = updatedSaleItems.every((it) =>
        it.quantityReturned.greaterThanOrEqualTo(it.quantity)
      )

      const newPaymentStatus = isAllReturned
        ? PaymentStatus.REFUNDED
        : PaymentStatus.PARTIALLY_REFUNDED

      await tx.sale.update({
        where: { id: sale.id },
        data: {
          paymentStatus: newPaymentStatus,
        },
      })

      // Fetch complete return record for response
      const result = await tx.saleReturn.findUnique({
        where: { id: createdReturn.id },
        include: {
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              total: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
          customer: true,
          processedBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
            },
          },
        },
      })

      return result!
    })

    // Non-blocking alert evaluation for restocked return items
    Promise.all(
      itemsToProcess
        .filter((it) => it.restockAction === ReturnRestockAction.RESTOCK)
        .map((it) => alertEvaluationService.evaluateProductStock(businessId, it.saleItem.productId))
    ).catch((err) => {
      console.error('[ReturnService] Error evaluating alerts after return:', err)
    })

    return returnResult!
  }

  /**
   * List sales returns with filtering and pagination.
   */
  async listReturns(businessId: string, query: ReturnQueryInput) {
    const { page, limit, search, saleId, customerId, refundMethod, startDate, endDate } = query
    const skip = (page - 1) * limit

    const where: Prisma.SaleReturnWhereInput = { businessId }

    if (saleId) {
      where.saleId = saleId
    }

    if (customerId) {
      where.customerId = customerId
    }

    if (refundMethod) {
      where.refundMethod = refundMethod
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
        { returnNumber: { contains: term, mode: 'insensitive' } },
        { refundReference: { contains: term, mode: 'insensitive' } },
        { reason: { contains: term, mode: 'insensitive' } },
        { sale: { receiptNumber: { contains: term, mode: 'insensitive' } } },
        { customer: { name: { contains: term, mode: 'insensitive' } } },
        { customer: { phone: { contains: term, mode: 'insensitive' } } },
      ]
    }

    const [total, returns] = await Promise.all([
      prisma.saleReturn.count({ where }),
      prisma.saleReturn.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          sale: {
            select: {
              id: true,
              receiptNumber: true,
              total: true,
              paymentStatus: true,
              createdAt: true,
            },
          },
          customer: {
            select: { id: true, name: true, phone: true, email: true },
          },
          processedBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true, sku: true, unit: true },
              },
            },
          },
        },
      }),
    ])

    return {
      returns,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Get return details by ID.
   */
  async getReturn(businessId: string, returnId: string) {
    const returnRecord = await prisma.saleReturn.findFirst({
      where: { id: returnId, businessId },
      include: {
        sale: {
          include: {
            cashier: {
              select: { id: true, name: true, email: true },
            },
            payments: true,
            items: true,
          },
        },
        customer: true,
        processedBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true },
            },
            saleItem: true,
          },
        },
        business: {
          select: { id: true, name: true, currency: true },
        },
      },
    })

    if (!returnRecord) {
      const existsElsewhere = await prisma.saleReturn.findUnique({
        where: { id: returnId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'SaleReturn',
          resourceId: returnId,
          action: 'CROSS_TENANT_RETURN_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Sale return record not found or access denied', 404, 'NOT_FOUND')
    }

    return returnRecord
  }
}

export const returnService = new ReturnService()
