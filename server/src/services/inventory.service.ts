import { prisma } from '../db/prisma.js'
import {
  RecordOpeningStockInput,
  ReceiveStockInput,
  IssueStockInput,
  AdjustStockInput,
  RecordLossDamageInput,
  RecordReturnInput,
  InventoryQueryInput,
  MovementsQueryInput,
} from '../schemas/inventory.schemas.js'
import { AppError } from '../middleware/errorHandler.js'
import { Prisma, StockMovementType, StockLevel, StockMovement } from '@prisma/client'
import { alertEvaluationService } from './alertEvaluation.service.js'

export interface StockOperationResult {
  stockLevel: StockLevel
  movement: StockMovement
}

export class InventoryService {
  /**
   * Internal helper to atomically update stock level and record an immutable ledger movement.
   */
  private async executeStockOperation(
    businessId: string,
    productId: string,
    userId: string,
    type: StockMovementType,
    quantityChange: Prisma.Decimal,
    reason?: string | null,
    reference?: string | null,
    idempotencyKey?: string | null
  ): Promise<StockOperationResult> {
    // Check idempotency first if a key was provided
    if (idempotencyKey) {
      const existingMovement = await prisma.stockMovement.findUnique({
        where: {
          businessId_idempotencyKey: {
            businessId,
            idempotencyKey,
          },
        },
        include: {
          product: {
            include: { stockLevel: true },
          },
        },
      })

      if (existingMovement && existingMovement.product.stockLevel) {
        return {
          stockLevel: existingMovement.product.stockLevel,
          movement: existingMovement,
        }
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify product belongs to this business
      const product = await tx.product.findFirst({
        where: { id: productId, businessId },
      })

      if (!product) {
        throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
      }

      // 2. Fetch or create StockLevel
      let stockLevel = await tx.stockLevel.findUnique({
        where: { productId },
      })

      if (!stockLevel) {
        stockLevel = await tx.stockLevel.create({
          data: {
            businessId,
            productId,
            quantity: new Prisma.Decimal(0),
            reservedQuantity: new Prisma.Decimal(0),
          },
        })
      }

      const previousQuantity = stockLevel.quantity
      const resultingQuantity = previousQuantity.plus(quantityChange)

      // 3. Enforce strict non-negative stock policy
      if (resultingQuantity.lessThan(0)) {
        throw new AppError(
          `Insufficient stock. Available: ${previousQuantity}, Required change: ${quantityChange.abs()}, Resulting balance cannot be negative.`,
          400,
          'INSUFFICIENT_STOCK'
        )
      }

      // 4. Update StockLevel balance
      const updatedStockLevel = await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: {
          quantity: resultingQuantity,
        },
      })

      // 5. Append immutable movement record to ledger
      const movement = await tx.stockMovement.create({
        data: {
          businessId,
          productId,
          type,
          quantityChange,
          previousQuantity,
          resultingQuantity,
          reason,
          reference,
          idempotencyKey,
          userId,
        },
      })

      return {
        stockLevel: updatedStockLevel,
        movement,
      }
    })

    alertEvaluationService.evaluateProductStock(businessId, productId).catch((err) => {
      console.error('[InventoryService] Error evaluating alert for product:', err)
    })

    return result
  }

  /**
   * Sets or updates initial opening stock count for a product.
   */
  async recordOpeningStock(
    businessId: string,
    productId: string,
    userId: string,
    input: RecordOpeningStockInput
  ): Promise<StockOperationResult> {
    const openingQty = new Prisma.Decimal(input.quantity)

    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, businessId },
      })
      if (!product) {
        throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
      }

      let stockLevel = await tx.stockLevel.findUnique({
        where: { productId },
      })

      if (!stockLevel) {
        stockLevel = await tx.stockLevel.create({
          data: {
            businessId,
            productId,
            quantity: new Prisma.Decimal(0),
            reservedQuantity: new Prisma.Decimal(0),
          },
        })
      }

      const previousQuantity = stockLevel.quantity
      const quantityChange = openingQty.minus(previousQuantity)

      const updatedStockLevel = await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantity: openingQty },
      })

      const movement = await tx.stockMovement.create({
        data: {
          businessId,
          productId,
          type: StockMovementType.OPENING_STOCK,
          quantityChange,
          previousQuantity,
          resultingQuantity: openingQty,
          reason: input.notes || 'Opening stock count',
          userId,
        },
      })

      return {
        stockLevel: updatedStockLevel,
        movement,
      }
    })

    alertEvaluationService.evaluateProductStock(businessId, productId).catch((err) => {
      console.error('[InventoryService] Error evaluating alert for product:', err)
    })

    return result
  }

  /**
   * Increases product inventory when stock is received (STOCK_IN).
   */
  async receiveStock(
    businessId: string,
    productId: string,
    userId: string,
    input: ReceiveStockInput
  ): Promise<StockOperationResult> {
    const qtyChange = new Prisma.Decimal(input.quantity)
    return this.executeStockOperation(
      businessId,
      productId,
      userId,
      StockMovementType.STOCK_IN,
      qtyChange,
      input.notes || 'Stock received',
      input.reference,
      input.idempotencyKey
    )
  }

  /**
   * Decreases product inventory when stock is issued (STOCK_OUT).
   */
  async issueStock(
    businessId: string,
    productId: string,
    userId: string,
    input: IssueStockInput
  ): Promise<StockOperationResult> {
    const qtyChange = new Prisma.Decimal(input.quantity).negated()
    return this.executeStockOperation(
      businessId,
      productId,
      userId,
      StockMovementType.STOCK_OUT,
      qtyChange,
      input.notes || 'Stock issued',
      input.reference,
      input.idempotencyKey
    )
  }

  /**
   * Manually corrects product inventory based on physical count or relative adjustment.
   */
  async adjustStock(
    businessId: string,
    productId: string,
    userId: string,
    input: AdjustStockInput
  ): Promise<StockOperationResult> {
    const result = await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id: productId, businessId },
      })
      if (!product) {
        throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
      }

      let stockLevel = await tx.stockLevel.findUnique({
        where: { productId },
      })

      if (!stockLevel) {
        stockLevel = await tx.stockLevel.create({
          data: {
            businessId,
            productId,
            quantity: new Prisma.Decimal(0),
            reservedQuantity: new Prisma.Decimal(0),
          },
        })
      }

      const previousQuantity = stockLevel.quantity
      let quantityChange: Prisma.Decimal
      let resultingQuantity: Prisma.Decimal

      if (input.mode === 'COUNT') {
        resultingQuantity = new Prisma.Decimal(input.countedQuantity!)
        quantityChange = resultingQuantity.minus(previousQuantity)
      } else {
        quantityChange = new Prisma.Decimal(input.quantityChange!)
        resultingQuantity = previousQuantity.plus(quantityChange)
      }

      if (resultingQuantity.lessThan(0)) {
        throw new AppError(
          `Adjustment would result in negative stock balance (${resultingQuantity}). Operation rejected.`,
          400,
          'INSUFFICIENT_STOCK'
        )
      }

      const type = quantityChange.greaterThanOrEqualTo(0)
        ? StockMovementType.ADJUSTMENT_IN
        : StockMovementType.ADJUSTMENT_OUT

      const updatedStockLevel = await tx.stockLevel.update({
        where: { id: stockLevel.id },
        data: { quantity: resultingQuantity },
      })

      const movement = await tx.stockMovement.create({
        data: {
          businessId,
          productId,
          type,
          quantityChange,
          previousQuantity,
          resultingQuantity,
          reason: input.reason,
          reference: input.reference,
          idempotencyKey: input.idempotencyKey,
          userId,
        },
      })

      return {
        stockLevel: updatedStockLevel,
        movement,
      }
    })

    alertEvaluationService.evaluateProductStock(businessId, productId).catch((err) => {
      console.error('[InventoryService] Error evaluating alert for product:', err)
    })

    return result
  }

  /**
   * Records damaged or lost stock (DAMAGE / LOSS).
   */
  async recordLossDamage(
    businessId: string,
    productId: string,
    userId: string,
    input: RecordLossDamageInput
  ): Promise<StockOperationResult> {
    const qtyChange = new Prisma.Decimal(input.quantity).negated()
    const movementType =
      input.type === 'DAMAGE' ? StockMovementType.DAMAGE : StockMovementType.LOSS

    return this.executeStockOperation(
      businessId,
      productId,
      userId,
      movementType,
      qtyChange,
      input.reason,
      input.reference,
      input.idempotencyKey
    )
  }

  /**
   * Records a product return (RETURN).
   */
  async recordReturn(
    businessId: string,
    productId: string,
    userId: string,
    input: RecordReturnInput
  ): Promise<StockOperationResult> {
    const qtyChange = new Prisma.Decimal(input.quantity)

    return this.executeStockOperation(
      businessId,
      productId,
      userId,
      StockMovementType.RETURN,
      qtyChange,
      input.reason,
      input.reference,
      input.idempotencyKey
    )
  }

  /**
   * Lists inventory items with current balances, low stock status, and product details.
   */
  async listInventory(businessId: string, query: InventoryQueryInput) {
    const { page, limit, search, categoryId, lowStockOnly, sortBy, sortOrder } = query

    const where: Prisma.ProductWhereInput = {
      businessId,
      isActive: true, // Only show active products in current inventory by default
    }

    if (search && search.trim()) {
      const term = search.trim()
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { sku: { contains: term, mode: 'insensitive' } },
        { brand: { contains: term, mode: 'insensitive' } },
        { codes: { some: { code: { contains: term, mode: 'insensitive' } } } },
      ]
    }

    if (categoryId) {
      where.categoryId = categoryId
    }

    // Retrieve products with stock level
    const products = await prisma.product.findMany({
      where,
      include: {
        category: { select: { id: true, name: true } },
        codes: { select: { id: true, code: true, type: true } },
        stockLevel: true,
      },
    })

    // Process balances and compute low-stock flags
    let items = products.map((p) => {
      const qty = p.stockLevel ? Number(p.stockLevel.quantity) : 0
      const threshold = p.minStockThreshold
      const isLowStock = threshold > 0 && qty <= threshold
      const isOutOfStock = qty <= 0

      return {
        product: {
          id: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          unit: p.unit,
          costPrice: p.costPrice,
          sellingPrice: p.sellingPrice,
          minStockThreshold: p.minStockThreshold,
          isActive: p.isActive,
          category: p.category,
          codes: p.codes,
        },
        stockLevel: p.stockLevel
          ? {
              id: p.stockLevel.id,
              quantity: Number(p.stockLevel.quantity),
              reservedQuantity: Number(p.stockLevel.reservedQuantity),
              lastUpdated: p.stockLevel.lastUpdated,
            }
          : {
              id: null,
              quantity: 0,
              reservedQuantity: 0,
              lastUpdated: p.createdAt,
            },
        isLowStock,
        isOutOfStock,
      }
    })

    // Filter low stock if requested
    if (lowStockOnly === 'true') {
      items = items.filter((i) => i.isLowStock || i.isOutOfStock)
    }

    // Sort items
    items.sort((a, b) => {
      let comparison = 0
      if (sortBy === 'name') {
        comparison = a.product.name.localeCompare(b.product.name)
      } else if (sortBy === 'quantity') {
        comparison = a.stockLevel.quantity - b.stockLevel.quantity
      } else if (sortBy === 'minStockThreshold') {
        comparison = a.product.minStockThreshold - b.product.minStockThreshold
      } else if (sortBy === 'lastUpdated') {
        comparison =
          new Date(a.stockLevel.lastUpdated).getTime() -
          new Date(b.stockLevel.lastUpdated).getTime()
      }
      return sortOrder === 'desc' ? -comparison : comparison
    })

    const total = items.length
    const paginatedItems = items.slice((page - 1) * limit, page * limit)

    const totalUnits = items.reduce((sum, i) => sum + i.stockLevel.quantity, 0)
    const lowStockCount = items.filter((i) => i.isLowStock && !i.isOutOfStock).length
    const outOfStockCount = items.filter((i) => i.isOutOfStock).length

    return {
      items: paginatedItems,
      metrics: {
        totalItems: total,
        totalUnits,
        lowStockCount,
        outOfStockCount,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }

  /**
   * Retrieves low stock products specifically for replenishments and alert banners.
   */
  async getLowStockProducts(businessId: string) {
    const products = await prisma.product.findMany({
      where: {
        businessId,
        isActive: true,
      },
      include: {
        category: { select: { id: true, name: true } },
        stockLevel: true,
      },
      orderBy: { name: 'asc' },
    })

    return products
      .map((p) => {
        const qty = p.stockLevel ? Number(p.stockLevel.quantity) : 0
        const threshold = p.minStockThreshold
        return {
          productId: p.id,
          name: p.name,
          sku: p.sku,
          brand: p.brand,
          imageUrl: p.imageUrl,
          unit: p.unit,
          category: p.category?.name || 'Uncategorized',
          currentQuantity: qty,
          minStockThreshold: threshold,
          isOutOfStock: qty <= 0,
          deficit: threshold - qty,
        }
      })
      .filter((p) => p.minStockThreshold > 0 && p.currentQuantity <= p.minStockThreshold)
  }

  /**
   * Returns single product inventory balance and recent movements.
   */
  async getProductInventory(businessId: string, productId: string) {
    const product = await prisma.product.findFirst({
      where: { id: productId, businessId },
      include: {
        category: { select: { id: true, name: true } },
        stockLevel: true,
        stockMovements: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    })

    if (!product) {
      throw new AppError('Product not found or access denied', 404, 'NOT_FOUND')
    }

    const qty = product.stockLevel ? Number(product.stockLevel.quantity) : 0
    const isLowStock = product.minStockThreshold > 0 && qty <= product.minStockThreshold

    return {
      product: {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit,
        minStockThreshold: product.minStockThreshold,
        isActive: product.isActive,
        category: product.category,
      },
      stockLevel: product.stockLevel
        ? {
            quantity: Number(product.stockLevel.quantity),
            reservedQuantity: Number(product.stockLevel.reservedQuantity),
            lastUpdated: product.stockLevel.lastUpdated,
          }
        : {
            quantity: 0,
            reservedQuantity: 0,
            lastUpdated: product.createdAt,
          },
      isLowStock,
      recentMovements: product.stockMovements,
    }
  }

  /**
   * Lists the immutable stock movement audit ledger with filters and pagination.
   */
  async listMovements(businessId: string, query: MovementsQueryInput) {
    const { page, limit, productId, type, startDate, endDate } = query

    const where: Prisma.StockMovementWhereInput = {
      businessId,
    }

    if (productId) {
      where.productId = productId
    }

    if (type) {
      where.type = type
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

    const [total, movements] = await Promise.all([
      prisma.stockMovement.count({ where }),
      prisma.stockMovement.findMany({
        where,
        include: {
          product: {
            select: { id: true, name: true, sku: true, unit: true },
          },
          user: {
            select: { id: true, name: true, email: true },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ])

    return {
      movements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    }
  }
}

export const inventoryService = new InventoryService()
