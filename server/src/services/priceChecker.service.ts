import { prisma } from '../db/prisma.js'
import { AppError } from '../middleware/errorHandler.js'

export interface PriceCheckResult {
  id: string
  name: string
  sku: string
  barcode: string | null
  brand: string | null
  categoryName: string | null
  imageUrl: string | null
  unit: string
  sellingPrice: number
  currency: string
  inStock: boolean
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  businessName: string
}

export class PriceCheckerService {
  /**
   * Safe, sanitized product lookup for customer-facing Price Checker kiosks and POS price checks.
   * Exposes only public retail details (Name, Image, Selling Price, Unit, inStock, stockStatus).
   * Strictly prevents disclosure of cost prices, margins, suppliers, or internal stock ledger counts.
   */
  async checkPrice(businessId: string, rawCode: string): Promise<PriceCheckResult> {
    const cleanCode = rawCode?.trim()
    if (!cleanCode) {
      throw new AppError('Barcode is required to check price', 400, 'BARCODE_REQUIRED')
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, currency: true },
    })

    if (!business) {
      throw new AppError('Store terminal not found', 404, 'STORE_NOT_FOUND')
    }

    // 1. Check ProductCode table (Barcodes / QR codes)
    const codeMatch = await prisma.productCode.findUnique({
      where: {
        businessId_code: {
          businessId,
          code: cleanCode,
        },
      },
      include: {
        product: {
          include: {
            category: { select: { name: true } },
            stockLevel: { select: { quantity: true } },
            codes: { select: { code: true, type: true } },
          },
        },
      },
    })

    let product: any = codeMatch?.product

    // 2. Fallback: match by SKU
    if (!product) {
      product = await prisma.product.findUnique({
        where: {
          businessId_sku: {
            businessId,
            sku: cleanCode,
          },
        },
        include: {
          category: { select: { name: true } },
          stockLevel: { select: { quantity: true } },
          codes: { select: { code: true, type: true } },
        },
      })
    }

    // 3. Fallback: TillPro / SmartStock QR pattern
    if (
      !product &&
      (cleanCode.startsWith('tillpro:product:') || cleanCode.startsWith('smartstock:product:'))
    ) {
      const extractedId = cleanCode
        .replace('tillpro:product:', '')
        .replace('smartstock:product:', '')
        .trim()
      product = await prisma.product.findFirst({
        where: { id: extractedId, businessId },
        include: {
          category: { select: { name: true } },
          stockLevel: { select: { quantity: true } },
          codes: { select: { code: true, type: true } },
        },
      })
    }

    // 4. Fallback: match by product name (case-insensitive substring)
    if (!product && cleanCode.length >= 2) {
      product = await prisma.product.findFirst({
        where: {
          businessId,
          isActive: true,
          name: {
            contains: cleanCode,
            mode: 'insensitive',
          },
        },
        include: {
          category: { select: { name: true } },
          stockLevel: { select: { quantity: true } },
          codes: { select: { code: true, type: true } },
        },
      })
    }

    if (!product || !product.isActive) {
      throw new AppError(
        'Product not found or not currently available for retail sale. Please ask a store assistant for assistance.',
        404,
        'PRODUCT_NOT_FOUND'
      )
    }

    const stockQty = Number(product.stockLevel?.quantity ?? 0)
    const threshold = Number(product.minStockThreshold ?? 5)
    let stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' = 'IN_STOCK'
    if (stockQty <= 0) {
      stockStatus = 'OUT_OF_STOCK'
    } else if (stockQty <= threshold) {
      stockStatus = 'LOW_STOCK'
    }

    const primaryBarcode =
      codeMatch?.code ||
      product.codes?.[0]?.code ||
      null

    // Return strictly public customer-facing information
    return {
      id: product.id,
      name: product.name,
      sku: product.sku,
      barcode: primaryBarcode,
      brand: product.brand || null,
      categoryName: product.category?.name || null,
      imageUrl: product.imageUrl || null,
      unit: product.unit || 'item',
      sellingPrice: Number(product.sellingPrice),
      currency: business.currency || 'KES',
      inStock: stockQty > 0,
      stockStatus,
      businessName: business.name,
    }
  }

  /**
   * Resolves basic public kiosk info about a business so the Price Checker displays the store name.
   */
  async getKioskStoreInfo(businessId: string): Promise<{ id: string; name: string; currency: string }> {
    const business = await prisma.business.findUnique({
      where: { id: businessId },
      select: { id: true, name: true, currency: true },
    })

    if (!business) {
      throw new AppError('Store not found', 404, 'STORE_NOT_FOUND')
    }

    return business
  }
}

export const priceCheckerService = new PriceCheckerService()
