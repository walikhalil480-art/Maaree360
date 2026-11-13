import { prisma } from '../db/prisma.js'
import {
  CreatePurchaseOrderInput,
  UpdatePurchaseOrderInput,
  ReceiveDeliveryInput,
  CancelPurchaseOrderInput,
  PurchaseOrderQueryInput,
} from '../schemas/purchaseOrder.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import {
  PurchaseOrder,
  PurchaseOrderStatus,
  StockMovementType,
  Prisma,
} from '@prisma/client'
import { alertEvaluationService } from './alertEvaluation.service.js'
import { recordCrossTenantSecurityViolation } from '../utils/securityAudit.js'

export class PurchaseOrderService {
  /**
   * Generates a sequential human-readable order number scoped to the business (e.g. PO-0001)
   */
  private async generateOrderNumber(businessId: string): Promise<string> {
    const count = await prisma.purchaseOrder.count({
      where: { businessId },
    })
    const nextNumber = count + 1
    const padded = String(nextNumber).padStart(4, '0')
    const orderNumber = `PO-${padded}`

    // Guard against rare collision if an order was deleted
    const existing = await prisma.purchaseOrder.findUnique({
      where: {
        businessId_orderNumber: {
          businessId,
          orderNumber,
        },
      },
    })

    if (existing) {
      return `PO-${Date.now().toString().slice(-6)}`
    }

    return orderNumber
  }

  /**
   * Lists purchase orders with pagination, status filters, and search
   */
  async listPurchaseOrders(businessId: string, query: PurchaseOrderQueryInput) {
    const { page, limit, status, supplierId, search, startDate, endDate } = query

    const where: Prisma.PurchaseOrderWhereInput = {
      businessId,
    }

    if (status && status !== 'ALL') {
      where.status = status as PurchaseOrderStatus
    }

    if (supplierId) {
      where.supplierId = supplierId
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { orderNumber: { contains: term, mode: 'insensitive' } },
        { supplier: { name: { contains: term, mode: 'insensitive' } } },
        { notes: { contains: term, mode: 'insensitive' } },
      ]
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

    const [total, purchaseOrders] = await Promise.all([
      prisma.purchaseOrder.count({ where }),
      prisma.purchaseOrder.findMany({
        where,
        include: {
          supplier: {
            select: { id: true, name: true, contactPerson: true, phone: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
          _count: {
            select: { items: true, receipts: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      purchaseOrders,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Retrieves single purchase order details, lines, and receipt history
   */
  async getPurchaseOrder(businessId: string, purchaseOrderId: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, businessId },
      include: {
        supplier: true,
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true, unit: true, costPrice: true },
            },
          },
        },
        receipts: {
          orderBy: { receivedAt: 'desc' },
          include: {
            receivedBy: {
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
        },
      },
    })

    if (!order) {
      const existsElsewhere = await prisma.purchaseOrder.findUnique({
        where: { id: purchaseOrderId },
        select: { id: true, businessId: true },
      })
      if (existsElsewhere && existsElsewhere.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          sourceBusinessId: businessId,
          targetBusinessId: existsElsewhere.businessId,
          resourceType: 'PurchaseOrder',
          resourceId: purchaseOrderId,
          action: 'CROSS_TENANT_PO_READ_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Purchase order not found or access denied', 404, 'NOT_FOUND')
    }

    return order
  }

  /**
   * Creates a new purchase order in DRAFT status
   */
  async createPurchaseOrder(
    businessId: string,
    userId: string,
    input: CreatePurchaseOrderInput
  ): Promise<PurchaseOrder> {
    // 1. Verify supplier belongs to this business
    const supplier = await prisma.supplier.findFirst({
      where: { id: input.supplierId, businessId },
    })

    if (!supplier) {
      const foreignSupplier = await prisma.supplier.findUnique({
        where: { id: input.supplierId },
        select: { id: true, businessId: true },
      })
      if (foreignSupplier && foreignSupplier.businessId !== businessId) {
        recordCrossTenantSecurityViolation({
          userId,
          sourceBusinessId: businessId,
          targetBusinessId: foreignSupplier.businessId,
          resourceType: 'Supplier',
          resourceId: input.supplierId,
          action: 'CROSS_TENANT_PO_SUPPLIER_LINK_BLOCKED',
        }).catch(() => {})
      }
      throw new AppError('Supplier not found or access denied', 404, 'NOT_FOUND')
    }

    if (!supplier.isActive) {
      throw new AppError('Cannot create purchase order for an archived supplier', 400, 'SUPPLIER_ARCHIVED')
    }

    // 2. Fetch business currency
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { currency: true },
    })
    const currency = business?.currency || 'KES'

    // 3. Verify all products belong to this business
    const productIds = input.items.map((i) => i.productId)
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
            userId,
            sourceBusinessId: businessId,
            targetBusinessId: fp.businessId,
            resourceType: 'Product',
            resourceId: fp.id,
            action: 'CROSS_TENANT_PO_PRODUCT_LINK_BLOCKED',
          }).catch(() => {})
        }
      }
      throw new AppError('One or more selected products are invalid or do not belong to this business', 400, 'INVALID_PRODUCT')
    }

    // 4. Calculate line subtotals and overall totals server-side
    let calculatedSubtotal = new Prisma.Decimal(0)
    const itemsData = input.items.map((item) => {
      const qty = new Prisma.Decimal(item.quantityOrdered)
      const cost = new Prisma.Decimal(item.unitCost)
      const lineSubtotal = qty.mul(cost)
      calculatedSubtotal = calculatedSubtotal.plus(lineSubtotal)

      return {
        productId: item.productId,
        quantityOrdered: qty,
        unitCost: cost,
        quantityReceived: new Prisma.Decimal(0),
        notes: item.notes?.trim() || null,
        subtotal: lineSubtotal,
      }
    })

    const discount = new Prisma.Decimal(input.discount || 0)
    const taxAmount = new Prisma.Decimal(input.taxAmount || 0)
    const calculatedTotal = calculatedSubtotal.minus(discount).plus(taxAmount)

    if (calculatedTotal.lessThan(0)) {
      throw new AppError('Order total cannot be negative after discount', 400, 'INVALID_TOTAL')
    }

    // 5. Generate human-readable order number
    const orderNumber = await this.generateOrderNumber(businessId)

    // 6. Create PO & items in transaction
    return prisma.purchaseOrder.create({
      data: {
        businessId,
        supplierId: input.supplierId,
        orderNumber,
        status: PurchaseOrderStatus.DRAFT,
        orderDate: input.orderDate ? new Date(input.orderDate) : null,
        expectedDeliveryDate: input.expectedDeliveryDate ? new Date(input.expectedDeliveryDate) : null,
        currency,
        subtotal: calculatedSubtotal,
        discount,
        taxAmount,
        total: calculatedTotal,
        notes: input.notes?.trim() || null,
        createdById: userId,
        items: {
          create: itemsData,
        },
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    })
  }

  /**
   * Updates an existing DRAFT purchase order
   */
  async updatePurchaseOrder(
    businessId: string,
    purchaseOrderId: string,
    input: UpdatePurchaseOrderInput
  ) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, businessId },
      include: { items: true },
    })

    if (!order) {
      throw new AppError('Purchase order not found or access denied', 404, 'NOT_FOUND')
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new AppError(
        `Cannot edit purchase order in ${order.status} status. Only DRAFT orders can be modified.`,
        400,
        'ORDER_NOT_EDITABLE'
      )
    }

    // If supplier is being updated, verify supplier
    if (input.supplierId && input.supplierId !== order.supplierId) {
      const supplier = await prisma.supplier.findFirst({
        where: { id: input.supplierId, businessId },
      })
      if (!supplier || !supplier.isActive) {
        throw new AppError('Target supplier is invalid or archived', 400, 'INVALID_SUPPLIER')
      }
    }

    return prisma.$transaction(async (tx) => {
      // If items are supplied, replace line items and recalculate
      let calculatedSubtotal = order.subtotal
      if (input.items && input.items.length > 0) {
        const productIds = input.items.map((i) => i.productId)
        const products = await tx.product.findMany({
          where: { id: { in: productIds }, businessId },
        })
        if (products.length !== productIds.length) {
          throw new AppError('One or more selected products are invalid', 400, 'INVALID_PRODUCT')
        }

        // Delete existing items
        await tx.purchaseOrderItem.deleteMany({
          where: { purchaseOrderId },
        })

        calculatedSubtotal = new Prisma.Decimal(0)
        const newItems = input.items.map((item) => {
          const qty = new Prisma.Decimal(item.quantityOrdered)
          const cost = new Prisma.Decimal(item.unitCost)
          const lineSubtotal = qty.mul(cost)
          calculatedSubtotal = calculatedSubtotal.plus(lineSubtotal)
          return {
            purchaseOrderId,
            productId: item.productId,
            quantityOrdered: qty,
            unitCost: cost,
            quantityReceived: new Prisma.Decimal(0),
            notes: item.notes?.trim() || null,
            subtotal: lineSubtotal,
          }
        })

        await tx.purchaseOrderItem.createMany({
          data: newItems,
        })
      }

      const discount = input.discount !== undefined ? new Prisma.Decimal(input.discount) : order.discount
      const taxAmount = input.taxAmount !== undefined ? new Prisma.Decimal(input.taxAmount) : order.taxAmount
      const calculatedTotal = calculatedSubtotal.minus(discount).plus(taxAmount)

      return tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          supplierId: input.supplierId,
          expectedDeliveryDate:
            input.expectedDeliveryDate !== undefined
              ? input.expectedDeliveryDate
                ? new Date(input.expectedDeliveryDate)
                : null
              : undefined,
          subtotal: calculatedSubtotal,
          discount,
          taxAmount,
          total: calculatedTotal,
          notes: input.notes !== undefined ? input.notes?.trim() || null : undefined,
        },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
        },
      })
    })
  }

  /**
   * Places an order (transitions from DRAFT to ORDERED). Does NOT increase stock!
   */
  async placeOrder(businessId: string, purchaseOrderId: string) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, businessId },
    })

    if (!order) {
      throw new AppError('Purchase order not found or access denied', 404, 'NOT_FOUND')
    }

    if (order.status !== PurchaseOrderStatus.DRAFT) {
      throw new AppError(
        `Cannot place order. Current status is ${order.status}. Only DRAFT orders can be placed.`,
        400,
        'INVALID_STATUS_TRANSITION'
      )
    }

    return prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: PurchaseOrderStatus.ORDERED,
        orderDate: order.orderDate || new Date(),
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    })
  }

  /**
   * Receives goods delivery against a placed purchase order (full or partial delivery).
   * Atomically updates received quantities, order status, StockLevel balances, and StockMovement ledger.
   */
  async receiveDelivery(
    businessId: string,
    userId: string,
    purchaseOrderId: string,
    input: ReceiveDeliveryInput
  ) {
    // 1. Idempotency Check
    if (input.idempotencyKey) {
      const existingReceipt = await prisma.purchaseOrderReceipt.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId,
            idempotencyKey: input.idempotencyKey,
          },
        },
        include: {
          items: {
            include: { product: true },
          },
          purchaseOrder: true,
        },
      })

      if (existingReceipt) {
        return {
          receipt: existingReceipt,
          purchaseOrder: existingReceipt.purchaseOrder,
        }
      }
    }

    // 2. Fetch Purchase Order with items
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, businessId },
      include: {
        items: {
          include: { product: true },
        },
        supplier: true,
      },
    })

    if (!order) {
      throw new AppError('Purchase order not found or access denied', 404, 'NOT_FOUND')
    }

    if (
      order.status !== PurchaseOrderStatus.ORDERED &&
      order.status !== PurchaseOrderStatus.PARTIALLY_RECEIVED
    ) {
      throw new AppError(
        `Cannot receive goods for purchase order with status ${order.status}. Orders must be ORDERED or PARTIALLY_RECEIVED.`,
        400,
        'INVALID_ORDER_STATUS_FOR_RECEIPT'
      )
    }

    // 3. Validate Delivery Quantities and Prevent Over-Receipt
    const itemMap = new Map(order.items.map((item) => [item.id, item]))

    for (const deliveredItem of input.items) {
      const poItem = itemMap.get(deliveredItem.purchaseOrderItemId)
      if (!poItem) {
        throw new AppError(
          `Purchase order line item ${deliveredItem.purchaseOrderItemId} does not belong to this order.`,
          400,
          'INVALID_PO_ITEM'
        )
      }

      const receivedQty = new Prisma.Decimal(deliveredItem.quantityReceived)
      if (receivedQty.lessThanOrEqualTo(0)) {
        throw new AppError(
          `Received quantity must be greater than zero for product ${poItem.product.name}.`,
          400,
          'INVALID_QUANTITY'
        )
      }

      const outstandingQty = poItem.quantityOrdered.minus(poItem.quantityReceived)
      if (receivedQty.greaterThan(outstandingQty)) {
        throw new AppError(
          `Over-receipt not allowed. Delivered quantity (${receivedQty}) exceeds outstanding quantity (${outstandingQty}) for product ${poItem.product.name}.`,
          400,
          'OVER_RECEIPT_NOT_ALLOWED'
        )
      }
    }

    // 4. Execute atomic database transaction
    const deliveryResult = await prisma.$transaction(async (tx) => {
      // Generate receipt number
      const receiptCount = await tx.purchaseOrderReceipt.count({
        where: { purchaseOrderId },
      })
      const receiptNumber = `RCV-${order.orderNumber}-${receiptCount + 1}`

      // Create PurchaseOrderReceipt
      const receipt = await tx.purchaseOrderReceipt.create({
        data: {
          businessId,
          purchaseOrderId,
          receiptNumber,
          receivedById: userId,
          receivedAt: new Date(),
          notes: input.notes?.trim() || null,
          idempotencyKey: input.idempotencyKey?.trim() || null,
        },
      })

      // Update each item and increment stock
      for (const deliveredItem of input.items) {
        const poItem = itemMap.get(deliveredItem.purchaseOrderItemId)!
        const qtyReceived = new Prisma.Decimal(deliveredItem.quantityReceived)

        // 4a. Update PO Item quantityReceived
        const updatedPoItem = await tx.purchaseOrderItem.update({
          where: { id: poItem.id },
          data: {
            quantityReceived: poItem.quantityReceived.plus(qtyReceived),
          },
        })
        // Update local item map for final status check
        poItem.quantityReceived = updatedPoItem.quantityReceived

        // 4b. Find or create StockLevel
        let stockLevel = await tx.stockLevel.findUnique({
          where: { productId: poItem.productId },
        })

        if (!stockLevel) {
          stockLevel = await tx.stockLevel.create({
            data: {
              businessId,
              productId: poItem.productId,
              quantity: new Prisma.Decimal(0),
              reservedQuantity: new Prisma.Decimal(0),
            },
          })
        }

        const prevQty = stockLevel.quantity
        const newQty = prevQty.plus(qtyReceived)

        // 4c. Update StockLevel balance
        await tx.stockLevel.update({
          where: { id: stockLevel.id },
          data: {
            quantity: newQty,
          },
        })

        // 4d. Create StockMovement entry in the immutable audit ledger
        const stockMovement = await tx.stockMovement.create({
          data: {
            businessId,
            productId: poItem.productId,
            type: StockMovementType.STOCK_IN,
            quantityChange: qtyReceived,
            previousQuantity: prevQty,
            resultingQuantity: newQty,
            reason: `Goods receipt for ${order.orderNumber} from ${order.supplier.name}`,
            reference: input.receiptReference?.trim() || `${order.orderNumber} (${receiptNumber})`,
            userId,
          },
        })

        // 4e. Create PurchaseOrderReceiptItem
        await tx.purchaseOrderReceiptItem.create({
          data: {
            receiptId: receipt.id,
            purchaseOrderItemId: poItem.id,
            productId: poItem.productId,
            quantityReceived: qtyReceived,
            stockMovementId: stockMovement.id,
          },
        })
      }

      // 5. Check if all items in order are fully received
      const allFullyReceived = order.items.every((item) =>
        item.quantityReceived.greaterThanOrEqualTo(item.quantityOrdered)
      )

      const newStatus = allFullyReceived
        ? PurchaseOrderStatus.RECEIVED
        : PurchaseOrderStatus.PARTIALLY_RECEIVED

      const updatedOrder = await tx.purchaseOrder.update({
        where: { id: purchaseOrderId },
        data: {
          status: newStatus,
          receivedAt: allFullyReceived ? new Date() : null,
        },
        include: {
          supplier: true,
          items: {
            include: { product: true },
          },
        },
      })

      const completeReceipt = await tx.purchaseOrderReceipt.findUnique({
        where: { id: receipt.id },
        include: {
          receivedBy: {
            select: { id: true, name: true, email: true },
          },
          items: {
            include: { product: true },
          },
        },
      })

      return {
        purchaseOrder: updatedOrder,
        receipt: completeReceipt!,
      }
    })

    // Non-blocking alert evaluation for received goods
    Promise.all(
      input.items.map((deliveredItem) => {
        const poItem = itemMap.get(deliveredItem.purchaseOrderItemId)
        return poItem
          ? alertEvaluationService.evaluateProductStock(businessId, poItem.productId)
          : Promise.resolve()
      })
    ).catch((err) => {
      console.error('[PurchaseOrderService] Error evaluating alerts after delivery:', err)
    })

    return deliveryResult
  }

  /**
   * Cancels a purchase order.
   * If partially received, already received goods are preserved and remaining outstanding items are closed.
   */
  async cancelOrder(
    businessId: string,
    purchaseOrderId: string,
    input: CancelPurchaseOrderInput
  ) {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: purchaseOrderId, businessId },
    })

    if (!order) {
      throw new AppError('Purchase order not found or access denied', 404, 'NOT_FOUND')
    }

    if (order.status === PurchaseOrderStatus.RECEIVED) {
      throw new AppError('Cannot cancel an already completed and fully received order.', 400, 'CANNOT_CANCEL_COMPLETED_ORDER')
    }

    if (order.status === PurchaseOrderStatus.CANCELLED) {
      throw new AppError('Purchase order is already cancelled.', 400, 'ALREADY_CANCELLED')
    }

    const cancellationNote = input.notes?.trim()
      ? `Cancelled: ${input.notes.trim()}`
      : 'Order cancelled by user'
    const combinedNotes = order.notes ? `${order.notes} | ${cancellationNote}` : cancellationNote

    return prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: {
        status: PurchaseOrderStatus.CANCELLED,
        notes: combinedNotes,
      },
      include: {
        supplier: true,
        items: {
          include: { product: true },
        },
      },
    })
  }

  /**
   * Retrieves dashboard purchasing summary figures
   */
  async getDashboardSummary(businessId: string) {
    const [draftCount, orderedCount, partiallyReceivedCount, receivedCount, cancelledCount, recentDeliveries] =
      await Promise.all([
        prisma.purchaseOrder.count({
          where: { businessId, status: PurchaseOrderStatus.DRAFT },
        }),
        prisma.purchaseOrder.count({
          where: { businessId, status: PurchaseOrderStatus.ORDERED },
        }),
        prisma.purchaseOrder.count({
          where: { businessId, status: PurchaseOrderStatus.PARTIALLY_RECEIVED },
        }),
        prisma.purchaseOrder.count({
          where: { businessId, status: PurchaseOrderStatus.RECEIVED },
        }),
        prisma.purchaseOrder.count({
          where: { businessId, status: PurchaseOrderStatus.CANCELLED },
        }),
        prisma.purchaseOrderReceipt.findMany({
          where: { businessId },
          take: 5,
          orderBy: { receivedAt: 'desc' },
          include: {
            purchaseOrder: {
              select: { orderNumber: true, supplier: { select: { name: true } } },
            },
            receivedBy: {
              select: { name: true },
            },
            items: {
              include: {
                product: { select: { name: true, unit: true } },
              },
            },
          },
        }),
      ])

    return {
      draftCount,
      orderedCount,
      partiallyReceivedCount,
      receivedCount,
      cancelledCount,
      totalActiveOrders: orderedCount + partiallyReceivedCount,
      recentDeliveries,
    }
  }
}

export const purchaseOrderService = new PurchaseOrderService()
